import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId, invoiceId } = await req.json();

    if (!paymentId || !invoiceId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing paymentId or invoiceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const moyasarSecretKey = Deno.env.get("MOYASAR_SECRET_KEY2")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("custom_invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ success: false, error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already paid
    if (invoice.status === "paid") {
      return new Response(
        JSON.stringify({ success: true, message: "Invoice already paid" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment with Moyasar
    const moyasarResponse = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Basic ${btoa(moyasarSecretKey + ":")}`,
      },
    });

    if (!moyasarResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify payment with Moyasar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payment = await moyasarResponse.json();

    // Check payment status
    if (payment.status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, error: `Payment status: ${payment.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify amount (convert from halalas)
    const expectedAmount = Math.round(invoice.total_amount * 100);
    if (payment.amount !== expectedAmount) {
      return new Response(
        JSON.stringify({ success: false, error: "Amount mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate booking reference
    const bookingReference = `INV-${Date.now().toString(36).toUpperCase()}`;

    // Create booking from invoice with proper language
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_reference: bookingReference,
        customer_name: invoice.company_name || invoice.client_name,
        customer_email: invoice.client_email,
        customer_phone: invoice.client_phone,
        visit_date: invoice.visit_date,
        visit_time: invoice.visit_time,
        adult_count: invoice.num_adults,
        child_count: invoice.num_children,
        adult_price: invoice.total_amount / (invoice.num_adults + invoice.num_children),
        child_price: 0,
        total_amount: invoice.total_amount,
        payment_status: "completed",
        booking_status: "confirmed",
        payment_id: paymentId,
        payment_method: payment.source?.type || "creditcard",
        paid_at: new Date().toISOString(),
        special_requests: invoice.services ? `Services: ${invoice.services.join(", ")}` : null,
        language: invoice.language || 'ar', // Use invoice language or default to Arabic
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update invoice status
    await supabase
      .from("custom_invoices")
      .update({
        status: "paid",
        payment_id: paymentId,
        paid_at: new Date().toISOString(),
        booking_id: booking.id,
      })
      .eq("id", invoiceId);

    // Generate tickets - MUST succeed before sending confirmation email
    let ticketsGenerated = false;
    try {
      const { data: ticketResult, error: ticketError } = await supabase.functions.invoke("generate-tickets", {
        body: { bookingId: booking.id },
      });
      
      if (ticketError) {
        console.error("Error generating tickets:", ticketError);
      } else {
        ticketsGenerated = true;
        console.log("Tickets generated successfully for invoice booking:", booking.id);
      }
    } catch (ticketError) {
      console.error("Exception generating tickets:", ticketError);
    }

    // Only send confirmation email if tickets were generated successfully
    if (ticketsGenerated) {
      try {
        await supabase.functions.invoke("send-booking-confirmation", {
          body: { bookingId: booking.id },
        });
        console.log("Confirmation email with QR sent for invoice booking:", booking.id);
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
      }
    } else {
      console.error("Tickets not generated - skipping confirmation email to avoid sending without QR code");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        bookingId: booking.id,
        bookingReference: booking.booking_reference 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in verify-invoice-payment:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
