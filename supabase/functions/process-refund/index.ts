import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundRequest {
  bookingId: string;
  amount?: number; // Amount in SAR (optional - full refund if not provided)
  reason?: string;
  sendEmail?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user is authenticated and is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retry auth check up to 2 times for transient network errors
    let user = null;
    let authError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await supabaseClient.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (!result.error) {
        user = result.data.user;
        break;
      }
      authError = result.error;
      console.log(`Auth attempt ${attempt + 1} failed:`, result.error.message);
      if (attempt < 1) await new Promise(r => setTimeout(r, 500)); // Wait before retry
    }

    if (authError || !user) {
      console.error("Auth failed after retries:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin (only admins can process refunds)
    const { data: isAdmin } = await supabaseClient.rpc("has_role", { 
      _user_id: user.id, 
      _role: "admin" 
    });
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { bookingId, amount, reason, sendEmail = true }: RefundRequest = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Booking ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!booking.payment_id) {
      return new Response(
        JSON.stringify({ error: "No payment ID found for this booking" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate refund amount (convert SAR to halalas)
    const refundAmountHalalas = amount 
      ? Math.round(amount * 100) 
      : Math.round(Number(booking.total_amount) * 100);

    // Call Moyasar Refund API
    const moyasarSecretKey = Deno.env.get("MOYASAR_SECRET_KEY2");
    if (!moyasarSecretKey) {
      return new Response(
        JSON.stringify({ error: "Moyasar API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing refund for payment ${booking.payment_id}, amount: ${refundAmountHalalas} halalas`);

    const moyasarResponse = await fetch(`https://api.moyasar.com/v1/payments/${booking.payment_id}/refund`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(moyasarSecretKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: refundAmountHalalas,
      }),
    });

    const moyasarData = await moyasarResponse.json();

    if (!moyasarResponse.ok) {
      console.error("Moyasar refund error:", moyasarData);
      
      // Log the failed refund attempt
      await supabaseClient.from("payment_logs").insert({
        booking_id: bookingId,
        event_type: "refund",
        payment_id: booking.payment_id,
        amount: amount || Number(booking.total_amount),
        status_before: booking.payment_status,
        status_after: booking.payment_status,
        error_message: moyasarData.message || moyasarData.errors?.base?.[0] || "Refund failed",
        changed_by: user.id,
        metadata: { reason, moyasar_response: moyasarData },
      });

      return new Response(
        JSON.stringify({ 
          error: "Refund failed", 
          details: moyasarData.message || moyasarData.errors?.base?.[0] || "Unknown error"
        }),
        { status: moyasarResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update booking status
    const isFullRefund = !amount || amount >= Number(booking.total_amount);
    const { error: updateError } = await supabaseClient
      .from("bookings")
      .update({ 
        payment_status: isFullRefund ? "refunded" : "partially_refunded",
        booking_status: isFullRefund ? "cancelled" : booking.booking_status,
        cancelled_at: isFullRefund ? new Date().toISOString() : booking.cancelled_at,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Error updating booking:", updateError);
    }

    // Log the successful refund
    await supabaseClient.from("payment_logs").insert({
      booking_id: bookingId,
      event_type: "refund",
      payment_id: booking.payment_id,
      amount: amount || Number(booking.total_amount),
      status_before: booking.payment_status,
      status_after: isFullRefund ? "refunded" : "partially_refunded",
      changed_by: user.id,
      metadata: { 
        reason, 
        moyasar_refund_id: moyasarData.id,
        refund_amount_halalas: refundAmountHalalas,
        is_full_refund: isFullRefund,
      },
    });

    // Send refund notification email
    if (sendEmail) {
      try {
        await supabaseClient.functions.invoke("send-refund-notification", {
          body: {
            bookingId,
            refundAmount: amount || Number(booking.total_amount),
            reason,
          },
        });
      } catch (emailError) {
        console.error("Error sending refund email:", emailError);
        // Don't fail the refund if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund: {
          id: moyasarData.id,
          amount: refundAmountHalalas / 100, // Convert back to SAR
          status: moyasarData.status,
          is_full_refund: isFullRefund,
        },
        message: isFullRefund ? "Full refund processed successfully" : "Partial refund processed successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error processing refund:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
