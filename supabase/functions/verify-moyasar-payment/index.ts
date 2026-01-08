import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPaymentRequest {
  paymentId: string;
  bookingId: string;
}

// Helper function to log payment events
async function logPaymentEvent(
  supabase: any,
  bookingId: string,
  eventType: string,
  data: {
    paymentId?: string;
    paymentMethod?: string;
    amount?: number;
    statusBefore?: string;
    statusAfter?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from("payment_logs").insert([{
      booking_id: bookingId,
      event_type: eventType,
      payment_id: data.paymentId || null,
      payment_method: data.paymentMethod || null,
      amount: data.amount || null,
      status_before: data.statusBefore || null,
      status_after: data.statusAfter || null,
      error_message: data.errorMessage || null,
      metadata: data.metadata || null,
    }]);
  } catch (err) {
    console.error("Failed to log payment event:", err);
  }
}

serve(async (req) => {
  console.log("verify-moyasar-payment function called");
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const moyasarSecretKey = Deno.env.get("MOYASAR_SECRET_KEY");

    if (!moyasarSecretKey) {
      console.error("MOYASAR_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Payment verification not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: VerifyPaymentRequest = await req.json();

    console.log("Verifying payment:", body.paymentId, "for booking:", body.bookingId);

    if (!body.paymentId || !body.bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing paymentId or bookingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch booking to verify amount
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", body.bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already paid
    if (booking.payment_status === "completed") {
      console.log("Booking already paid");
      return new Response(
        JSON.stringify({ 
          success: true, 
          alreadyPaid: true,
          bookingId: booking.id,
          bookingReference: booking.booking_reference
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log payment attempt
    await logPaymentEvent(supabase, body.bookingId, "attempt", {
      paymentId: body.paymentId,
      amount: booking.total_amount,
      statusBefore: booking.payment_status,
    });

    // Fetch payment from Moyasar API
    const moyasarResponse = await fetch(`https://api.moyasar.com/v1/payments/${body.paymentId}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${btoa(moyasarSecretKey + ":")}`,
        "Content-Type": "application/json",
      },
    });

    if (!moyasarResponse.ok) {
      const errorText = await moyasarResponse.text();
      console.error("Moyasar API error:", moyasarResponse.status, errorText);
      
      // Log failure
      await logPaymentEvent(supabase, body.bookingId, "failure", {
        paymentId: body.paymentId,
        statusBefore: booking.payment_status,
        errorMessage: `Moyasar API error: ${moyasarResponse.status}`,
        metadata: { apiError: errorText },
      });

      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify payment with Moyasar" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payment = await moyasarResponse.json();
    console.log("Moyasar payment status:", payment.status, "amount:", payment.amount);

    // Verify payment status is "paid"
    if (payment.status !== "paid") {
      console.log("Payment not completed, status:", payment.status);
      
      // Log failure
      await logPaymentEvent(supabase, body.bookingId, "failure", {
        paymentId: body.paymentId,
        paymentMethod: payment.source?.type,
        amount: payment.amount / 100, // Convert from halalas
        statusBefore: booking.payment_status,
        errorMessage: `Payment status: ${payment.status}`,
        metadata: { moyasarStatus: payment.status },
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Payment status: ${payment.status}`,
          paymentStatus: payment.status
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify amount matches (Moyasar amount is in halalas, booking is in SAR)
    const expectedAmountHalalas = Math.round(booking.total_amount * 100);
    if (payment.amount !== expectedAmountHalalas) {
      console.error(`Amount mismatch: expected ${expectedAmountHalalas}, got ${payment.amount}`);
      
      // Log failure
      await logPaymentEvent(supabase, body.bookingId, "failure", {
        paymentId: body.paymentId,
        paymentMethod: payment.source?.type,
        amount: payment.amount / 100,
        statusBefore: booking.payment_status,
        errorMessage: `Amount mismatch: expected ${booking.total_amount} SAR, got ${payment.amount / 100} SAR`,
        metadata: { expectedAmount: booking.total_amount, receivedAmount: payment.amount / 100 },
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Payment amount does not match booking total",
          expected: expectedAmountHalalas,
          received: payment.amount
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine payment method
    const paymentMethod = payment.source?.type || "card";

    // Update booking as paid
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_status: "completed",
        payment_id: body.paymentId,
        payment_method: paymentMethod,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.bookingId);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
      
      // Log failure
      await logPaymentEvent(supabase, body.bookingId, "failure", {
        paymentId: body.paymentId,
        paymentMethod,
        amount: booking.total_amount,
        statusBefore: booking.payment_status,
        errorMessage: `Database update failed: ${updateError.message}`,
      });

      return new Response(
        JSON.stringify({ success: false, error: "Failed to update booking status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Booking updated to paid status");

    // Log success
    await logPaymentEvent(supabase, body.bookingId, "success", {
      paymentId: body.paymentId,
      paymentMethod,
      amount: booking.total_amount,
      statusBefore: booking.payment_status,
      statusAfter: "completed",
      metadata: {
        moyasarId: payment.id,
        cardBrand: payment.source?.company,
        cardLast4: payment.source?.number?.slice(-4),
      },
    });

    // STEP 1: Generate tickets AFTER payment is confirmed
    console.log("Payment confirmed, generating tickets...");
    try {
      const { data: ticketData, error: ticketError } = await supabase.functions.invoke("generate-tickets", {
        body: { bookingId: body.bookingId },
      });

      if (ticketError) {
        console.error("Error generating tickets:", ticketError);
        // Log but don't fail - tickets can be regenerated
      } else {
        console.log("Tickets generated successfully:", ticketData);
      }
    } catch (ticketErr) {
      console.error("Error invoking generate-tickets function:", ticketErr);
      // Don't fail the whole request if ticket generation fails
    }

    // STEP 2: Send confirmation email with tickets
    console.log("Sending confirmation email...");
    try {
      const { error: emailError } = await supabase.functions.invoke("send-booking-confirmation", {
        body: { bookingId: body.bookingId },
      });

      if (emailError) {
        console.error("Error sending confirmation email:", emailError);
      } else {
        console.log("Confirmation email sent successfully");
        
        // Update email sent status
        await supabase
          .from("bookings")
          .update({ 
            confirmation_email_sent: true,
            last_email_sent_at: new Date().toISOString()
          })
          .eq("id", body.bookingId);
      }
    } catch (emailErr) {
      console.error("Error invoking email function:", emailErr);
      // Don't fail the whole request if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        paymentMethod,
        amountPaid: booking.total_amount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in verify-moyasar-payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
