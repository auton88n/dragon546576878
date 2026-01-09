import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LinkRequest {
  bookingId: string;
  paymentId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const moyasarSecretKey = Deno.env.get("MOYASAR_SECRET_KEY2");

    if (!moyasarSecretKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("has_role", { 
      _user_id: user.id, 
      _role: "admin" 
    });
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: LinkRequest = await req.json();
    console.log("Link request:", body);

    if (!body.bookingId || !body.paymentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing bookingId or paymentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", body.bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if booking already has a payment
    if (booking.payment_status === "completed" && booking.payment_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking already has a payment linked" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verify payment with Moyasar
    const moyasarUrl = `https://api.moyasar.com/v1/payments/${body.paymentId}`;
    const authHeaderValue = `Basic ${btoa(moyasarSecretKey + ":")}`;
    
    const moyasarResponse = await fetch(moyasarUrl, {
      method: "GET",
      headers: {
        "Authorization": authHeaderValue,
        "Content-Type": "application/json",
      },
    });

    if (!moyasarResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "Payment not found in Moyasar" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payment = await moyasarResponse.json();
    console.log("Moyasar payment:", payment.id, payment.status, payment.amount);

    // 3. Verify payment is paid
    if (payment.status !== "paid") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Payment status is "${payment.status}", not "paid"` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Verify amount matches
    const expectedAmountHalalas = Math.round(booking.total_amount * 100);
    if (payment.amount !== expectedAmountHalalas) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Amount mismatch: booking is ${booking.total_amount} SAR, payment is ${payment.amount / 100} SAR`,
          bookingAmount: booking.total_amount,
          paymentAmount: payment.amount / 100,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Check if this payment is already linked to another booking
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id, booking_reference")
      .eq("payment_id", body.paymentId)
      .neq("id", body.bookingId)
      .single();

    if (existingBooking) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Payment already linked to booking ${existingBooking.booking_reference}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Update booking with payment info
    const paymentMethod = payment.source?.type || "card";
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
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Log the manual link event
    await supabase.from("payment_logs").insert([{
      booking_id: body.bookingId,
      event_type: "manual_link",
      payment_id: body.paymentId,
      payment_method: paymentMethod,
      amount: booking.total_amount,
      status_before: booking.payment_status,
      status_after: "completed",
      changed_by: user.id,
      metadata: {
        moyasarId: payment.id,
        linkedBy: user.email,
        cardBrand: payment.source?.company,
        cardLast4: payment.source?.number?.slice(-4),
      },
    }]);

    // 8. Generate tickets
    console.log("Generating tickets for booking...");
    try {
      const { error: ticketError } = await supabase.functions.invoke("generate-tickets", {
        body: { bookingId: body.bookingId },
      });
      if (ticketError) {
        console.error("Error generating tickets:", ticketError);
      } else {
        console.log("Tickets generated successfully");
      }
    } catch (err) {
      console.error("Error invoking generate-tickets:", err);
    }

    // 9. Send confirmation email
    console.log("Sending confirmation email...");
    try {
      const { error: emailError } = await supabase.functions.invoke("send-booking-confirmation", {
        body: { bookingId: body.bookingId },
      });
      if (emailError) {
        console.error("Error sending email:", emailError);
      } else {
        console.log("Confirmation email sent");
        await supabase
          .from("bookings")
          .update({ 
            confirmation_email_sent: true,
            last_email_sent_at: new Date().toISOString()
          })
          .eq("id", body.bookingId);
      }
    } catch (err) {
      console.error("Error invoking send-booking-confirmation:", err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment linked successfully",
        bookingReference: booking.booking_reference,
        paymentId: body.paymentId,
        amount: booking.total_amount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in link-orphan-payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
