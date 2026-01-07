import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConsolidatedReminderRequest {
  customerEmail: string;
}

interface PendingBooking {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  visit_date: string;
  visit_time: string;
  adult_count: number;
  child_count: number;
  senior_count: number | null;
  total_amount: number;
  language: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const generateConsolidatedTemplate = (
  bookings: PendingBooking[],
  isArabic: boolean
) => {
  const direction = isArabic ? "rtl" : "ltr";
  const textAlign = isArabic ? "right" : "left";
  const customerName = bookings[0]?.customer_name || (isArabic ? "عميلنا الكريم" : "Valued Customer");
  const totalAmount = bookings.reduce((sum, b) => sum + b.total_amount, 0);

  const translations = {
    subject: isArabic 
      ? `⏰ تذكير: لديك ${bookings.length} حجز${bookings.length > 1 ? "ات" : ""} معلق${bookings.length > 1 ? "ة" : ""}`
      : `⏰ Reminder: You have ${bookings.length} pending booking${bookings.length > 1 ? "s" : ""}`,
    title: isArabic ? "تذكير ودي" : "Friendly Reminder",
    subtitle: isArabic 
      ? `لديك ${bookings.length} حجز${bookings.length > 1 ? "ات" : ""} معلق${bookings.length > 1 ? "ة" : ""}`
      : `You have ${bookings.length} pending booking${bookings.length > 1 ? "s" : ""}`,
    greeting: isArabic ? `مرحباً ${customerName}،` : `Hello ${customerName},`,
    message: isArabic 
      ? "يسعدنا إتمام حجوزاتك! يرجى إكمال عملية الدفع لتأكيد زياراتك المميزة إلى سوق المفيجر."
      : "We're excited to welcome you! Please complete your payment to confirm your upcoming visits to Souq Almufaijer.",
    bookingRef: isArabic ? "رقم الحجز" : "Booking",
    visitDate: isArabic ? "التاريخ" : "Date",
    amount: isArabic ? "المبلغ" : "Amount",
    tickets: isArabic ? "التذاكر" : "Tickets",
    payNow: isArabic ? "ادفع الآن" : "Pay Now",
    totalDue: isArabic ? "الإجمالي المستحق" : "Total Due",
    adults: isArabic ? "كبار" : "Adults",
    children: isArabic ? "أطفال" : "Children",
    note: isArabic 
      ? "يرجى إتمام الدفع قبل موعد الزيارة للحفاظ على حجوزاتك"
      : "Please complete your payment before your visit date to secure your reservations",
    contact: isArabic ? "تواصل معنا" : "Contact Us",
    helpText: isArabic 
      ? "إذا كنت بحاجة للمساعدة أو لديك أي استفسار، لا تتردد في التواصل معنا."
      : "If you need help or have any questions, don't hesitate to contact us.",
    footer: isArabic ? "سوق المفيجر - التراث الأصيل" : "Souq Almufaijer - Authentic Heritage",
  };

  const bookingRows = bookings.map((booking) => {
    const visitDate = new Date(booking.visit_date);
    const formattedDate = visitDate.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      calendar: 'gregory',
    });
    const formattedTime = booking.visit_time?.slice(0, 5) || booking.visit_time;
    const paymentUrl = `https://almufaijer.com/pay/${booking.id}`;
    
    const ticketParts = [];
    if (booking.adult_count > 0) {
      ticketParts.push(`${booking.adult_count} ${translations.adults}`);
    }
    if (booking.child_count > 0) {
      ticketParts.push(`${booking.child_count} ${translations.children}`);
    }
    const ticketSummary = ticketParts.join(', ') || '1 ticket';

    return `
      <tr>
        <td style="padding: 20px; border-bottom: 1px solid #E8DED0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="vertical-align: top; width: 70%;">
                <p style="color: #3D2E1F; font-size: 18px; font-weight: 700; margin: 0 0 8px 0; font-family: 'Courier New', monospace; letter-spacing: 1px; text-align: ${textAlign};">
                  ${booking.booking_reference}
                </p>
                <p style="color: #5C4A3A; font-size: 14px; margin: 0 0 4px 0; text-align: ${textAlign};">
                  📅 ${formattedDate} · ${formattedTime}
                </p>
                <p style="color: #8B7355; font-size: 13px; margin: 0; text-align: ${textAlign};">
                  🎫 ${ticketSummary}
                </p>
              </td>
              <td style="vertical-align: middle; text-align: ${isArabic ? 'left' : 'right'}; width: 30%;">
                <p style="color: #3D2E1F; font-size: 20px; font-weight: 800; margin: 0 0 10px 0;">
                  ${booking.total_amount} <span style="font-size: 12px; color: #5C4A3A;">SAR</span>
                </p>
                <a href="${paymentUrl}" target="_blank" style="
                  display: inline-block;
                  background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%);
                  color: #FFFFFF;
                  font-size: 13px;
                  font-weight: 600;
                  padding: 10px 20px;
                  border-radius: 8px;
                  text-decoration: none;
                ">${translations.payNow}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

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
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF6F1; direction: ${direction};">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF6F1; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(92, 74, 58, 0.12);">
          
          <!-- Heritage Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%); padding: 40px 30px; text-align: center;">
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

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px 20px 30px;">
              <p style="color: #3D2E1F; font-size: 18px; margin: 0 0 20px 0; text-align: ${textAlign}; line-height: 1.6; font-weight: 500;">
                ${translations.greeting}
              </p>
              <p style="color: #5C4A3A; font-size: 16px; margin: 0 0 30px 0; text-align: ${textAlign}; line-height: 1.7;">
                ${translations.message}
              </p>
            </td>
          </tr>

          <!-- Bookings List -->
          <tr>
            <td style="padding: 0 30px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF6F1; border-radius: 12px; border: 1px solid #E8DED0;">
                ${bookingRows}
                <!-- Total Row -->
                <tr>
                  <td style="padding: 20px; background-color: #4A3625;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: ${textAlign};">
                          <p style="color: #C9A86C; font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">
                            ${translations.totalDue}
                          </p>
                        </td>
                        <td style="text-align: ${isArabic ? 'left' : 'right'};">
                          <p style="color: #FFFFFF; font-size: 28px; font-weight: 800; margin: 0;">
                            ${totalAmount} <span style="font-size: 14px; color: #C9A86C;">SAR</span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notice & Help -->
          <tr>
            <td style="padding: 30px;">
              <!-- Soft Notice Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FEF3C7; border-radius: 10px; border: 1px solid #FCD34D; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="color: #92400E; font-size: 14px; margin: 0; line-height: 1.6; text-align: ${textAlign};">
                      ${translations.note}
                    </p>
                  </td>
                </tr>
              </table>
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
  console.log("Consolidated reminder function invoked");

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

    const { customerEmail }: ConsolidatedReminderRequest = await req.json();
    console.log("Sending consolidated reminder for customer:", customerEmail);

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "Customer email required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch ALL pending bookings for this customer
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, booking_reference, customer_name, customer_email, visit_date, visit_time, adult_count, child_count, senior_count, total_amount, language")
      .eq("customer_email", customerEmail)
      .eq("payment_status", "pending")
      .order("visit_date", { ascending: true });

    if (bookingsError || !bookings || bookings.length === 0) {
      console.error("No pending bookings found:", bookingsError);
      return new Response(
        JSON.stringify({ success: false, error: "No pending bookings found for this customer" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${bookings.length} pending bookings for ${customerEmail}`);

    // Use the language from the first booking
    const isArabic = bookings[0].language === 'ar';
    
    const subject = isArabic 
      ? `⏰ تذكير: لديك ${bookings.length} حجز${bookings.length > 1 ? "ات" : ""} معلق${bookings.length > 1 ? "ة" : ""}`
      : `⏰ Reminder: You have ${bookings.length} pending booking${bookings.length > 1 ? "s" : ""}`;

    const html = generateConsolidatedTemplate(bookings as PendingBooking[], isArabic);

    // Send ONE email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Souq Almufaijer <noreply@almufaijer.com>",
      to: [customerEmail],
      subject,
      html,
    });

    if (emailError) {
      console.error("Failed to send consolidated reminder:", emailError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Consolidated reminder sent successfully:", emailData);

    // Update ALL bookings to track reminder sent
    const bookingIds = bookings.map(b => b.id);
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ 
        reminder_email_sent: true,
        last_email_sent_at: new Date().toISOString()
      })
      .in("id", bookingIds);

    if (updateError) {
      console.warn("Failed to update reminder tracking:", updateError);
    }

    // Log to email queue (one entry for the consolidated email)
    await supabase.from("email_queue").insert({
      booking_id: bookings[0].id, // Reference first booking
      to_email: customerEmail,
      to_name: bookings[0].customer_name,
      email_type: "consolidated_payment_reminder",
      subject,
      body_html: html,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailData?.id,
        bookingsCount: bookings.length,
        bookingIds 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in consolidated reminder function:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
