import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  paymentId: string;
  bookingId?: string;
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

    // Verify user is authenticated and is staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is staff
    const { data: isStaff } = await supabaseClient.rpc("is_staff", { _user_id: user.id });
    if (!isStaff) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Staff only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { paymentId, bookingId }: VerifyRequest = await req.json();

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "Payment ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Moyasar API to get payment status
    const moyasarSecretKey = Deno.env.get("MOYASAR_SECRET_KEY2");
    if (!moyasarSecretKey) {
      return new Response(
        JSON.stringify({ error: "Moyasar API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const moyasarResponse = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Basic ${btoa(moyasarSecretKey + ":")}`,
        "Content-Type": "application/json",
      },
    });

    if (!moyasarResponse.ok) {
      const errorText = await moyasarResponse.text();
      console.error("Moyasar API error:", errorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch from Moyasar", 
          details: moyasarResponse.status === 404 ? "Payment not found in Moyasar" : errorText 
        }),
        { status: moyasarResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const moyasarData = await moyasarResponse.json();

    // Get our database record for comparison if bookingId provided
    let dbBooking = null;
    if (bookingId) {
      const { data } = await supabaseClient
        .from("bookings")
        .select("payment_status, payment_id, total_amount, paid_at")
        .eq("id", bookingId)
        .single();
      dbBooking = data;
    }

    // Format response with comparison
    const response = {
      moyasar: {
        id: moyasarData.id,
        status: moyasarData.status,
        amount: moyasarData.amount, // in halalas
        amount_format: moyasarData.amount_format,
        fee: moyasarData.fee,
        fee_format: moyasarData.fee_format,
        currency: moyasarData.currency,
        refunded: moyasarData.refunded,
        refunded_format: moyasarData.refunded_format,
        captured: moyasarData.captured,
        created_at: moyasarData.created_at,
        updated_at: moyasarData.updated_at,
        source: moyasarData.source ? {
          type: moyasarData.source.type,
          company: moyasarData.source.company,
          name: moyasarData.source.name,
          number: moyasarData.source.number,
          message: moyasarData.source.message,
        } : null,
        metadata: moyasarData.metadata,
      },
      database: dbBooking ? {
        payment_status: dbBooking.payment_status,
        payment_id: dbBooking.payment_id,
        total_amount: dbBooking.total_amount,
        paid_at: dbBooking.paid_at,
      } : null,
      comparison: dbBooking ? {
        status_match: (moyasarData.status === "paid" && dbBooking.payment_status === "completed") ||
                      (moyasarData.status !== "paid" && dbBooking.payment_status !== "completed"),
        amount_match: moyasarData.amount === Math.round(Number(dbBooking.total_amount) * 100),
        discrepancy: moyasarData.status === "paid" && dbBooking.payment_status !== "completed"
          ? "PAID_IN_MOYASAR_BUT_NOT_IN_DB"
          : moyasarData.status !== "paid" && dbBooking.payment_status === "completed"
          ? "COMPLETED_IN_DB_BUT_NOT_IN_MOYASAR"
          : null,
      } : null,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error verifying Moyasar status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
