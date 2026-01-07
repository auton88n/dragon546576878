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

// Simple email template with fixed CSS (no dynamic property names)
const generateEmailTemplate = (
  booking: any,
  tickets: any[],
  isArabic: boolean
) => {
  const direction = isArabic ? "rtl" : "ltr";
  const textAlign = isArabic ? "right" : "left";
  const textAlignOpposite = isArabic ? "left" : "right";
  
  // Pre-compute padding styles (avoiding dynamic property names)
  const paddingStart = isArabic ? "padding-right: 12px;" : "padding-left: 12px;";
  const marginStart = isArabic ? "margin-right: 8px;" : "margin-left: 8px;";
  const borderStart = isArabic ? "border-right: 1px solid #E8DED0;" : "border-left: 1px solid #E8DED0;";
  
  // Payment status awareness
  const isPending = booking.payment_status === 'pending';
  
  const translations = {
    title: isPending 
      ? (isArabic ? "تم حفظ الحجز - في انتظار الدفع" : "Reservation Saved - Payment Pending")
      : (isArabic ? "تأكيد الحجز" : "Booking Confirmation"),
    greeting: isArabic ? `مرحباً ${booking.customer_name}،` : `Hello ${booking.customer_name},`,
    thankYou: isPending
      ? (isArabic 
          ? "شكراً لحجزك في سوق المفيجر! تم حفظ حجزك وهو في انتظار إتمام الدفع."
          : "Thank you for booking at Souq Almufaijer! Your reservation has been saved and is awaiting payment.")
      : (isArabic 
          ? "شكراً لحجزك في سوق المفيجر! نحن سعداء باستضافتك في رحلة عبر التراث الأصيل."
          : "Thank you for booking at Souq Almufaijer! We're delighted to host you on a journey through authentic heritage."),
    bookingRef: isArabic ? "رقم الحجز" : "Booking Reference",
    visitDetails: isArabic ? "تفاصيل الزيارة" : "Visit Details",
    date: isArabic ? "التاريخ" : "Date",
    validAllDay: isArabic ? "صالحة طوال اليوم" : "Valid All Day",
    operatingHours: isArabic ? "(٣ م - ١٢ ص منتصف الليل)" : "(3 PM - 12 AM Midnight)",
    tickets: isArabic ? "التذاكر" : "Tickets",
    adult: isArabic ? "بالغ" : "Adult",
    child: isArabic ? "طفل" : "Child",
    senior: isArabic ? "كبير السن" : "Senior",
    total: isPending 
      ? (isArabic ? "المبلغ المستحق" : "Amount Due")
      : (isArabic ? "المجموع" : "Total"),
    qrCodes: isArabic ? "تذاكر الدخول" : "Entry Tickets",
    instructions: isArabic 
      ? "قم بإظهار هذه التذاكر عند البوابة"
      : "Present these tickets at the entrance gate",
    validOnly: isPending
      ? (isArabic 
          ? "التذاكر صالحة بعد إتمام الدفع"
          : "Tickets will be valid after payment is completed")
      : (isArabic 
          ? "صالحة طوال اليوم - تعال في أي وقت خلال ساعات العمل"
          : "Valid all day - come anytime during operating hours"),
    seeYouSoon: isArabic ? "نراكم قريباً!" : "See you soon!",
    contactUs: isArabic ? "تواصل معنا" : "Contact Us",
    email: "info@almufaijer.com",
    address: isArabic ? "سوق المفيجر، المملكة العربية السعودية" : "Souq Almufaijer, Kingdom of Saudi Arabia",
    confirmed: isPending 
      ? (isArabic ? "حجز محفوظ - في انتظار الدفع" : "RESERVATION PENDING")
      : (isArabic ? "تم تأكيد الحجز" : "BOOKING CONFIRMED"),
    pendingNote: isPending
      ? (isArabic 
          ? "يرجى إتمام الدفع لتأكيد حجزك. سيتم إلغاء الحجز تلقائياً إذا لم يتم الدفع."
          : "Please complete payment to confirm your reservation. Booking will be automatically cancelled if payment is not received.")
      : "",
  };

  // Format date only (no time - tickets valid all day)
  const visitDate = new Date(booking.visit_date);
  const formattedDate = visitDate.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? (isArabic ? 'م' : 'PM') : (isArabic ? 'ص' : 'AM');
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  // Header colors based on payment status
  const headerBg = isPending ? "#B45309" : "#5C4A3A"; // amber-700 vs heritage brown
  const headerAccent = isPending ? "#FCD34D" : "#C9A86C"; // amber-300 vs gold

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
          <table cellpadding="0" cellspacing="0" border="0" width="220" style="background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E8DED0;">
            <tr>
              <td align="center" style="padding: 16px 16px 12px 16px;">
                <span style="display: inline-block; background-color: #5C4A3A; color: #FFFFFF; padding: 6px 12px; border-radius: 16px; font-size: 11px; font-weight: 600; font-family: Arial, sans-serif;">
                  ${ticketType} #${index + 1}
                </span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 16px 12px 16px;">
                <img src="${ticket.qr_code_url}" alt="QR Code" width="180" height="180" style="display: block; border: 2px solid #C9A86C; border-radius: 8px;" />
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
          
          <!-- Header - Text-based branding (no images for best email compatibility) -->
          <tr>
            <td align="center" style="background-color: ${headerBg}; padding: 32px 24px; border-radius: 16px 16px 0 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 4px;">
                    <!-- Arabic brand name -->
                    <h1 style="color: ${headerAccent}; font-size: 32px; margin: 0; font-weight: 700; font-family: 'Times New Roman', serif;">سوق المفيجر</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <!-- English brand name -->
                    <p style="color: #D4C5B0; font-size: 12px; margin: 0; letter-spacing: 3px; text-transform: uppercase; font-family: Arial, sans-serif;">SOUQ ALMUFAIJER</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <!-- Decorative gold line -->
                    <div style="width: 60px; height: 2px; background-color: ${headerAccent}; margin: 0 auto;"></div>
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
              <p style="color: #5C4A3A; margin: 0 0 16px; line-height: 1.6; font-size: 15px; font-family: Arial, sans-serif; text-align: ${textAlign};">${translations.thankYou}</p>
              
              ${isPending ? `
              <!-- Payment Pending Notice -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #FEF3C7; padding: 16px; border-radius: 12px; border: 2px solid #F59E0B;">
                    <p style="color: #B45309; margin: 0; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">
                      ⚠️ ${translations.pendingNote}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Booking Reference -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #FAF6F1; padding: 24px; border-radius: 12px; border: 2px solid #E8DED0;">
                    <p style="color: #3D2E1F; margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; font-family: Arial, sans-serif;">${translations.bookingRef}</p>
                    <p style="color: #3D2E1F; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; font-family: monospace;">${booking.booking_reference}</p>
                  </td>
                </tr>
              </table>
              
              <!-- Visit Details - Date Only (Valid All Day) -->
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
                          <p style="color: #666666; margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; font-family: Arial, sans-serif;">☀️ ${translations.validAllDay}</p>
                          <p style="color: #C9A86C; margin: 0; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">${translations.operatingHours}</p>
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
              <!-- AYN AI Branding -->
              <a href="https://ayn-ai.com" target="_blank" style="color: #8B7355; margin: 0; font-size: 10px; font-family: Arial, sans-serif; text-decoration: none;">
                Powered by <span style="font-weight: 600; color: #3D2E1F;">AYN AI</span>
              </a>
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
  const emailHtml = generateEmailTemplate(booking, tickets, isArabic);
  const subject = isArabic
    ? `تأكيد الحجز - ${booking.booking_reference} | سوق المفيجر`
    : `Booking Confirmation - ${booking.booking_reference} | Souq Almufaijer`;

  // Plain text fallback for Gmail safety
  const plainText = isArabic
    ? `تأكيد الحجز - سوق المفيجر\n\nمرحباً ${booking.customer_name}،\n\nرقم الحجز: ${booking.booking_reference}\nالتاريخ: ${booking.visit_date}\nصالحة طوال اليوم (9 ص - 6 م)\nعدد التذاكر: ${(booking.adult_count || 0) + (booking.child_count || 0) + (booking.senior_count || 0)}\n\nشكراً لحجزك!\n\nPowered by AYN`
    : `Booking Confirmation - Souq Almufaijer\n\nHello ${booking.customer_name},\n\nBooking Reference: ${booking.booking_reference}\nDate: ${booking.visit_date}\nValid All Day (9 AM - 6 PM)\nTickets: ${(booking.adult_count || 0) + (booking.child_count || 0) + (booking.senior_count || 0)}\n\nThank you for your booking!\n\nPowered by AYN`;

  console.log(`📧 Email HTML length: ${emailHtml.length} characters`);

  let lastError = "";
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`Attempt ${attempt}/${MAX_RETRIES} - Sending email to: ${booking.customer_email}`);
    
    try {
      const { data, error } = await resend.emails.send({
        from: "Souq Almufaijer <info@almufaijer.com>",
        to: [booking.customer_email],
        subject: subject,
        html: emailHtml,
        text: plainText,
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
        .update({ 
          confirmation_email_sent: true,
          last_email_sent_at: new Date().toISOString()
        })
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

// Rate limiting: 5 minutes cooldown between email resends
const EMAIL_COOLDOWN_MS = 5 * 60 * 1000;

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

    // Rate limiting check
    if (booking.last_email_sent_at) {
      const lastSentTime = new Date(booking.last_email_sent_at).getTime();
      const timeSinceLastEmail = Date.now() - lastSentTime;
      
      if (timeSinceLastEmail < EMAIL_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((EMAIL_COOLDOWN_MS - timeSinceLastEmail) / 1000);
        console.log(`⏳ Rate limited: ${remainingSeconds}s remaining`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "rate_limited",
            remainingSeconds,
            message: `Please wait ${Math.ceil(remainingSeconds / 60)} minutes before requesting another email`,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

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
