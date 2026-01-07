import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VIPEmailRequest {
  contactId?: string;
  contactEmail: string;
  contactName: string;
  preferredLanguage: 'ar' | 'en';
  templateType: string;
  subject: string;
  messageBody: string;
  offerDetails?: string;
  eventDate?: string;
  eventTime?: string;
}

// Generate tracking pixel URL
const getTrackingPixelUrl = (trackingId: string): string => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  return `${supabaseUrl}/functions/v1/track-email-open/${trackingId}.gif`;
};

// Professional VIP email template
const generateVIPEmailHTML = (
  language: 'ar' | 'en',
  name: string,
  subject: string,
  messageBody: string,
  offerDetails?: string,
  eventDate?: string,
  eventTime?: string
): string => {
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  
  const greeting = isArabic ? `حضرة ${name} المحترم/ة،` : `Dear ${name},`;
  const regardsText = isArabic ? 'مع أطيب التحيات،' : 'With warm regards,';
  const teamText = isArabic ? 'فريق سوق المفيجر' : 'Souq Almufaijer Team';
  const locationText = isArabic ? 'قرية المفيجر التراثية | الرياض، المملكة العربية السعودية' : 'Almufaijer Heritage Village | Riyadh, Saudi Arabia';
  const contactText = isArabic ? 'للتنسيق والاستفسارات:' : 'For coordination and inquiries:';
  const dateLabel = isArabic ? 'التاريخ:' : 'Date:';
  const timeLabel = isArabic ? 'الوقت:' : 'Time:';

  return `
<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5F1E8; direction: ${dir};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 30px rgba(139, 111, 71, 0.2);">
          
          <!-- Luxury Header with Gold Accent -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B6F47 0%, #5C4A32 100%); padding: 0;">
              <!-- Gold Top Accent -->
              <div style="height: 4px; background: linear-gradient(90deg, #C9A962, #E8D5A3, #C9A962);"></div>
              <div style="padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 1px;">
                  ${isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}
                </h1>
                <p style="color: #C9A962; margin: 12px 0 0 0; font-size: 16px; font-weight: 500; letter-spacing: 2px;">
                  ${isArabic ? '~ دعوة خاصة ~' : '~ Special Invitation ~'}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 35px;">
              <!-- Greeting -->
              <p style="color: #4A3625; font-size: 20px; margin: 0 0 28px 0; line-height: 1.6; font-weight: 500;">
                ${greeting}
              </p>
              
              <!-- Message Body -->
              <div style="color: #5C4A32; font-size: 16px; margin: 0 0 32px 0; line-height: 1.8;">
                ${messageBody.split('\n').map(p => `<p style="margin: 0 0 16px 0;">${p}</p>`).join('')}
              </div>
              
              ${offerDetails || eventDate ? `
              <!-- Exclusive Offer Box -->
              <table role="presentation" style="width: 100%; margin-bottom: 32px;" bgcolor="#4A3625">
                <tr>
                  <td bgcolor="#4A3625" style="background-color: #4A3625; padding: 28px; border-radius: 12px; border: 1px solid #C9A962;">
                    <p style="color: #C9A962; font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                      ${isArabic ? '✨ تفاصيل العرض الخاص' : '✨ Exclusive Offer Details'}
                    </p>
                    
                    ${eventDate ? `
                    <p style="color: #FFFFFF; font-size: 16px; margin: 0 0 8px 0;">
                      <strong>${dateLabel}</strong> ${eventDate}
                    </p>
                    ` : ''}
                    
                    ${eventTime ? `
                    <p style="color: #FFFFFF; font-size: 16px; margin: 0 0 12px 0;">
                      <strong>${timeLabel}</strong> ${eventTime}
                    </p>
                    ` : ''}
                    
                    ${offerDetails ? `
                    <p style="color: #D4C5B0; font-size: 15px; margin: ${eventDate || eventTime ? '16px' : '0'} 0 0 0; line-height: 1.7; border-top: ${eventDate || eventTime ? '1px solid rgba(255,255,255,0.2)' : 'none'}; padding-top: ${eventDate || eventTime ? '16px' : '0'};">
                      ${offerDetails}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Contact Info -->
              <p style="color: #5C4A32; font-size: 15px; margin: 0 0 8px 0;">
                ${contactText}
              </p>
              <p style="margin: 0 0 32px 0;">
                <a href="tel:+966501018811" style="color: #8B6F47; font-weight: 600; text-decoration: none;">+966 50 101 8811</a>
                <span style="color: #999; margin: 0 8px;">|</span>
                <a href="mailto:vip@almufaijer.com" style="color: #8B6F47; font-weight: 600; text-decoration: none;">vip@almufaijer.com</a>
              </p>
              
              <!-- Signature -->
              <p style="color: #5C4A32; font-size: 16px; margin: 0 0 6px 0; line-height: 1.6;">
                ${regardsText}
              </p>
              <p style="color: #4A3625; font-size: 18px; font-weight: 600; margin: 0;">
                ${teamText}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #4A3625; padding: 24px 30px; text-align: center;">
              <p style="color: #C9A962; font-size: 14px; margin: 0 0 4px 0; font-weight: 500;">
                ${isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}
              </p>
              <p style="color: #A89880; font-size: 12px; margin: 0;">
                ${locationText}
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

// Wrapper to add tracking pixel
const addTrackingPixel = (html: string, trackingId: string): string => {
  const trackingUrl = getTrackingPixelUrl(trackingId);
  const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  return html.replace('</body>', `${trackingPixel}</body>`);
};

const handler = async (req: Request): Promise<Response> => {
  console.log("VIP Invitation function called");
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let sentByUserId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      sentByUserId = user?.id || null;
    }

    const body = await req.json();
    const { 
      contactId, 
      contactEmail, 
      contactName, 
      preferredLanguage = 'ar',
      templateType,
      subject,
      messageBody,
      offerDetails,
      eventDate,
      eventTime
    } = body as VIPEmailRequest;

    console.log(`Sending VIP invitation to: ${contactEmail}`);

    // Generate tracking ID for this email
    const trackingId = crypto.randomUUID();

    // Generate email HTML with tracking pixel
    let emailHtml = generateVIPEmailHTML(
      preferredLanguage,
      contactName,
      subject,
      messageBody,
      offerDetails,
      eventDate,
      eventTime
    );
    emailHtml = addTrackingPixel(emailHtml, trackingId);

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Souq Almufaijer VIP <vip@almufaijer.com>",
      to: [contactEmail],
      subject: subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      
      // Log failed attempt
      await supabase.from("vip_email_logs").insert({
        contact_id: contactId || null,
        contact_email: contactEmail,
        contact_name: contactName,
        template_type: templateType,
        subject: subject,
        status: "failed",
        error_message: emailError.message,
        sent_by: sentByUserId,
      });

      return new Response(
        JSON.stringify({ success: false, error: emailError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", emailData);

    // Log successful send with tracking ID
    await supabase.from("vip_email_logs").insert({
      contact_id: contactId || null,
      contact_email: contactEmail,
      contact_name: contactName,
      template_type: templateType,
      subject: subject,
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_by: sentByUserId,
      tracking_id: trackingId,
    });

    // Update contact's last_contacted_at if contactId provided
    if (contactId) {
      await supabase
        .from("vip_contacts")
        .update({ 
          last_contacted_at: new Date().toISOString(),
          status: 'invited'
        })
        .eq("id", contactId);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: emailData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in send-vip-invitation:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
