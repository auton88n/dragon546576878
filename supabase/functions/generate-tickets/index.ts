import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

// Version stamp for deployment verification
const GENERATE_TICKETS_VERSION = "2026-01-07-v1";

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
}

// Generate a unique ticket code
const generateTicketCode = (type: string, index: number): string => {
  const typePrefix = type.charAt(0).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${typePrefix}${timestamp}${random}${index}`;
};

// Generate QR code data with checksum
const generateQRData = (ticketCode: string, bookingRef: string, visitDate: string): string => {
  const data = {
    code: ticketCode,
    ref: bookingRef,
    date: visitDate,
    ts: Date.now(),
  };
  
  const checksum = btoa(JSON.stringify(data)).slice(-8);
  
  return JSON.stringify({
    ...data,
    cs: checksum,
  });
};

// Generate QR code image as base64 using Deno-native library
const generateQRCodeImage = async (data: string): Promise<{ base64: string; format: string }> => {
  const qrResult = await qrcode(data, { size: 600, errorCorrectLevel: "H" });
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

    console.log("Generating tickets for booking:", body.bookingId);

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

    // Check if tickets already exist
    const { count: existingTickets } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", body.bookingId);

    if (existingTickets && existingTickets > 0) {
      console.log("Tickets already exist for this booking:", existingTickets);
      
      // Fetch existing tickets and return them
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id, ticket_code, ticket_type, qr_code_url")
        .eq("booking_id", body.bookingId);

      return new Response(
        JSON.stringify({
          success: true,
          alreadyGenerated: true,
          tickets: tickets?.map(t => ({
            id: t.id,
            ticketCode: t.ticket_code,
            ticketType: t.ticket_type,
            qrCodeUrl: t.qr_code_url,
          })) || [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Payment verified as completed. Generating tickets...");

    // Generate tickets
    const generatedTickets: GeneratedTicket[] = [];
    const ticketsToInsert: any[] = [];

    const createTicketsForType = async (type: "adult" | "child", count: number) => {
      for (let i = 0; i < count; i++) {
        const ticketCode = generateTicketCode(type, i + 1);
        const qrData = generateQRData(ticketCode, booking.booking_reference, booking.visit_date);
        
        console.log(`Generating QR for ticket ${ticketCode}...`);
        
        // Generate QR code image using Deno-native library
        const { base64: qrDataUrl, format } = await generateQRCodeImage(qrData);
        const qrBytes = dataURLtoUint8Array(qrDataUrl);
        
        console.log(`QR generated, uploading to storage...`);
        
        // Upload to storage
        const fileName = `${booking.id}/${ticketCode}.${format}`;
        const { error: uploadError } = await supabase.storage
          .from("tickets")
          .upload(fileName, qrBytes, {
            contentType: `image/${format}`,
            upsert: true,
          });

        if (uploadError) {
          console.error("Error uploading QR code:", uploadError);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("tickets")
          .getPublicUrl(fileName);

        const qrCodeUrl = urlData?.publicUrl || null;
        console.log(`QR uploaded: ${qrCodeUrl}`);

        ticketsToInsert.push({
          booking_id: booking.id,
          ticket_code: ticketCode,
          ticket_type: type,
          qr_code_data: qrData,
          qr_code_url: qrCodeUrl,
          valid_from: booking.visit_date,
          valid_until: booking.visit_date,
          is_used: false,
        });
      }
    };

    // Generate tickets for each type
    await createTicketsForType("adult", booking.adult_count || 0);
    await createTicketsForType("child", booking.child_count || 0);
    console.log(`Generated ${ticketsToInsert.length} tickets`);

    // Insert all tickets
    if (ticketsToInsert.length > 0) {
      const { data: insertedTickets, error: ticketsError } = await supabase
        .from("tickets")
        .insert(ticketsToInsert)
        .select();

      if (ticketsError) {
        console.error("Error inserting tickets:", ticketsError);
        throw new Error(`Failed to insert tickets: ${ticketsError.message}`);
      } else if (insertedTickets) {
        generatedTickets.push(
          ...insertedTickets.map((t: any) => ({
            id: t.id,
            ticketCode: t.ticket_code,
            ticketType: t.ticket_type,
            qrCodeUrl: t.qr_code_url || "",
          }))
        );
      }
    }

    // Update booking to mark QR codes as generated
    await supabase
      .from("bookings")
      .update({ qr_codes_generated: true })
      .eq("id", booking.id);

    console.log("QR codes generated and marked. Total tickets:", generatedTickets.length);

    return new Response(
      JSON.stringify({
        success: true,
        tickets: generatedTickets,
        bookingReference: booking.booking_reference,
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
