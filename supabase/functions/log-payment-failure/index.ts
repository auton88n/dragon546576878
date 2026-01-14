import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentFailurePayload {
  bookingId: string;
  errorType?: string;
  errorCode?: string;
  errorMessage?: string;
  paymentId?: string;
  paymentMethod?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: PaymentFailurePayload = await req.json();
    
    console.log("Logging payment failure:", {
      bookingId: body.bookingId,
      errorType: body.errorType,
      errorCode: body.errorCode,
    });

    if (!body.bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine event type - stalled payments use 'payment_stalled', definitive failures use 'failure'
    const isStalled = body.errorType === 'client_timeout';
    const eventType = isStalled ? 'payment_stalled' : 'failure';

    // Log the event to payment_logs
    const { error: logError } = await supabase
      .from("payment_logs")
      .insert({
        booking_id: body.bookingId,
        event_type: eventType,
        payment_id: body.paymentId || null,
        payment_method: body.paymentMethod || null,
        amount: body.amount || null,
        error_message: body.errorMessage 
          ? `${body.errorType || 'Error'}: ${body.errorMessage}${body.errorCode ? ` (${body.errorCode})` : ''}`
          : body.errorType || 'Unknown error',
        metadata: {
          error_type: body.errorType,
          error_code: body.errorCode,
          user_agent: req.headers.get("user-agent"),
          timestamp: new Date().toISOString(),
          requires_admin_review: isStalled,
          ...body.metadata,
        },
      });

    if (logError) {
      console.error("Error logging payment event:", logError);
      return new Response(
        JSON.stringify({ success: false, error: logError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only cancel booking for definitive failures, NOT for stalled/timeout payments
    // Stalled payments may still complete via 3DS or delayed processing
    if (!isStalled) {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ 
          payment_status: "failed",
          booking_status: "cancelled",
          cancelled_at: new Date().toISOString()
        })
        .eq("id", body.bookingId)
        .eq("payment_status", "pending");

      if (updateError) {
        console.warn("Could not update booking status:", updateError);
      }
    }

    console.log("Payment failure logged successfully for booking:", body.bookingId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
