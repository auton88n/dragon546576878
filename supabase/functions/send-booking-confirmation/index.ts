import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  bookingId: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Update email queue with error details
async function updateEmailQueueError(
  supabase: any,
  emailQueueId: string,
  errorMessage: string,
  attempt: number
) {
  try {
    await supabase
      .from("email_queue")
      .update({
        status: attempt >= MAX_RETRIES ? "failed" : "pending",
        error_message: errorMessage,
        attempts: attempt,
        last_attempt: new Date().toISOString(),
      })
      .eq("id", emailQueueId);
    console.log(`Email queue updated with error: ${errorMessage}`);
  } catch (updateError) {
    console.error("Failed to update email queue:", updateError);
  }
}

// Generate email template
const generateEmailTemplate = (
  booking: any,
  tickets: any[],
  isArabic: boolean
) => {
  const direction = isArabic ? "rtl" : "ltr";
  const fontFamily = isArabic ? "'Cairo', Arial, sans-serif" : "'Inter', Arial, sans-serif";
  
  const translations = {
    title: isArabic ? "تأكيد الحجز" : "Booking Confirmation",
    greeting: isArabic ? `مرحباً ${booking.customer_name}،` : `Hello ${booking.customer_name},`,
    thankYou: isArabic 
      ? "شكراً لحجزك في سوق المفيجر! نحن متحمسون لاستضافتك."
      : "Thank you for booking at Souq Almufaijer! We're excited to host you.",
    bookingRef: isArabic ? "رقم الحجز" : "Booking Reference",
    visitDetails: isArabic ? "تفاصيل الزيارة" : "Visit Details",
    date: isArabic ? "التاريخ" : "Date",
    time: isArabic ? "الوقت" : "Time",
    tickets: isArabic ? "التذاكر" : "Tickets",
    adult: isArabic ? "بالغ" : "Adult",
    child: isArabic ? "طفل" : "Child",
    senior: isArabic ? "كبير السن" : "Senior",
    total: isArabic ? "المجموع" : "Total",
    qrCodes: isArabic ? "رموز QR الخاصة بك" : "Your QR Codes",
    instructions: isArabic 
      ? "يرجى إظهار رموز QR هذه عند المدخل"
      : "Please show these QR codes at the entrance",
    validOnly: isArabic 
      ? "صالحة فقط للتاريخ والوقت المحددين"
      : "Valid only for the selected date and time",
    contactUs: isArabic ? "تواصل معنا" : "Contact Us",
    email: "info@almufaijer.com",
    phone: "+966 XXX XXX XXXX",
    address: isArabic ? "سوق المفيجر، المملكة العربية السعودية" : "Souq Almufaijer, Saudi Arabia",
    footer: isArabic 
      ? "نتطلع لرؤيتك قريباً!"
      : "We look forward to seeing you soon!",
  };

  // Format date
  const visitDate = new Date(booking.visit_date);
  const formattedDate = visitDate.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format time
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? (isArabic ? 'م' : 'PM') : (isArabic ? 'ص' : 'AM');
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Generate ticket rows
  const ticketRows = [];
  if (booking.adult_count > 0) {
    ticketRows.push(`${translations.adult}: ${booking.adult_count} × ${booking.adult_price} SAR`);
  }
  if (booking.child_count > 0) {
    ticketRows.push(`${translations.child}: ${booking.child_count} × ${booking.child_price} SAR`);
  }
  if (booking.senior_count > 0) {
    ticketRows.push(`${translations.senior}: ${booking.senior_count} × ${booking.senior_price} SAR`);
  }

  // Generate QR code HTML
  const qrCodesHtml = tickets.length > 0 
    ? tickets.map((ticket, index) => `
      <div style="display: inline-block; text-align: center; margin: 10px; padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #D4C5B0;">
        <img src="${ticket.qr_code_url}" alt="QR Code ${index + 1}" style="width: 150px; height: 150px; display: block; margin: 0 auto;" />
        <p style="margin: 10px 0 0; font-size: 12px; color: #4A3625;">
          ${ticket.ticket_type === 'adult' ? translations.adult : ticket.ticket_type === 'child' ? translations.child : translations.senior} #${index + 1}
        </p>
        <p style="margin: 5px 0 0; font-size: 10px; color: #8B6F47;">${ticket.ticket_code}</p>
      </div>
    `).join('')
    : '<p style="color: #8B6F47; font-style: italic;">QR codes will be available shortly. Please refresh your booking page.</p>';

  return `
<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${translations.title}</title>
  ${isArabic ? '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">' : ''}
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1E8; font-family: ${fontFamily};">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #8B6F47 0%, #4A3625 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #F5F1E8; margin: 0; font-size: 28px;">${isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}</h1>
      <p style="color: #D4C5B0; margin: 10px 0 0; font-size: 14px;">${isArabic ? 'التراث الأصيل' : 'Authentic Heritage'}</p>
    </div>
    
    <!-- Main Content -->
    <div style="background: #fff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <!-- Greeting -->
      <h2 style="color: #4A3625; margin: 0 0 10px; font-size: 20px;">${translations.greeting}</h2>
      <p style="color: #666; margin: 0 0 25px; line-height: 1.6;">${translations.thankYou}</p>
      
      <!-- Booking Reference -->
      <div style="background: #F5F1E8; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
        <p style="color: #8B6F47; margin: 0; font-size: 12px; text-transform: uppercase;">${translations.bookingRef}</p>
        <p style="color: #4A3625; margin: 10px 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${booking.booking_reference}</p>
      </div>
      
      <!-- Visit Details -->
      <h3 style="color: #4A3625; margin: 0 0 15px; font-size: 16px; border-bottom: 2px solid #D4C5B0; padding-bottom: 10px;">${translations.visitDetails}</h3>
      <table style="width: 100%; margin-bottom: 25px;">
        <tr>
          <td style="padding: 8px 0; color: #8B6F47; width: 100px;">${translations.date}:</td>
          <td style="padding: 8px 0; color: #4A3625; font-weight: 600;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #8B6F47;">${translations.time}:</td>
          <td style="padding: 8px 0; color: #4A3625; font-weight: 600;">${formatTime(booking.visit_time)}</td>
        </tr>
      </table>
      
      <!-- Tickets -->
      <h3 style="color: #4A3625; margin: 0 0 15px; font-size: 16px; border-bottom: 2px solid #D4C5B0; padding-bottom: 10px;">${translations.tickets}</h3>
      <div style="margin-bottom: 15px;">
        ${ticketRows.map(row => `<p style="color: #666; margin: 8px 0;">${row}</p>`).join('')}
      </div>
      <div style="background: #4A3625; padding: 15px; border-radius: 8px; text-align: center;">
        <span style="color: #D4C5B0; font-size: 14px;">${translations.total}:</span>
        <span style="color: #F5F1E8; font-size: 24px; font-weight: bold; margin-${isArabic ? 'right' : 'left'}: 10px;">${booking.total_amount} SAR</span>
      </div>
      
      <!-- QR Codes -->
      <h3 style="color: #4A3625; margin: 30px 0 15px; font-size: 16px; border-bottom: 2px solid #D4C5B0; padding-bottom: 10px;">${translations.qrCodes}</h3>
      <p style="color: #8B6F47; margin: 0 0 15px; font-size: 14px;">
        📱 ${translations.instructions}
      </p>
      <div style="text-align: center; background: #F5F1E8; padding: 20px; border-radius: 8px;">
        ${qrCodesHtml}
      </div>
      <p style="color: #999; margin: 15px 0 0; font-size: 12px; text-align: center; font-style: italic;">
        ⚠️ ${translations.validOnly}
      </p>
      
      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #D4C5B0; text-align: center;">
        <p style="color: #4A3625; margin: 0 0 15px; font-weight: 600;">${translations.footer}</p>
        <p style="color: #8B6F47; margin: 0; font-size: 13px;">
          ${translations.contactUs}: <a href="mailto:${translations.email}" style="color: #8B6F47;">${translations.email}</a>
        </p>
        <p style="color: #999; margin: 10px 0 0; font-size: 12px;">${translations.address}</p>
      </div>
    </div>
    
    <!-- Legal Footer -->
    <p style="text-align: center; color: #999; font-size: 11px; margin-top: 20px;">
      © ${new Date().getFullYear()} Souq Almufaijer. ${isArabic ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
    </p>
  </div>
</body>
</html>
  `;
};

// Send email with retry logic using Resend
async function sendEmailWithRetry(
  supabase: any,
  resend: Resend,
  booking: any,
  tickets: any[],
  emailQueueId: string | null,
  isArabic: boolean
): Promise<{ success: boolean; error?: string }> {
  // Generate email content
  const emailHtml = generateEmailTemplate(booking, tickets, isArabic);
  const subject = isArabic
    ? `تأكيد الحجز - ${booking.booking_reference} | سوق المفيجر`
    : `Booking Confirmation - ${booking.booking_reference} | Souq Almufaijer`;

  let lastError = "";
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`Attempt ${attempt}/${MAX_RETRIES} - Sending email to: ${booking.customer_email}`);
    
    try {
      const { data, error } = await resend.emails.send({
        from: "Souq Almufaijer <onboarding@resend.dev>",
        to: [booking.customer_email],
        subject: subject,
        html: emailHtml,
      });

      if (error) {
        throw new Error(error.message || "Resend API error");
      }

      console.log(`✅ Email sent successfully to ${booking.customer_email} on attempt ${attempt}`);
      console.log(`   Resend ID: ${data?.id}`);

      // Update email queue success
      if (emailQueueId) {
        await supabase
          .from("email_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: attempt,
            last_attempt: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", emailQueueId);
      }

      // Update booking confirmation status
      await supabase
        .from("bookings")
        .update({ confirmation_email_sent: true })
        .eq("id", booking.id);

      return { success: true };

    } catch (error: any) {
      lastError = error.message || String(error);
      console.error(`❌ Attempt ${attempt} failed:`, lastError);

      // Update email queue with attempt info
      if (emailQueueId) {
        await updateEmailQueueError(supabase, emailQueueId, lastError, attempt);
      }

      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES) {
        const waitTime = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
    }
  }

  return { success: false, error: lastError };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let bookingId = "";

  try {
    const body = await req.json();
    bookingId = body.bookingId;

    if (!bookingId) {
      throw new Error("Missing bookingId parameter");
    }

    console.log("=".repeat(50));
    console.log(`📧 Processing booking confirmation for: ${bookingId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // Check Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY not configured");
      throw new Error("Email service not configured: RESEND_API_KEY missing");
    }

    // Initialize Resend client
    const resend = new Resend(resendApiKey);
    console.log("✅ Resend client initialized");

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking fetch error:", bookingError);
      throw new Error(`Booking not found: ${bookingId}`);
    }

    console.log(`📋 Booking found: ${booking.booking_reference}`);
    console.log(`   Customer: ${booking.customer_name} (${booking.customer_email})`);
    console.log(`   Language: ${booking.language}`);

    // Fetch tickets for this booking
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("*")
      .eq("booking_id", bookingId);

    if (ticketsError) {
      console.error("Tickets fetch error:", ticketsError);
    }

    console.log(`🎟️ Tickets found: ${tickets?.length || 0}`);

    // Determine language
    const isArabic = booking.language === "ar";

    // Generate email HTML
    const emailHtml = generateEmailTemplate(booking, tickets || [], isArabic);

    // Create email subject
    const subject = isArabic
      ? `تأكيد الحجز - ${booking.booking_reference} | سوق المفيجر`
      : `Booking Confirmation - ${booking.booking_reference} | Souq Almufaijer`;

    // Queue the email in database first
    const { data: emailQueueEntry, error: queueError } = await supabase
      .from("email_queue")
      .insert({
        booking_id: bookingId,
        to_email: booking.customer_email,
        to_name: booking.customer_name,
        subject: subject,
        body_html: emailHtml,
        body_text: `Booking Confirmation: ${booking.booking_reference}`,
        email_type: "booking_confirmation",
        status: "processing",
        attempts: 0,
      })
      .select()
      .single();

    if (queueError) {
      console.error("Email queue insert error:", queueError);
    } else {
      console.log(`📝 Email queued with ID: ${emailQueueEntry?.id}`);
    }

    // Send email with retry logic
    const result = await sendEmailWithRetry(
      supabase,
      resend,
      booking,
      tickets || [],
      emailQueueEntry?.id || null,
      isArabic
    );

    const duration = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${duration}ms`);
    console.log("=".repeat(50));

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          recipient: booking.customer_email,
          duration: duration,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          recipient: booking.customer_email,
          duration: duration,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("=".repeat(50));
    console.error(`❌ Error in send-booking-confirmation`);
    console.error(`BookingId: ${bookingId}`);
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error(`Duration: ${duration}ms`);
    console.error("=".repeat(50));

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        duration: duration,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
