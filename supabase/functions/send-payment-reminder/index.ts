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

// Urgent payment reminder email template - distinctly different from confirmation
const generateReminderTemplate = (booking: any, isArabic: boolean) => {
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
    subject: isArabic ? "⏰ تذكير: أكمل دفع حجزك" : "⏰ Reminder: Complete Your Booking Payment",
    title: isArabic ? "لم يتم استلام الدفع بعد" : "Payment Not Yet Received",
    greeting: isArabic ? `مرحباً ${booking.customer_name}،` : `Hello ${booking.customer_name},`,
    message: isArabic 
      ? "نلاحظ أن حجزك لا يزال في انتظار الدفع. يرجى إتمام الدفع للحفاظ على حجزك."
      : "We noticed your booking is still awaiting payment. Please complete your payment to secure your reservation.",
    bookingRef: isArabic ? "رقم الحجز" : "Booking Reference",
    visitDate: isArabic ? "تاريخ الزيارة" : "Visit Date",
    amountDue: isArabic ? "المبلغ المستحق" : "Amount Due",
    urgentNote: isArabic 
      ? "⚠️ تحذير: قد يتم إلغاء الحجز تلقائياً إذا لم يتم الدفع قبل موعد الزيارة."
      : "⚠️ Warning: Your booking may be automatically cancelled if payment is not received before your visit date.",
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
  <title>${translations.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FEF3C7; direction: ${direction};">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FEF3C7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(180, 83, 9, 0.15);">
          
          <!-- Urgent Header - Orange/Amber theme -->
          <tr>
            <td style="background: linear-gradient(135deg, #D97706 0%, #B45309 100%); padding: 40px 30px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Warning Icon -->
                    <div style="width: 80px; height: 80px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 48px;">⏰</span>
                    </div>
                    <h1 style="color: #FFFFFF; font-size: 28px; margin: 0 0 10px 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      ${translations.title}
                    </h1>
                    <p style="color: #FDE68A; font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">
                      ${isArabic ? 'تذكير بالدفع' : 'PAYMENT REMINDER'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #1F2937; font-size: 18px; margin: 0 0 20px 0; text-align: ${textAlign}; line-height: 1.6;">
                ${translations.greeting}
              </p>
              <p style="color: #4B5563; font-size: 16px; margin: 0 0 30px 0; text-align: ${textAlign}; line-height: 1.7;">
                ${translations.message}
              </p>

              <!-- Booking Summary Card -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border-radius: 12px; border: 2px solid #F59E0B; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px dashed #F59E0B;">
                          <p style="color: #92400E; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; text-align: ${textAlign};">
                            ${translations.bookingRef}
                          </p>
                          <p style="color: #B45309; font-size: 24px; font-weight: 700; margin: 0; font-family: monospace; letter-spacing: 3px; text-align: ${textAlign};">
                            ${booking.booking_reference}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px dashed #F59E0B;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="text-align: ${textAlign};">
                                <p style="color: #92400E; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">
                                  ${translations.visitDate}
                                </p>
                                <p style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0;">
                                  📅 ${formattedDate}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0 5px 0;">
                          <p style="color: #92400E; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; text-align: ${textAlign};">
                            ${translations.amountDue}
                          </p>
                          <p style="color: #B45309; font-size: 36px; font-weight: 800; margin: 0; text-align: ${textAlign};">
                            ${booking.total_amount} <span style="font-size: 18px; font-weight: 600;">SAR</span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Urgent Warning Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FEE2E2; border-radius: 12px; border-left: 4px solid #DC2626; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #991B1B; font-size: 14px; margin: 0; line-height: 1.6; text-align: ${textAlign}; font-weight: 500;">
                      ${translations.urgentNote}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Help Text -->
              <p style="color: #6B7280; font-size: 14px; margin: 0; text-align: ${textAlign}; line-height: 1.6;">
                ${translations.helpText}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1F2937; padding: 30px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 10px 0;">
                ${translations.contact}: info@almufaijer.com
              </p>
              <p style="color: #D97706; font-size: 16px; font-weight: 600; margin: 0;">
                ${translations.footer}
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

    const html = generateReminderTemplate(booking, isArabic);

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
