import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const Resend = (await import("https://esm.sh/resend@2.0.0")).Resend;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnnouncementRequest {
  testEmail?: string;
  sendToAll?: boolean;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const generateEmailTemplate = (language: string, customerName: string): string => {
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  
  return `
<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isArabic ? 'تحديث ساعات العمل - سوق المفيجر' : 'Operating Hours Update - Souq Almufaijer'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5F1E8; direction: ${dir};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(139, 111, 71, 0.15);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B6F47 0%, #6B5A3A 100%); padding: 40px 30px; text-align: center;">
              <img src="https://hekgkfdunwpxqbrotfpn.supabase.co/storage/v1/object/public/assets/logo-white-email.png" alt="Souq Almufaijer" style="height: 60px; margin-bottom: 16px;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                ${isArabic ? 'تحديث ساعات العمل' : 'Operating Hours Update'}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #4A3625; font-size: 18px; margin: 0 0 24px 0; line-height: 1.6;">
                ${isArabic ? `زائرنا الكريم ${customerName}،` : `Dear ${customerName},`}
              </p>
              
              <p style="color: #5C4A32; font-size: 16px; margin: 0 0 30px 0; line-height: 1.7;">
                ${isArabic 
                  ? 'نود إعلامكم بساعات العمل في موقع سوق المفيجر التراثي:'
                  : 'We would like to inform you about our operating hours at Souq Almufaijer Heritage Site:'}
              </p>
              
              <!-- Hours Box -->
              <table role="presentation" style="width: 100%; background: linear-gradient(135deg, #F5F1E8 0%, #E8E0D0 100%); border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <div style="margin-bottom: 16px;">
                      <span style="font-size: 28px;">📅</span>
                      <p style="color: #8B6F47; font-size: 18px; font-weight: 600; margin: 8px 0 0 0;">
                        ${isArabic ? 'مفتوح يومياً' : 'Open Daily'}
                      </p>
                      <p style="color: #6B5A3A; font-size: 14px; margin: 4px 0 0 0;">
                        ${isArabic ? '(بما في ذلك الجمعة)' : '(Including Fridays)'}
                      </p>
                    </div>
                    <div style="border-top: 1px solid #D4C5B0; padding-top: 16px;">
                      <span style="font-size: 28px;">⏰</span>
                      <p style="color: #4A3625; font-size: 24px; font-weight: 700; margin: 8px 0 0 0;">
                        ${isArabic ? '٣:٠٠ م - ١٢:٠٠ ص' : '3:00 PM - 12:00 AM'}
                      </p>
                      <p style="color: #6B5A3A; font-size: 14px; margin: 4px 0 0 0;">
                        ${isArabic ? '(منتصف الليل)' : '(Midnight)'}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="color: #5C4A32; font-size: 16px; margin: 0 0 24px 0; line-height: 1.7;">
                ${isArabic 
                  ? 'تذاكركم صالحة في أي وقت خلال هذه الساعات في تاريخ زيارتكم المحدد.'
                  : 'Your tickets are valid anytime during these hours on your selected visit date.'}
              </p>
              
              <p style="color: #5C4A32; font-size: 16px; margin: 0 0 8px 0; line-height: 1.7;">
                ${isArabic ? 'للاستفسارات، تواصلوا معنا على:' : 'If you have any questions, please contact us at:'}
              </p>
              <p style="margin: 0 0 30px 0;">
                <a href="mailto:info@almufaijer.com" style="color: #8B6F47; font-weight: 600; text-decoration: none;">info@almufaijer.com</a>
              </p>
              
              <p style="color: #4A3625; font-size: 18px; font-weight: 600; margin: 0; line-height: 1.6;">
                ${isArabic ? 'نتطلع لاستقبالكم!' : 'We look forward to welcoming you!'}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #4A3625; padding: 24px 30px; text-align: center;">
              <p style="color: #D4C5B0; font-size: 14px; margin: 0 0 8px 0;">
                ${isArabic ? 'فريق سوق المفيجر' : 'Souq Almufaijer Team'}
              </p>
              <p style="color: #A89880; font-size: 12px; margin: 0;">
                ${isArabic ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { testEmail, sendToAll }: AnnouncementRequest = await req.json();

    console.log("Announcement request:", { testEmail, sendToAll });

    if (testEmail) {
      // Send test email
      console.log("Sending test email to:", testEmail);
      
      const html = generateEmailTemplate('en', 'Test User');
      
      const { data, error } = await resend.emails.send({
        from: "Souq Almufaijer <info@almufaijer.com>",
        to: [testEmail],
        subject: "Operating Hours Update - Souq Almufaijer | تحديث ساعات العمل - سوق المفيجر",
        html: html,
      });

      if (error) {
        console.error("Failed to send test email:", error);
        throw new Error(`Failed to send test email: ${error.message}`);
      }

      console.log("Test email sent successfully:", data);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Test email sent successfully",
          emailId: data?.id 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (sendToAll) {
      // Get all confirmed bookings with unique emails
      const { data: bookings, error: fetchError } = await supabase
        .from('bookings')
        .select('customer_email, customer_name, language')
        .eq('booking_status', 'confirmed')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error("Failed to fetch bookings:", fetchError);
        throw new Error(`Failed to fetch bookings: ${fetchError.message}`);
      }

      // Deduplicate by email
      const uniqueCustomers = new Map<string, { name: string; language: string }>();
      for (const booking of bookings || []) {
        if (!uniqueCustomers.has(booking.customer_email)) {
          uniqueCustomers.set(booking.customer_email, {
            name: booking.customer_name,
            language: booking.language || 'ar'
          });
        }
      }

      console.log(`Sending announcement to ${uniqueCustomers.size} unique customers`);

      const results: { email: string; success: boolean; error?: string }[] = [];

      for (const [email, customer] of uniqueCustomers) {
        try {
          const html = generateEmailTemplate(customer.language, customer.name);
          
          const { data, error } = await resend.emails.send({
            from: "Souq Almufaijer <info@almufaijer.com>",
            to: [email],
            subject: customer.language === 'ar' 
              ? "تحديث ساعات العمل - سوق المفيجر" 
              : "Operating Hours Update - Souq Almufaijer",
            html: html,
          });

          if (error) {
            console.error(`Failed to send to ${email}:`, error);
            results.push({ email, success: false, error: error.message });
          } else {
            console.log(`Email sent to ${email}:`, data?.id);
            results.push({ email, success: true });
          }

          // Small delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Error sending to ${email}:`, err);
          results.push({ email, success: false, error: String(err) });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Sent ${successCount} emails, ${failCount} failed`,
          results 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    throw new Error("Invalid request: provide testEmail or sendToAll");

  } catch (error: unknown) {
    console.error("Error in send-hours-announcement:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
