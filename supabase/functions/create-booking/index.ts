import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Version stamp for deployment verification
const CREATE_BOOKING_VERSION = "2026-01-07-v4-no-tickets";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingRequest {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialRequests?: string;
  visitDate: string;
  visitTime: string;
  adultCount: number;
  childCount: number;
  adultPrice: number;
  childPrice: number;
  totalAmount: number;
  language: string;
}

// Input validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validatePhone = (phone: string): boolean => {
  // Saudi phone format: +966XXXXXXXXX or 05XXXXXXXX or international
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^(\+966|966|05|5)[0-9]{8,9}$|^\+?[1-9][0-9]{7,14}$/;
  return phoneRegex.test(cleanPhone);
};

const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

// Generate a unique booking reference
const generateBookingReference = (): string => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ALM-${year}-${random}`;
};

serve(async (req) => {
  console.log("create-booking version:", CREATE_BOOKING_VERSION);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create service role client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: BookingRequest = await req.json();
    console.log("Received booking request:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.customerName || !body.customerEmail || !body.customerPhone || !body.visitDate) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation
    if (!validateEmail(body.customerEmail)) {
      console.log("Invalid email:", body.customerEmail);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validatePhone(body.customerPhone)) {
      console.log("Invalid phone:", body.customerPhone);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid phone format. Use +966XXXXXXXXX or 05XXXXXXXX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateName(body.customerName)) {
      console.log("Invalid name:", body.customerName);
      return new Response(
        JSON.stringify({ success: false, error: "Name must be 2-100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: check for recent bookings from same email (5 per hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("customer_email", body.customerEmail.toLowerCase())
      .gte("created_at", oneHourAgo);

    if (recentBookings && recentBookings >= 5) {
      console.log("Rate limit exceeded for:", body.customerEmail);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many booking attempts. Please try again in 1 hour." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate booking reference
    const bookingReference = generateBookingReference();
    console.log("Generated booking reference:", bookingReference);

    // Calculate total server-side (don't trust client value if 0)
    const adultCount = body.adultCount || 0;
    const childCount = body.childCount || 0;
    const adultPrice = body.adultPrice || 0;
    const childPrice = body.childPrice || 0;
    const calculatedTotal = (adultCount * adultPrice) + (childCount * childPrice);
    const finalTotal = calculatedTotal > 0 ? calculatedTotal : body.totalAmount;
    console.log(`Calculated total: ${adultCount} x ${adultPrice} + ${childCount} x ${childPrice} = ${calculatedTotal}, using: ${finalTotal}`);

    // Booking status values allowed by DB constraint: confirmed, cancelled, completed, no_show
    const bookingStatus = "confirmed";
    const paymentStatus = "pending";
    console.log("Inserting booking with status:", bookingStatus, "payment_status:", paymentStatus);

    // Create booking ONLY - NO TICKETS until payment is confirmed
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_reference: bookingReference,
        customer_name: body.customerName,
        customer_email: body.customerEmail,
        customer_phone: body.customerPhone,
        special_requests: body.specialRequests || null,
        visit_date: body.visitDate,
        visit_time: body.visitTime || "15:00",
        adult_count: adultCount,
        child_count: childCount,
        senior_count: 0,
        adult_price: adultPrice,
        child_price: childPrice,
        senior_price: 0,
        total_amount: finalTotal,
        payment_status: paymentStatus,
        booking_status: bookingStatus,
        language: body.language || "ar",
        qr_codes_generated: false,
        confirmation_email_sent: false,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create booking", details: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Booking created:", booking.id);
    console.log("NO TICKETS GENERATED - Tickets will be created after payment verification");

    // Return success response - NO tickets returned since they don't exist yet
    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        bookingReference: bookingReference,
        tickets: [], // Empty - tickets created after payment
        paymentUrl: null,
        emailSent: false, // Email will be sent after payment completion
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    console.error("Error in create-booking function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
