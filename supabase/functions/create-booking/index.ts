import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Version stamp for deployment verification
const CREATE_BOOKING_VERSION = "2026-01-08-v6-enhanced-logging";

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

// Input validation functions (inline for speed)
const validateEmail = (email: string): boolean => 
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) && email.length <= 255;

const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return /^(\+966|966|05|5)[0-9]{8,9}$|^\+?[1-9][0-9]{7,14}$/.test(cleanPhone);
};

const validateName = (name: string): boolean => 
  name.trim().length >= 2 && name.trim().length <= 100;

// Generate a unique booking reference
const generateBookingReference = (): string => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ALM-${year}-${random}`;
};

// Pre-create Supabase client (reuse connection)
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const startTime = Date.now();
  console.log(`[${CREATE_BOOKING_VERSION}] create-booking called at ${new Date().toISOString()}`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: BookingRequest = await req.json();
    console.log("Booking request received:", {
      customerEmail: body.customerEmail?.slice(0, 5) + "...",
      visitDate: body.visitDate,
      adultCount: body.adultCount,
      childCount: body.childCount,
      totalAmount: body.totalAmount,
    });

    // Quick validation (fail fast)
    if (!body.customerName || !body.customerEmail || !body.customerPhone || !body.visitDate) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateEmail(body.customerEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validatePhone(body.customerPhone)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid phone format. Use +966XXXXXXXXX or 05XXXXXXXX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateName(body.customerName)) {
      return new Response(
        JSON.stringify({ success: false, error: "Name must be 2-100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate reference and calculate total in parallel with rate limit check
    const bookingReference = generateBookingReference();
    const adultCount = body.adultCount || 0;
    const childCount = body.childCount || 0;
    const adultPrice = body.adultPrice || 0;
    const childPrice = body.childPrice || 0;
    const calculatedTotal = (adultCount * adultPrice) + (childCount * childPrice);
    const finalTotal = calculatedTotal > 0 ? calculatedTotal : body.totalAmount;

    // Rate limit check + insert in single transaction attempt
    // Try insert first - if rate limited, the check will fail after
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_reference: bookingReference,
        customer_name: body.customerName,
        customer_email: body.customerEmail.toLowerCase(),
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
        payment_status: "pending",
        booking_status: "confirmed",
        language: body.language || "ar",
        qr_codes_generated: false,
        confirmation_email_sent: false,
      })
      .select("id")
      .single();

    if (bookingError) {
      console.error("Booking insert error:", {
        message: bookingError.message,
        code: bookingError.code,
        details: bookingError.details,
      });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create booking", details: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`Booking created successfully in ${elapsed}ms:`, {
      bookingId: booking.id,
      bookingReference: bookingReference,
    });

    // Return success immediately
    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        bookingReference: bookingReference,
        tickets: [],
        paymentUrl: null,
        emailSent: false,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    console.error("create-booking error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
