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

// Generate email template - email client compatible with proper RTL and high contrast
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
    heritage: isArabic ? "التراث الأصيل" : "Authentic Heritage",
    confirmed: isArabic ? "تم تأكيد الحجز" : "BOOKING CONFIRMED",
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

  // Generate QR code HTML using tables for email client compatibility
  const qrCodesHtml = tickets.length > 0 
    ? `<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${tickets.map((ticket, index) => {
        const ticketType = ticket.ticket_type === 'adult' ? translations.adult 
          : ticket.ticket_type === 'child' ? translations.child 
          : translations.senior;
        return `
        <td align="center" valign="top" style="padding: 12px;">
          <table cellpadding="0" cellspacing="0" border="0" width="200" style="background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E8DED0;">
            <tr>
              <td align="center" style="padding: 24px 24px 16px 24px;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="background-color: #8B7355; color: #FFFFFF; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: Arial, sans-serif;">
                      ${ticketType} #${index + 1}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 24px 16px 24px;">
                <table cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; padding: 12px; border-radius: 12px; border: 2px solid #C9A86C;">
                  <tr>
                    <td align="center">
                      <img src="${ticket.qr_code_url}" alt="QR Code" width="140" height="140" style="display: block;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 24px 24px 24px; font-family: 'Courier New', monospace; font-size: 11px; color: #3D2E1F; letter-spacing: 1px; font-weight: 600;">
                ${ticket.ticket_code}
              </td>
            </tr>
          </table>
        </td>
      `}).join('')}</tr></table>`
    : `<p style="color: #3D2E1F; font-style: italic; text-align: center; padding: 20px; font-family: Arial, sans-serif;">${isArabic ? 'سيتم إرسال رموز QR قريباً' : 'QR codes will be sent shortly'}</p>`;

  return `
<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${translations.title}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    td {font-family: Arial, sans-serif;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1EB; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; direction: ${direction};">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F5F1EB;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 640px;">
          
          <!-- Header Card -->
          <tr>
            <td align="center" style="background-color: #5C4A3A; padding: 48px 32px; border-radius: 24px 24px 0 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="80" height="80" style="background-color: #C9A86C; border-radius: 40px;">
                <tr>
                  <td align="center" valign="middle" style="font-size: 36px; color: #FFFFFF;">✓</td>
                </tr>
              </table>
              <h1 style="color: #FFFFFF; margin: 20px 0 0; font-size: 32px; font-weight: 800; font-family: Arial, sans-serif; direction: ${direction};">${isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}</h1>
              <p style="color: #FFFFFF; margin: 12px 0 0; font-size: 16px; font-weight: 600; letter-spacing: 2px; font-family: Arial, sans-serif; direction: ${direction};">${translations.confirmed}</p>
            </td>
          </tr>
          
          <!-- Main Content Card -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 40px 32px; border-radius: 0 0 24px 24px;">
              
              <!-- Greeting -->
              <h2 style="color: #3D2E1F; margin: 0 0 12px; font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; text-align: ${alignStart}; direction: ${direction};">${translations.greeting}</h2>
              <p style="color: #5C4A3A; margin: 0 0 32px; line-height: 1.7; font-size: 16px; font-family: Arial, sans-serif; text-align: ${alignStart}; direction: ${direction};">${translations.thankYou}</p>
              
              <!-- Booking Reference Badge -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td align="center" style="background-color: #FAF6F1; padding: 28px; border-radius: 16px; border: 2px solid #E8DED0;">
                    <p style="color: #3D2E1F; margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; font-family: Arial, sans-serif;">${translations.bookingRef}</p>
                    <p style="color: #3D2E1F; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 3px; font-family: 'Courier New', Courier, monospace;">${booking.booking_reference}</p>
                  </td>
                </tr>
              </table>
              
              <!-- Visit Details -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 4px; background-color: #C9A86C; border-radius: 2px;"></td>
                        <td style="padding-${alignStart}: 12px;">
                          <h3 style="color: #3D2E1F; margin: 0; font-size: 18px; font-weight: 700; font-family: Arial, sans-serif; direction: ${direction};">${translations.visitDetails}</h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="50%" style="padding: 16px 20px; background-color: #FAF8F5; vertical-align: top;">
                          <p style="color: #3D2E1F; margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; font-family: Arial, sans-serif;">📅 ${translations.date}</p>
                          <p style="color: #3D2E1F; margin: 0; font-size: 16px; font-weight: 600; font-family: Arial, sans-serif; direction: ${direction};">${formattedDate}</p>
                        </td>
                        <td width="50%" style="padding: 16px 20px; background-color: #FAF8F5; border-${alignStart}: 1px solid #E8DED0; vertical-align: top;">
                          <p style="color: #3D2E1F; margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; font-family: Arial, sans-serif;">🕐 ${translations.time}</p>
                          <p style="color: #3D2E1F; margin: 0; font-size: 16px; font-weight: 600; font-family: Arial, sans-serif; direction: ${direction};">${formatTime(booking.visit_time)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Tickets Section -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 4px; background-color: #C9A86C; border-radius: 2px;"></td>
                        <td style="padding-${alignStart}: 12px;">
                          <h3 style="color: #3D2E1F; margin: 0; font-size: 18px; font-weight: 700; font-family: Arial, sans-serif; direction: ${direction};">${translations.tickets}</h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF8F5; border-radius: 16px; border: 1px solid #E8DED0;">
                      ${ticketItems.map((item, i) => `
                      <tr>
                        <td style="padding: 16px 20px; ${i > 0 ? 'border-top: 1px solid #E8DED0;' : ''} direction: ${direction};">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="text-align: ${alignStart};">
                                <span style="color: #3D2E1F; font-weight: 600; font-size: 15px; font-family: Arial, sans-serif;">${item.type}</span>
                                <span style="color: #5C4A3A; font-size: 14px; margin-${alignStart}: 8px; font-family: Arial, sans-serif;">× ${item.count}</span>
                              </td>
                              <td style="text-align: ${alignEnd};">
                                <span style="color: #3D2E1F; font-weight: 600; font-size: 15px; font-family: Arial, sans-serif;">${item.subtotal} SAR</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      `).join('')}
                      <tr>
                        <td style="padding: 20px; background-color: #3D2E1F; border-radius: 0 0 16px 16px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="text-align: ${alignStart};">
                                <span style="color: #C9A86C; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">${translations.total}</span>
                              </td>
                              <td style="text-align: ${alignEnd};">
                                <span style="color: #FFFFFF; font-size: 28px; font-weight: 800; font-family: Arial, sans-serif;">${booking.total_amount} <span style="font-size: 16px; font-weight: 600;">SAR</span></span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- QR Codes Section -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 4px; background-color: #C9A86C; border-radius: 2px;"></td>
                        <td style="padding-${alignStart}: 12px;">
                          <h3 style="color: #3D2E1F; margin: 0; font-size: 18px; font-weight: 700; font-family: Arial, sans-serif; direction: ${direction};">${translations.qrCodes}</h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="color: #5C4A3A; margin: 0; font-size: 14px; font-family: Arial, sans-serif; text-align: ${alignStart}; direction: ${direction};">
                      📱 ${translations.instructions}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    ${qrCodesHtml}
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FFF9E6; border-radius: 12px; border: 1px solid #E6D174;">
                      <tr>
                        <td align="center" style="padding: 16px 20px;">
                          <p style="color: #8B6914; margin: 0; font-size: 13px; font-weight: 600; font-family: Arial, sans-serif; direction: ${direction};">
                            ⚠️ ${translations.validOnly}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- See You Soon -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 2px dashed #E8DED0;">
                <tr>
                  <td align="center" style="padding: 32px 0;">
                    <p style="color: #3D2E1F; margin: 0; font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; direction: ${direction};">${translations.seeYouSoon}</p>
                    <p style="color: #5C4A3A; margin: 12px 0 0; font-size: 14px; font-family: Arial, sans-serif;">
                      ${translations.contactUs}: <a href="mailto:${translations.email}" style="color: #8B7355; text-decoration: none; font-weight: 600;">${translations.email}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <p style="color: #5C4A3A; margin: 0 0 8px; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; direction: ${direction};">${translations.address}</p>
              <p style="color: #8B7355; margin: 0; font-size: 12px; font-family: Arial, sans-serif;">
                © ${new Date().getFullYear()} Souq Almufaijer. ${isArabic ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
