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
  const alignStart = isArabic ? "right" : "left";
  const alignEnd = isArabic ? "left" : "right";
  
  const translations = {
    title: isArabic ? "تأكيد الحجز" : "Booking Confirmation",
    greeting: isArabic ? `مرحباً ${booking.customer_name}،` : `Hello ${booking.customer_name},`,
    thankYou: isArabic 
      ? "شكراً لحجزك في سوق المفيجر! نحن سعداء باستضافتك في رحلة عبر التراث الأصيل."
      : "Thank you for booking at Souq Almufaijer! We're delighted to host you on a journey through authentic heritage.",
    bookingRef: isArabic ? "رقم الحجز" : "Booking Reference",
    visitDetails: isArabic ? "تفاصيل الزيارة" : "Visit Details",
    date: isArabic ? "التاريخ" : "Date",
    time: isArabic ? "الوقت" : "Time",
    tickets: isArabic ? "التذاكر" : "Tickets",
    adult: isArabic ? "بالغ" : "Adult",
    child: isArabic ? "طفل" : "Child",
    senior: isArabic ? "كبير السن" : "Senior",
    total: isArabic ? "المجموع" : "Total",
    qrCodes: isArabic ? "تذاكر الدخول" : "Entry Tickets",
    instructions: isArabic 
      ? "قم بإظهار هذه التذاكر عند البوابة"
      : "Present these tickets at the entrance gate",
    validOnly: isArabic 
      ? "صالحة فقط للتاريخ والوقت المحددين"
      : "Valid only for the selected date and time",
    seeYouSoon: isArabic ? "نراكم قريباً!" : "See you soon!",
    contactUs: isArabic ? "تواصل معنا" : "Contact Us",
    email: "info@almufaijer.com",
    address: isArabic ? "سوق المفيجر، المملكة العربية السعودية" : "Souq Almufaijer, Kingdom of Saudi Arabia",
    website: "almufaijer.com",
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
  const ticketItems = [];
  if (booking.adult_count > 0) {
    ticketItems.push({
      type: translations.adult,
      count: booking.adult_count,
      price: booking.adult_price,
      subtotal: booking.adult_count * booking.adult_price
    });
  }
  if (booking.child_count > 0) {
    ticketItems.push({
      type: translations.child,
      count: booking.child_count,
      price: booking.child_price,
      subtotal: booking.child_count * booking.child_price
    });
  }
  if (booking.senior_count > 0) {
    ticketItems.push({
      type: translations.senior,
      count: booking.senior_count,
      price: booking.senior_price,
      subtotal: booking.senior_count * booking.senior_price
    });
  }

  // Generate QR code HTML - modern card style
  const qrCodesHtml = tickets.length > 0 
    ? tickets.map((ticket, index) => {
        const ticketType = ticket.ticket_type === 'adult' ? translations.adult 
          : ticket.ticket_type === 'child' ? translations.child 
          : translations.senior;
        return `
        <div style="display: inline-block; margin: 12px; vertical-align: top;">
          <div style="background: linear-gradient(180deg, #FFFFFF 0%, #FAF8F5 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 32px rgba(139, 111, 71, 0.15); border: 1px solid #E8DED0; width: 200px; text-align: center;">
            <div style="background: linear-gradient(135deg, #C9A86C 0%, #8B7355 100%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; margin-bottom: 16px; letter-spacing: 0.5px;">
              ${ticketType} #${index + 1}
            </div>
            <div style="background: #FFFFFF; padding: 16px; border-radius: 12px; border: 2px solid #C9A86C; margin-bottom: 12px;">
              <img src="${ticket.qr_code_url}" alt="QR Code" style="width: 140px; height: 140px; display: block; margin: 0 auto;" />
            </div>
            <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #8B7355; letter-spacing: 1px; font-weight: 600;">${ticket.ticket_code}</div>
          </div>
        </div>
      `}).join('')
    : `<p style="color: #8B7355; font-style: italic; text-align: center; padding: 20px;">${isArabic ? 'سيتم إرسال رموز QR قريباً' : 'QR codes will be sent shortly'}</p>`;

  return `
<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${translations.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1EB; font-family: ${isArabic ? "'Tajawal', 'Arial', sans-serif" : "'Inter', 'Arial', sans-serif"}; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
    
    <!-- Header Card -->
    <div style="background: linear-gradient(145deg, #8B7355 0%, #6B5344 50%, #4A3625 100%); padding: 48px 32px; text-align: center; border-radius: 24px 24px 0 0; position: relative; overflow: hidden;">
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"none\" stroke=\"rgba(255,255,255,0.05)\" stroke-width=\"0.5\"/></svg>') repeat; opacity: 0.3;"></div>
      <div style="position: relative; z-index: 1;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #C9A86C 0%, #D4B896 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
          <span style="font-size: 36px;">✓</span>
        </div>
        <h1 style="color: #FFFFFF; margin: 0; font-size: 32px; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}</h1>
        <p style="color: #C9A86C; margin: 12px 0 0; font-size: 16px; font-weight: 500; letter-spacing: 2px;">${isArabic ? 'تم تأكيد الحجز' : 'BOOKING CONFIRMED'}</p>
      </div>
    </div>
    
    <!-- Main Content Card -->
    <div style="background: #FFFFFF; padding: 40px 32px; border-radius: 0 0 24px 24px; box-shadow: 0 16px 48px rgba(74, 54, 37, 0.12);">
      
      <!-- Greeting -->
      <h2 style="color: #3D2E1F; margin: 0 0 12px; font-size: 24px; font-weight: 700;">${translations.greeting}</h2>
      <p style="color: #6B5D52; margin: 0 0 32px; line-height: 1.7; font-size: 16px;">${translations.thankYou}</p>
      
      <!-- Booking Reference Badge -->
      <div style="background: linear-gradient(135deg, #FAF6F1 0%, #F0E8DD 100%); padding: 28px; border-radius: 16px; text-align: center; margin-bottom: 32px; border: 2px solid #E8DED0;">
        <p style="color: #8B7355; margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">${translations.bookingRef}</p>
        <p style="color: #3D2E1F; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 3px; font-family: 'Courier New', monospace;">${booking.booking_reference}</p>
      </div>
      
      <!-- Visit Details Grid -->
      <div style="margin-bottom: 32px;">
        <h3 style="color: #3D2E1F; margin: 0 0 20px; font-size: 18px; font-weight: 700; display: flex; align-items: center;">
          <span style="display: inline-block; width: 4px; height: 20px; background: linear-gradient(180deg, #C9A86C 0%, #8B7355 100%); border-radius: 2px; margin-${alignEnd}: 12px;"></span>
          ${translations.visitDetails}
        </h3>
        <div style="display: table; width: 100%; border-collapse: collapse;">
          <div style="display: table-row;">
            <div style="display: table-cell; padding: 16px 20px; background: #FAF8F5; border-radius: 12px 0 0 0; border-bottom: 1px solid #E8DED0;">
              <p style="color: #8B7355; margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">📅 ${translations.date}</p>
              <p style="color: #3D2E1F; margin: 0; font-size: 16px; font-weight: 600;">${formattedDate}</p>
            </div>
            <div style="display: table-cell; padding: 16px 20px; background: #FAF8F5; border-radius: 0 12px 0 0; border-bottom: 1px solid #E8DED0; border-${alignStart}: 1px solid #E8DED0;">
              <p style="color: #8B7355; margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">🕐 ${translations.time}</p>
              <p style="color: #3D2E1F; margin: 0; font-size: 16px; font-weight: 600;">${formatTime(booking.visit_time)}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tickets Section -->
      <div style="margin-bottom: 32px;">
        <h3 style="color: #3D2E1F; margin: 0 0 20px; font-size: 18px; font-weight: 700; display: flex; align-items: center;">
          <span style="display: inline-block; width: 4px; height: 20px; background: linear-gradient(180deg, #C9A86C 0%, #8B7355 100%); border-radius: 2px; margin-${alignEnd}: 12px;"></span>
          ${translations.tickets}
        </h3>
        <div style="background: #FAF8F5; border-radius: 16px; overflow: hidden; border: 1px solid #E8DED0;">
          ${ticketItems.map((item, i) => `
            <div style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; ${i > 0 ? 'border-top: 1px solid #E8DED0;' : ''}">
              <div>
                <span style="color: #3D2E1F; font-weight: 600; font-size: 15px;">${item.type}</span>
                <span style="color: #8B7355; font-size: 14px; margin-${alignStart}: 8px;">× ${item.count}</span>
              </div>
              <span style="color: #3D2E1F; font-weight: 600; font-size: 15px;">${item.subtotal} SAR</span>
            </div>
          `).join('')}
          <div style="padding: 20px; background: linear-gradient(135deg, #3D2E1F 0%, #4A3625 100%); display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #C9A86C; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">${translations.total}</span>
            <span style="color: #FFFFFF; font-size: 28px; font-weight: 800;">${booking.total_amount} <span style="font-size: 16px; font-weight: 600;">SAR</span></span>
          </div>
        </div>
      </div>
      
      <!-- QR Codes Section -->
      <div style="margin-bottom: 32px;">
        <h3 style="color: #3D2E1F; margin: 0 0 12px; font-size: 18px; font-weight: 700; display: flex; align-items: center;">
          <span style="display: inline-block; width: 4px; height: 20px; background: linear-gradient(180deg, #C9A86C 0%, #8B7355 100%); border-radius: 2px; margin-${alignEnd}: 12px;"></span>
          ${translations.qrCodes}
        </h3>
        <p style="color: #8B7355; margin: 0 0 20px; font-size: 14px;">
          📱 ${translations.instructions}
        </p>
        <div style="text-align: center; padding: 16px 0;">
          ${qrCodesHtml}
        </div>
        <div style="background: linear-gradient(135deg, #FFF9E6 0%, #FFF3CC 100%); padding: 16px 20px; border-radius: 12px; border: 1px solid #F0D98C; text-align: center; margin-top: 16px;">
          <p style="color: #8B6914; margin: 0; font-size: 13px; font-weight: 600;">
            ⚠️ ${translations.validOnly}
          </p>
        </div>
      </div>
      
      <!-- See You Soon -->
      <div style="text-align: center; padding: 32px 0; border-top: 2px dashed #E8DED0;">
        <p style="color: #3D2E1F; margin: 0; font-size: 24px; font-weight: 700;">${translations.seeYouSoon}</p>
        <p style="color: #8B7355; margin: 12px 0 0; font-size: 14px;">
          ${translations.contactUs}: <a href="mailto:${translations.email}" style="color: #C9A86C; text-decoration: none; font-weight: 600;">${translations.email}</a>
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 32px 16px;">
      <p style="color: #8B7355; margin: 0 0 8px; font-size: 14px; font-weight: 600;">${translations.address}</p>
      <p style="color: #A69888; margin: 0; font-size: 12px;">
        © ${new Date().getFullYear()} Souq Almufaijer. ${isArabic ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
      </p>
    </div>
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
        from: "Souq Almufaijer <info@almufaijer.com>",
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
