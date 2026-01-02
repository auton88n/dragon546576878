import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

// Version stamp for deployment verification
const CREATE_BOOKING_VERSION = "2026-01-02-v3-deno-qr";

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

interface GeneratedTicket {
  id: string;
  ticketCode: string;
  ticketType: string;
  qrCodeUrl: string;
}

// Generate a unique booking reference
const generateBookingReference = (): string => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ALM-${year}-${random}`;
};

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
  // This generates a base64 GIF data URL
  const qrResult = await qrcode(data, { size: 600, errorCorrectLevel: "H" });
  // The library returns a QRCode object, we need to get the string representation
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

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_reference: bookingReference,
        customer_name: body.customerName,
        customer_email: body.customerEmail,
        customer_phone: body.customerPhone,
        special_requests: body.specialRequests || null,
        visit_date: body.visitDate,
        visit_time: body.visitTime || "09:00",
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

    // Generate tickets
    const generatedTickets: GeneratedTicket[] = [];
    const ticketsToInsert: any[] = [];

    const createTicketsForType = async (type: "adult" | "child", count: number) => {
      for (let i = 0; i < count; i++) {
        const ticketCode = generateTicketCode(type, i + 1);
        const qrData = generateQRData(ticketCode, bookingReference, body.visitDate);
        
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
          valid_from: body.visitDate,
          valid_until: body.visitDate,
          is_used: false,
        });
      }
    };

    // Generate tickets for each type
    try {
      await createTicketsForType("adult", body.adultCount || 0);
      await createTicketsForType("child", body.childCount || 0);
      console.log(`Generated ${ticketsToInsert.length} tickets`);
    } catch (qrError) {
      console.error("QR generation failed, cleaning up booking:", qrError);
      // Cleanup: delete the booking if QR generation fails
      await supabase.from("bookings").delete().eq("id", booking.id);
      throw qrError;
    }

    // Insert all tickets
    if (ticketsToInsert.length > 0) {
      const { data: insertedTickets, error: ticketsError } = await supabase
        .from("tickets")
        .insert(ticketsToInsert)
        .select();

      if (ticketsError) {
        console.error("Error inserting tickets:", ticketsError);
        // Cleanup on ticket insert failure
        await supabase.from("bookings").delete().eq("id", booking.id);
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

    console.log("QR codes generated and marked");

    // Send confirmation email by invoking the email function
    try {
      const { error: emailError } = await supabase.functions.invoke("send-booking-confirmation", {
        body: { bookingId: booking.id },
      });

      if (emailError) {
        console.error("Error sending confirmation email:", emailError);
      } else {
        console.log("Confirmation email sent");
        
        // Update email sent status
        await supabase
          .from("bookings")
          .update({ 
            confirmation_email_sent: true,
            last_email_sent_at: new Date().toISOString()
          })
          .eq("id", booking.id);
      }
    } catch (emailErr) {
      console.error("Error invoking email function:", emailErr);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        bookingReference: bookingReference,
        tickets: generatedTickets,
        paymentUrl: null, // Will be populated when payment API is integrated
        emailSent: true,
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
