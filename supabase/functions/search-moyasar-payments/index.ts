import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  email?: string;
  amount?: number; // in SAR
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
  bookingReference?: string;
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

    if (!moyasarSecretKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Moyasar not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
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

    // Check if user is staff
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: user.id });
    if (!isStaff) {
      return new Response(
        JSON.stringify({ success: false, error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SearchRequest = await req.json();
    console.log("Search request:", body);

    // Build Moyasar search query
    // Moyasar API: GET /v1/payments?page=1&per_page=25
    // Filters: created (timestamp range), status, metadata
    const params = new URLSearchParams();
    params.append("per_page", "50");
    
    // Moyasar API uses created_after and created_before in Unix timestamp (seconds)
    if (body.dateFrom) {
      const fromDate = new Date(body.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      params.append("created[gte]", Math.floor(fromDate.getTime() / 1000).toString());
    }
    
    if (body.dateTo) {
      const toDate = new Date(body.dateTo);
      toDate.setHours(23, 59, 59, 999);
      params.append("created[lte]", Math.floor(toDate.getTime() / 1000).toString());
    }

    const moyasarUrl = `https://api.moyasar.com/v1/payments?${params.toString()}`;
    console.log("Calling Moyasar API:", moyasarUrl);

    const authHeaderValue = `Basic ${btoa(moyasarSecretKey + ":")}`;
    const moyasarResponse = await fetch(moyasarUrl, {
      method: "GET",
      headers: {
        "Authorization": authHeaderValue,
        "Content-Type": "application/json",
      },
    });

    if (!moyasarResponse.ok) {
      const errorText = await moyasarResponse.text();
      console.error("Moyasar API error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch from Moyasar" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const moyasarData = await moyasarResponse.json();
    console.log("Moyasar returned", moyasarData.length || moyasarData.payments?.length, "payments");

    // Filter payments client-side based on criteria
    let payments = moyasarData.payments || moyasarData || [];
    
    // Filter by email (check metadata and description)
    if (body.email) {
      const emailLower = body.email.toLowerCase();
      payments = payments.filter((p: any) => {
        const descMatch = p.description?.toLowerCase().includes(emailLower);
        const metaEmail = p.metadata?.customer_email?.toLowerCase();
        return descMatch || metaEmail === emailLower;
      });
    }

    // Filter by amount (in SAR, Moyasar stores in halalas)
    if (body.amount) {
      const amountHalalas = Math.round(body.amount * 100);
      payments = payments.filter((p: any) => p.amount === amountHalalas);
    }

    // Filter by booking reference in description
    if (body.bookingReference) {
      const refLower = body.bookingReference.toLowerCase();
      payments = payments.filter((p: any) => 
        p.description?.toLowerCase().includes(refLower)
      );
    }

    // Get booking IDs that already have these payment IDs linked
    const paymentIds = payments.map((p: any) => p.id);
    const { data: linkedBookings } = await supabase
      .from("bookings")
      .select("payment_id, booking_reference")
      .in("payment_id", paymentIds);

    const linkedPaymentIds = new Set((linkedBookings || []).map((b: any) => b.payment_id));

    // Format response with link status
    const formattedPayments = payments.map((p: any) => ({
      id: p.id,
      status: p.status,
      amount: p.amount / 100, // Convert to SAR
      amountFormat: p.amount_format,
      currency: p.currency,
      description: p.description,
      createdAt: p.created_at,
      source: p.source ? {
        type: p.source.type,
        company: p.source.company,
        name: p.source.name,
        number: p.source.number,
      } : null,
      metadata: p.metadata,
      isLinked: linkedPaymentIds.has(p.id),
      linkedBookingRef: linkedBookings?.find((b: any) => b.payment_id === p.id)?.booking_reference || null,
      refunded: p.refunded ? p.refunded / 100 : 0,
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        payments: formattedPayments,
        total: formattedPayments.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in search-moyasar-payments:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
