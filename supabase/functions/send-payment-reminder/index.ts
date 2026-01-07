import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentReminderRequest {
  bookingId: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Warm, heritage-themed payment reminder email template
const generateReminderTemplate = (booking: any, isArabic: boolean, paymentUrl: string) => {
  const direction = isArabic ? "rtl" : "ltr";
  const textAlign = isArabic ? "right" : "left";

  const visitDate = new Date(booking.visit_date);
  const formattedDate = visitDate.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const translations = {
    subject: isArabic ? "تذكير ودي لإتمام حجزك" : "Complete Your Reservation",
    title: isArabic ? "تذكير ودي" : "Friendly Reminder",
    subtitle: isArabic ? "لإتمام حجزك" : "Complete Your Booking",
    greeting: isArabic ? `مرحباً ${booking.customer_name}،` : `Hello ${booking.customer_name},`,
    message: isArabic 
      ? "يسعدنا إتمام حجزك! نود تذكيرك بإكمال عملية الدفع لتأكيد زيارتك المميزة إلى سوق المفيجر."
      : "We're excited to welcome you! Please complete your payment to confirm your upcoming visit to Souq Almufaijer.",
    bookingRef: isArabic ? "رقم الحجز" : "Booking Reference",
    visitDate: isArabic ? "تاريخ الزيارة" : "Visit Date",
    visitTime: isArabic ? "وقت الزيارة" : "Visit Time",
    amountDue: isArabic ? "المبلغ المستحق" : "Amount Due",
    note: isArabic 
      ? "يرجى إتمام الدفع قبل موعد الزيارة للحفاظ على حجزك"
      : "Please complete your payment before your visit date to secure your reservation",
    payNow: isArabic ? "ادفع الآن" : "Pay Now",
    contact: isArabic ? "تواصل معنا" : "Contact Us",
    helpText: isArabic 
      ? "إذا كنت بحاجة للمساعدة أو لديك أي استفسار، لا تتردد في التواصل معنا."
      : "If you need help or have any questions, don't hesitate to contact us.",
    footer: isArabic ? "سوق المفيجر - التراث الأصيل" : "Souq Almufaijer - Authentic Heritage",
  };

  return `
<!DOCTYPE html>
<html dir="${direction}" lang="${isArabic ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${translations.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF6F1; direction: ${direction}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF6F1; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(92, 74, 58, 0.12);">
          
          <!-- Heritage Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%); padding: 40px 30px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="color: #C9A86C; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">
                      ${isArabic ? 'سوق المفيجر' : 'SOUQ ALMUFAIJER'}
                    </p>
                    <h1 style="color: #FFFFFF; font-size: 28px; margin: 0 0 8px 0; font-weight: 700;">
                      ${translations.title}
                    </h1>
                    <p style="color: #E8DED0; font-size: 16px; margin: 0;">
                      ${translations.subtitle}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #3D2E1F; font-size: 18px; margin: 0 0 20px 0; text-align: ${textAlign}; line-height: 1.6; font-weight: 500;">
                ${translations.greeting}
              </p>
              <p style="color: #5C4A3A; font-size: 16px; margin: 0 0 30px 0; text-align: ${textAlign}; line-height: 1.7;">
                ${translations.message}
              </p>

              <!-- Booking Summary Card -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF6F1; border-radius: 12px; border: 1px solid #E8DED0; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E8DED0;">
                          <p style="color: #8B7355; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; text-align: ${textAlign};">
                            ${translations.bookingRef}
                          </p>
                          <p style="color: #3D2E1F; font-size: 22px; font-weight: 700; margin: 0; font-family: 'Courier New', monospace; letter-spacing: 2px; text-align: ${textAlign};">
                            ${booking.booking_reference}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #E8DED0;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td width="50%" style="text-align: ${textAlign}; padding-${isArabic ? 'left' : 'right'}: 10px;">
                                <p style="color: #8B7355; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">
                                  ${translations.visitDate}
                                </p>
                                <p style="color: #3D2E1F; font-size: 15px; font-weight: 600; margin: 0;">
                                  ${formattedDate}
                                </p>
                              </td>
                              <td width="50%" style="text-align: ${textAlign}; padding-${isArabic ? 'right' : 'left'}: 10px;">
                                <p style="color: #8B7355; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">
                                  ${translations.visitTime}
                                </p>
                                <p style="color: #3D2E1F; font-size: 15px; font-weight: 600; margin: 0;">
                                  ${booking.visit_time}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0 5px 0;">
                          <p style="color: #8B7355; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; text-align: ${textAlign};">
                            ${translations.amountDue}
                          </p>
                          <p style="color: #5C4A3A; font-size: 32px; font-weight: 800; margin: 0; text-align: ${textAlign};">
                            ${booking.total_amount} <span style="font-size: 16px; font-weight: 600; color: #8B7355;">SAR</span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Pay Now Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" target="_blank" style="
                      display: inline-block;
                      background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%);
                      color: #FFFFFF;
                      font-size: 18px;
                      font-weight: 700;
                      padding: 18px 50px;
                      border-radius: 12px;
                      text-decoration: none;
                      box-shadow: 0 4px 15px rgba(92, 74, 58, 0.3);
                    ">${translations.payNow}</a>
                  </td>
                </tr>
              </table>

              <!-- Soft Notice Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FEF3C7; border-radius: 10px; border: 1px solid #FCD34D; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="color: #92400E; font-size: 14px; margin: 0; line-height: 1.6; text-align: ${textAlign};">
                      ${translations.note}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Help Text -->
              <p style="color: #8B7355; font-size: 14px; margin: 0; text-align: ${textAlign}; line-height: 1.6;">
                ${translations.helpText}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #3D2E1F; padding: 30px; text-align: center;">
              <p style="color: #A89585; font-size: 14px; margin: 0 0 10px 0;">
                ${translations.contact}: info@almufaijer.com
              </p>
              <p style="color: #C9A86C; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
                ${translations.footer}
              </p>
              <p style="color: #8B7355; font-size: 11px; margin: 0;">
                <a href="https://aynn.io" style="color: #8B7355; text-decoration: none;">Powered by AYN</a>
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

const handler = async (req: Request): Promise<Response> => {
  console.log("Payment reminder function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { bookingId }: PaymentReminderRequest = await req.json();
    console.log("Sending payment reminder for booking:", bookingId);

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking ID required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Only send reminder for pending payments
    if (booking.payment_status !== 'pending') {
      console.log("Booking already paid, skipping reminder");
      return new Response(
        JSON.stringify({ success: false, error: "Booking already paid" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isArabic = booking.language === 'ar';
    const subject = isArabic 
      ? `⏰ تذكير: أكمل دفع حجزك #${booking.booking_reference}` 
      : `⏰ Reminder: Complete Your Payment #${booking.booking_reference}`;

    // Generate payment URL - use production domain
    const paymentUrl = `https://almufaijer.com/pay/${bookingId}`;
    
    const html = generateReminderTemplate(booking, isArabic, paymentUrl);

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Souq Almufaijer <noreply@almufaijer.com>",
      to: [booking.customer_email],
      subject,
      html,
    });

    if (emailError) {
      console.error("Failed to send reminder email:", emailError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Payment reminder sent successfully:", emailData);

    // Update booking to track reminder sent
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ 
        reminder_email_sent: true,
        last_email_sent_at: new Date().toISOString()
      })
      .eq("id", bookingId);

    if (updateError) {
      console.warn("Failed to update reminder tracking:", updateError);
    }

    // Log to email queue
    await supabase.from("email_queue").insert({
      booking_id: bookingId,
      to_email: booking.customer_email,
      to_name: booking.customer_name,
      email_type: "payment_reminder",
      subject,
      body_html: html,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in payment reminder function:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
