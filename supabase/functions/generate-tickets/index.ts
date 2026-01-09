import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

// Version stamp for deployment verification
const GENERATE_TICKETS_VERSION = "2026-01-09-v2-group-qr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateTicketsRequest {
  bookingId: string;
}

interface GeneratedTicket {
  id: string;
  ticketCode: string;
  ticketType: string;
  qrCodeUrl: string;
  adultCount?: number;
  childCount?: number;
  totalGuests?: number;
}

// Generate a unique group ticket code
const generateGroupTicketCode = (bookingRef: string): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GRP-${bookingRef}-${timestamp}${random}`;
};

// Generate QR code data for GROUP ticket with guest counts
const generateGroupQRData = (
  ticketCode: string, 
  bookingRef: string, 
  visitDate: string,
  visitTime: string,
  adultCount: number,
  childCount: number
): string => {
  const totalGuests = adultCount + childCount;
  
  const data = {
    type: "group", // Indicates this is a group ticket (new format)
    code: ticketCode,
    ref: bookingRef,
    date: visitDate,
    time: visitTime,
    adults: adultCount,
    children: childCount,
    total: totalGuests,
    ts: Date.now(),
  };
  
  // Generate checksum for validation
  const checksum = btoa(JSON.stringify(data)).slice(-8);
  
  return JSON.stringify({
    ...data,
    cs: checksum,
  });
};

// Generate QR code image as base64 using Deno-native library
// Larger size for group QR (800px for better scanning)
const generateQRCodeImage = async (data: string): Promise<{ base64: string; format: string }> => {
  const qrResult = await qrcode(data, { size: 800, errorCorrectLevel: "H" });
  const qrDataUrl = qrResult.toString();
  return { base64: qrDataUrl, format: "gif" };
};

// Convert data URL to Uint8Array for upload
const dataURLtoUint8Array = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(",")[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

serve(async (req) => {
  console.log("generate-tickets version:", GENERATE_TICKETS_VERSION);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: GenerateTicketsRequest = await req.json();

    console.log("Generating GROUP ticket for booking:", body.bookingId);

    if (!body.bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing bookingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch booking to verify payment status
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

    // CRITICAL: Only generate tickets if payment is completed
    if (booking.payment_status !== "completed") {
      console.error("Payment not completed, refusing to generate tickets. Status:", booking.payment_status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Payment not completed. Tickets can only be generated after successful payment." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if tickets already exist for this booking
    const { data: existingTickets, count: existingCount } = await supabase
      .from("tickets")
      .select("id, ticket_code, ticket_type, qr_code_url", { count: "exact" })
      .eq("booking_id", body.bookingId);

    if (existingCount && existingCount > 0 && existingTickets) {
      console.log("Tickets already exist for this booking:", existingCount);
      
      // Check if it's a group ticket (new format) or individual tickets (old format)
      const groupTicket = existingTickets.find(t => t.ticket_type === "group");
      
      if (groupTicket) {
        // Return group ticket format
        return new Response(
          JSON.stringify({
            success: true,
            alreadyGenerated: true,
            isGroupTicket: true,
            tickets: [{
              id: groupTicket.id,
              ticketCode: groupTicket.ticket_code,
              ticketType: "group",
              qrCodeUrl: groupTicket.qr_code_url,
              adultCount: booking.adult_count || 0,
              childCount: booking.child_count || 0,
              totalGuests: (booking.adult_count || 0) + (booking.child_count || 0),
            }],
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Return old individual tickets format for backward compatibility
        return new Response(
          JSON.stringify({
            success: true,
            alreadyGenerated: true,
            isGroupTicket: false,
            tickets: existingTickets.map(t => ({
              id: t.id,
              ticketCode: t.ticket_code,
              ticketType: t.ticket_type,
              qrCodeUrl: t.qr_code_url,
            })),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Payment verified as completed. Generating SINGLE GROUP QR code...");

    const adultCount = booking.adult_count || 0;
    const childCount = booking.child_count || 0;
    const totalGuests = adultCount + childCount;

    // Generate single group ticket code
    const ticketCode = generateGroupTicketCode(booking.booking_reference);
    
    // Generate group QR data with guest counts
    const qrData = generateGroupQRData(
      ticketCode, 
      booking.booking_reference, 
      booking.visit_date,
      booking.visit_time,
      adultCount,
      childCount
    );
    
    console.log(`Generating GROUP QR for ${totalGuests} guests (${adultCount} adults, ${childCount} children)...`);
    
    // Generate QR code image
    const { base64: qrDataUrl, format } = await generateQRCodeImage(qrData);
    const qrBytes = dataURLtoUint8Array(qrDataUrl);
    
    console.log(`GROUP QR generated, uploading to storage...`);
    
    // Upload to storage with group prefix
    const fileName = `${booking.id}/GROUP-${ticketCode}.${format}`;
    const { error: uploadError } = await supabase.storage
      .from("tickets")
      .upload(fileName, qrBytes, {
        contentType: `image/${format}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading GROUP QR code:", uploadError);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("tickets")
      .getPublicUrl(fileName);

    const qrCodeUrl = urlData?.publicUrl || null;
    console.log(`GROUP QR uploaded: ${qrCodeUrl}`);

    // Insert single group ticket record
    const { data: insertedTicket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        booking_id: booking.id,
        ticket_code: ticketCode,
        ticket_type: "group", // Mark as group ticket
        qr_code_data: qrData,
        qr_code_url: qrCodeUrl,
        valid_from: booking.visit_date,
        valid_until: booking.visit_date,
        is_used: false,
      })
      .select()
      .single();

    if (ticketError) {
      console.error("Error inserting group ticket:", ticketError);
      throw new Error(`Failed to insert group ticket: ${ticketError.message}`);
    }

    // Update booking to mark QR codes as generated
    await supabase
      .from("bookings")
      .update({ qr_codes_generated: true })
      .eq("id", booking.id);

    console.log(`GROUP QR code generated successfully for booking ${booking.booking_reference}`);

    return new Response(
      JSON.stringify({
        success: true,
        isGroupTicket: true,
        tickets: [{
          id: insertedTicket.id,
          ticketCode: insertedTicket.ticket_code,
          ticketType: "group",
          qrCodeUrl: insertedTicket.qr_code_url,
          adultCount,
          childCount,
          totalGuests,
        }],
        bookingReference: booking.booking_reference,
        guestSummary: {
          adults: adultCount,
          children: childCount,
          total: totalGuests,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-tickets function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
