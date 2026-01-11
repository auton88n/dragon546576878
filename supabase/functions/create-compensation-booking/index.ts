import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify staff authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is staff (admin or manager can issue compensation)
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isManager } = await supabase.rpc("has_role", { _user_id: user.id, _role: "manager" });
    
    if (!isAdmin && !isManager) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin or Manager access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      customerEmail,
      customerName,
      customerPhone,
      adultCount,
      childCount,
      visitDate,
      visitTime,
      reason,
      submissionId,
    } = await req.json();

    // Validate required fields
    if (!customerEmail || !customerName || !visitDate || !adultCount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate booking reference
    const bookingReference = `COMP-${Date.now().toString(36).toUpperCase()}`;

    // Create the compensation booking with zero amount
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_reference: bookingReference,
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone || "",
        visit_date: visitDate,
        visit_time: visitTime || "10:00",
        adult_count: adultCount,
        child_count: childCount || 0,
        adult_price: 0,
        child_price: 0,
        total_amount: 0,
        currency: "SAR",
        payment_status: "completed",
        booking_status: "confirmed",
        payment_method: "compensation",
        special_requests: `COMPENSATION: ${reason || "Customer compensation"}`,
        language: "en",
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    console.log("Compensation booking created:", booking.id, "by user:", user.email);

    // Log the compensation in payment_logs for audit trail
    await supabase.from("payment_logs").insert({
      booking_id: booking.id,
      event_type: "compensation_issued",
      payment_method: "compensation",
      amount: 0,
      status_before: null,
      status_after: "completed",
      changed_by: user.id,
      metadata: {
        reason,
        submission_id: submissionId,
        issued_at: new Date().toISOString(),
        issued_by: user.email,
      },
    });

    // Generate tickets
    const ticketsResponse = await fetch(
      `${supabaseUrl}/functions/v1/generate-tickets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ bookingId: booking.id }),
      }
    );

    if (!ticketsResponse.ok) {
      console.error("Failed to generate tickets:", await ticketsResponse.text());
      // Continue anyway - booking is created
    } else {
      console.log("Tickets generated for compensation booking");
    }

    // Send confirmation email with tickets
    const emailResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-booking-confirmation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ bookingId: booking.id }),
      }
    );

    if (!emailResponse.ok) {
      console.error("Failed to send confirmation email:", await emailResponse.text());
    } else {
      console.log("Confirmation email sent for compensation booking");
    }

    // Update the contact submission as resolved if submissionId provided
    if (submissionId) {
      await supabase
        .from("contact_submissions")
        .update({
          status: "resolved",
          admin_notes: `Compensation tickets issued: ${bookingReference} by ${user.email}`,
        })
        .eq("id", submissionId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        bookingReference,
        bookingId: booking.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Compensation booking error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
