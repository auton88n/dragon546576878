import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateVIPTicketsRequest {
  invitationId: string;
  guestCount: number;
}

// Generate a unique VIP ticket code
const generateVIPTicketCode = (invitationId: string): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VIP-${timestamp}${random}`;
};

// Generate QR code data for VIP ticket
const generateVIPQRData = (
  ticketCode: string,
  bookingRef: string,
  visitDate: string,
  guestCount: number
): string => {
  const data = {
    type: "vip",
    code: ticketCode,
    ref: bookingRef,
    date: visitDate,
    guests: guestCount,
    ts: Date.now(),
  };
  
  const checksum = btoa(JSON.stringify(data)).slice(-8);
  
  return JSON.stringify({
    ...data,
    cs: checksum,
  });
};

// Generate QR code image as base64
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
  console.log("generate-vip-tickets called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: GenerateVIPTicketsRequest = await req.json();

    console.log("Generating VIP tickets for invitation:", body.invitationId);

    if (!body.invitationId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing invitationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch invitation and contact details
    const { data: invitation, error: invError } = await supabase
      .from("vip_invitations")
      .select(`
        *,
        vip_contacts (
          id,
          name_en,
          name_ar,
          email,
          phone,
          preferred_language
        )
      `)
      .eq("id", body.invitationId)
      .single();

    if (invError || !invitation) {
      console.error("Invitation not found:", invError);
      return new Response(
        JSON.stringify({ success: false, error: "Invitation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if booking already exists for this invitation
    if (invitation.booking_id) {
      // Fetch existing booking and ticket
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("*, tickets(*)")
        .eq("id", invitation.booking_id)
        .single();

      if (existingBooking) {
        console.log("VIP booking already exists:", existingBooking.booking_reference);
        const ticket = existingBooking.tickets?.[0];
        return new Response(
          JSON.stringify({
            success: true,
            alreadyGenerated: true,
            booking: {
              id: existingBooking.id,
              bookingReference: existingBooking.booking_reference,
              visitDate: existingBooking.visit_date,
              guestCount: existingBooking.adult_count,
            },
            ticket: ticket ? {
              id: ticket.id,
              ticketCode: ticket.ticket_code,
              qrCodeUrl: ticket.qr_code_url,
            } : null,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const contact = invitation.vip_contacts;
    if (!contact) {
      return new Response(
        JSON.stringify({ success: false, error: "Contact not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const guestCount = body.guestCount || invitation.confirmed_guests || 1;
    const visitDate = invitation.event_date || new Date().toISOString().split("T")[0];
    const visitTime = invitation.event_time || "15:00";

    // Generate VIP booking reference
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const bookingReference = `VIP-${timestamp}${random}`;

    console.log("Creating VIP booking:", bookingReference);

    // Create complimentary VIP booking (0 SAR)
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_reference: bookingReference,
        customer_name: contact.preferred_language === "ar" ? contact.name_ar : contact.name_en,
        customer_email: contact.email,
        customer_phone: contact.phone || "",
        visit_date: visitDate,
        visit_time: visitTime,
        adult_count: guestCount,
        child_count: 0,
        adult_price: 0,
        child_price: 0,
        total_amount: 0,
        currency: "SAR",
        booking_status: "confirmed",
        payment_status: "completed", // VIP = complimentary
        payment_method: "vip_complimentary",
        language: contact.preferred_language || "ar",
        confirmation_email_sent: false,
        qr_codes_generated: false,
        special_requests: "VIP Invitation",
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error("Failed to create VIP booking:", bookingError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("VIP booking created:", booking.id);

    // Generate VIP ticket code and QR
    const ticketCode = generateVIPTicketCode(body.invitationId);
    const qrData = generateVIPQRData(ticketCode, bookingReference, visitDate, guestCount);
    
    console.log("Generating VIP QR code...");
    const { base64: qrDataUrl, format } = await generateQRCodeImage(qrData);
    const qrBytes = dataURLtoUint8Array(qrDataUrl);
    
    // Upload to storage
    const fileName = `${booking.id}/VIP-${ticketCode}.${format}`;
    const { error: uploadError } = await supabase.storage
      .from("tickets")
      .upload(fileName, qrBytes, {
        contentType: `image/${format}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading VIP QR code:", uploadError);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("tickets")
      .getPublicUrl(fileName);

    const qrCodeUrl = urlData?.publicUrl || null;
    console.log("VIP QR uploaded:", qrCodeUrl);

    // Create ticket record
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        booking_id: booking.id,
        ticket_code: ticketCode,
        ticket_type: "vip",
        qr_code_data: qrData,
        qr_code_url: qrCodeUrl,
        valid_from: visitDate,
        valid_until: visitDate,
        is_used: false,
      })
      .select()
      .single();

    if (ticketError) {
      console.error("Error creating VIP ticket:", ticketError);
    }

    // Update booking to mark QR as generated
    await supabase
      .from("bookings")
      .update({ qr_codes_generated: true })
      .eq("id", booking.id);

    // Link booking to invitation
    await supabase
      .from("vip_invitations")
      .update({ booking_id: booking.id })
      .eq("id", body.invitationId);

    console.log("VIP ticket generated successfully!");

    // Send confirmation email via existing function
    try {
      const { error: emailError } = await supabase.functions.invoke("send-booking-confirmation", {
        body: { bookingId: booking.id },
      });
      
      if (emailError) {
        console.error("Failed to send VIP confirmation email:", emailError);
      } else {
        console.log("VIP confirmation email sent");
      }
    } catch (emailErr) {
      console.error("Email invocation error:", emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          bookingReference: booking.booking_reference,
          visitDate: booking.visit_date,
          visitTime: booking.visit_time,
          guestCount,
        },
        ticket: ticket ? {
          id: ticket.id,
          ticketCode: ticket.ticket_code,
          qrCodeUrl: ticket.qr_code_url,
        } : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-vip-tickets:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
