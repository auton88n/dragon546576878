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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  } catch (updateError) {
    console.error("Failed to update email queue:", updateError);
  }
}

// Base64 encoded white logo for email header (small PNG, ~4KB)
// This ensures the logo displays reliably in all email clients without external image blocking issues
const LOGO_BASE64 = "data:image/png;base64,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";

// Simple email template with fixed CSS (no dynamic property names)
const generateEmailTemplate = (
  booking: any,
  tickets: any[],
  isArabic: boolean,
  logoBase64: string
) => {
  const direction = isArabic ? "rtl" : "ltr";
  const textAlign = isArabic ? "right" : "left";
  const textAlignOpposite = isArabic ? "left" : "right";
  
  // Pre-compute padding styles (avoiding dynamic property names)
  const paddingStart = isArabic ? "padding-right: 12px;" : "padding-left: 12px;";
  const marginStart = isArabic ? "margin-right: 8px;" : "margin-left: 8px;";
  const borderStart = isArabic ? "border-right: 1px solid #E8DED0;" : "border-left: 1px solid #E8DED0;";
  
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

  // Generate ticket items
  const ticketItems: Array<{type: string, count: number, price: number, subtotal: number}> = [];
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

  // Generate QR codes HTML
  let qrCodesHtml = '';
  if (tickets.length > 0) {
    const qrItems = tickets.map((ticket, index) => {
      const ticketType = ticket.ticket_type === 'adult' ? translations.adult 
        : ticket.ticket_type === 'child' ? translations.child 
        : translations.senior;
      return `
        <td align="center" valign="top" style="padding: 12px;">
          <table cellpadding="0" cellspacing="0" border="0" width="180" style="background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E8DED0;">
            <tr>
              <td align="center" style="padding: 16px 16px 12px 16px;">
                <span style="display: inline-block; background-color: #5C4A3A; color: #FFFFFF; padding: 6px 12px; border-radius: 16px; font-size: 11px; font-weight: 600; font-family: Arial, sans-serif;">
                  ${ticketType} #${index + 1}
                </span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 16px 12px 16px;">
                <img src="${ticket.qr_code_url}" alt="QR Code" width="120" height="120" style="display: block; border: 2px solid #C9A86C; border-radius: 8px;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 16px 16px 16px; font-family: monospace; font-size: 10px; color: #3D2E1F; letter-spacing: 1px; font-weight: 600;">
                ${ticket.ticket_code}
              </td>
            </tr>
          </table>
        </td>`;
    });
    qrCodesHtml = `<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${qrItems.join('')}</tr></table>`;
  } else {
    qrCodesHtml = `<p style="color: #3D2E1F; font-style: italic; text-align: center; padding: 20px; font-family: Arial, sans-serif;">${isArabic ? 'سيتم إرسال رموز QR قريباً' : 'QR codes will be sent shortly'}</p>`;
  }

  // Generate ticket rows HTML
  let ticketRowsHtml = '';
  ticketItems.forEach((item, i) => {
    ticketRowsHtml += `
      <tr>
        <td style="padding: 14px 16px; ${i > 0 ? 'border-top: 1px solid #E8DED0;' : ''}">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="text-align: ${textAlign}; font-family: Arial, sans-serif;">
                <span style="color: #3D2E1F; font-weight: 600; font-size: 14px;">${item.type}</span>
                <span style="color: #666666; font-size: 13px;"> x ${item.count}</span>
              </td>
              <td style="text-align: ${textAlignOpposite}; font-family: Arial, sans-serif;">
                <span style="color: #3D2E1F; font-weight: 600; font-size: 14px;">${item.subtotal} SAR</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  });

  return `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${translations.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1EB; font-family: Arial, sans-serif; direction: ${direction};">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F5F1EB;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #5C4A3A; padding: 32px 24px; border-radius: 16px 16px 0 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <!-- Base64 embedded logo for reliable display in all email clients -->
                    <img src="${logoBase64}" alt="Souq Almufaijer" width="180" style="display: block; max-width: 180px; height: auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="color: #FFFFFF; margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 1px; font-family: Arial, sans-serif;">${translations.confirmed}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px 24px; border-radius: 0 0 16px 16px;">
              
              <!-- Greeting -->
              <h2 style="color: #3D2E1F; margin: 0 0 10px; font-size: 20px; font-weight: 700; font-family: Arial, sans-serif; text-align: ${textAlign};">${translations.greeting}</h2>
              <p style="color: #5C4A3A; margin: 0 0 24px; line-height: 1.6; font-size: 15px; font-family: Arial, sans-serif; text-align: ${textAlign};">${translations.thankYou}</p>
              
              <!-- Booking Reference -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #FAF6F1; padding: 24px; border-radius: 12px; border: 2px solid #E8DED0;">
                    <p style="color: #3D2E1F; margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; font-family: Arial, sans-serif;">${translations.bookingRef}</p>
                    <p style="color: #3D2E1F; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; font-family: monospace;">${booking.booking_reference}</p>
                  </td>
                </tr>
              </table>
              
              <!-- Visit Details -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 4px; background-color: #C9A86C; border-radius: 2px;"></td>
                        <td style="${paddingStart}">
                          <h3 style="color: #3D2E1F; margin: 0; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif;">${translations.visitDetails}</h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF8F5; border-radius: 8px;">
                      <tr>
                        <td width="50%" style="padding: 14px 16px; vertical-align: top;">
                          <p style="color: #666666; margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; font-family: Arial, sans-serif;">📅 ${translations.date}</p>
                          <p style="color: #3D2E1F; margin: 0; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">${formattedDate}</p>
                        </td>
                        <td width="50%" style="padding: 14px 16px; ${borderStart} vertical-align: top;">
                          <p style="color: #666666; margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; font-family: Arial, sans-serif;">🕐 ${translations.time}</p>
                          <p style="color: #3D2E1F; margin: 0; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">${formatTime(booking.visit_time)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Tickets -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 4px; background-color: #C9A86C; border-radius: 2px;"></td>
                        <td style="${paddingStart}">
                          <h3 style="color: #3D2E1F; margin: 0; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif;">${translations.tickets}</h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF8F5; border-radius: 12px; border: 1px solid #E8DED0;">
                      ${ticketRowsHtml}
                      <tr>
                        <td style="padding: 16px; background-color: #3D2E1F; border-radius: 0 0 12px 12px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="text-align: ${textAlign};">
                                <span style="color: #C9A86C; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">${translations.total}</span>
                              </td>
                              <td style="text-align: ${textAlignOpposite};">
                                <span style="color: #FFFFFF; font-size: 24px; font-weight: 800; font-family: Arial, sans-serif;">${booking.total_amount} <span style="font-size: 14px; font-weight: 600;">SAR</span></span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- QR Codes -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 4px; background-color: #C9A86C; border-radius: 2px;"></td>
                        <td style="${paddingStart}">
                          <h3 style="color: #3D2E1F; margin: 0; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif;">${translations.qrCodes}</h3>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="color: #5C4A3A; margin: 0; font-size: 13px; font-family: Arial, sans-serif; text-align: ${textAlign};">
                      📱 ${translations.instructions}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 12px 0;">
                    ${qrCodesHtml}
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FFF9E6; border-radius: 8px; border: 1px solid #E6D174;">
                      <tr>
                        <td align="center" style="padding: 12px 16px;">
                          <p style="color: #8B6914; margin: 0; font-size: 12px; font-weight: 600; font-family: Arial, sans-serif;">
                            ⚠️ ${translations.validOnly}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 16px; border-top: 2px dashed #E8DED0;">
              <!-- Get Directions Button -->
              <a href="https://maps.app.goo.gl/g4qJ4mM9ZVqg323t8" target="_blank" style="display: inline-block; background-color: #8B7355; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; margin-bottom: 16px;">
                📍 ${isArabic ? 'احصل على الاتجاهات' : 'Get Directions'}
              </a>
              <p style="color: #5C4A3A; margin: 0 0 6px; font-size: 13px; font-weight: 600; font-family: Arial, sans-serif;">${translations.address}</p>
              <p style="color: #8B7355; margin: 0 0 8px; font-size: 11px; font-family: Arial, sans-serif;">
                © ${new Date().getFullYear()} Souq Almufaijer. ${isArabic ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
              </p>
              <!-- AYN Branding -->
              <p style="color: #8B7355; margin: 0; font-size: 10px; font-family: Arial, sans-serif;">
                Powered by <span style="font-weight: 600; color: #3D2E1F;">AYN</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// Send email with retry logic
async function sendEmailWithRetry(
  supabase: any,
  resend: Resend,
  booking: any,
  tickets: any[],
  emailQueueId: string | null,
  isArabic: boolean
): Promise<{ success: boolean; error?: string }> {
  const emailHtml = generateEmailTemplate(booking, tickets, isArabic, LOGO_BASE64);
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

      await supabase
        .from("bookings")
        .update({ confirmation_email_sent: true })
        .eq("id", booking.id);

      return { success: true };

    } catch (error: any) {
      lastError = error.message || String(error);
      console.error(`❌ Attempt ${attempt} failed:`, lastError);

      if (emailQueueId) {
        await updateEmailQueueError(supabase, emailQueueId, lastError, attempt);
      }

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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY not configured");
      throw new Error("Email service not configured: RESEND_API_KEY missing");
    }

    const resend = new Resend(resendApiKey);
    console.log("✅ Resend client initialized");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("*")
      .eq("booking_id", bookingId);

    if (ticketsError) {
      console.error("Tickets fetch error:", ticketsError);
    }

    console.log(`🎟️ Tickets found: ${tickets?.length || 0}`);

    const isArabic = booking.language === "ar";

    // Skip email queue insert to avoid constraint error, send directly
    const result = await sendEmailWithRetry(
      supabase,
      resend,
      booking,
      tickets || [],
      null,
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
