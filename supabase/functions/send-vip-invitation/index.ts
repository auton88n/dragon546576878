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
  // NEW: Enhanced fields
  guestAllowance?: number;
  perks?: string[];
  includeVideo?: boolean;
  enableRSVP?: boolean;
}

// Perk labels for static perks (fallback)
const perkLabels: Record<string, { en: string; ar: string }> = {
  private_tour: { en: 'Private guided tour', ar: 'جولة خاصة مع مرشد' },
  photography: { en: 'Professional photography session', ar: 'جلسة تصوير احترافية' },
  dinner: { en: 'Traditional Saudi hospitality dinner', ar: 'عشاء ضيافة سعودية تقليدية' },
  vip_seating: { en: 'VIP seating at cultural performances', ar: 'مقاعد VIP في العروض الثقافية' },
  special_gift: { en: 'Special gift from Souq Almufaijer', ar: 'هدية خاصة من سوق المفيجر' },
};

// Type for perk objects (can be string ID or full object)
type PerkInput = string | { id: string; en: string; ar: string };

// Helper to get perk label
const getPerkLabel = (perk: PerkInput, isArabic: boolean): string | null => {
  if (typeof perk === 'object') {
    return isArabic ? perk.ar : perk.en;
  }
  const label = perkLabels[perk];
  return label ? (isArabic ? label.ar : label.en) : null;
};

// Generate tracking pixel URL
const getTrackingPixelUrl = (trackingId: string): string => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  return `${supabaseUrl}/functions/v1/track-email-open/${trackingId}.gif`;
};

// Generate RSVP URL
const getRSVPUrl = (rsvpToken: string): string => {
  return `https://almufaijer.com/vip/rsvp/${rsvpToken}`;
};

// Professional VIP email template with video, perks, and RSVP
const generateVIPEmailHTML = (
  language: 'ar' | 'en',
  name: string,
  subject: string,
  messageBody: string,
  options: {
    offerDetails?: string;
    eventDate?: string;
    eventTime?: string;
    guestAllowance?: number;
    perks?: string[];
    includeVideo?: boolean;
    enableRSVP?: boolean;
    rsvpToken?: string;
  }
): string => {
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const { offerDetails, eventDate, eventTime, guestAllowance = 2, perks = [], includeVideo = true, enableRSVP = true, rsvpToken } = options;
  
  const greeting = isArabic ? `حضرة ${name} المحترم/ة،` : `Dear ${name},`;
  const regardsText = isArabic ? 'مع أطيب التحيات،' : 'With warm regards,';
  const teamText = isArabic ? 'فريق سوق المفيجر' : 'Souq Almufaijer Team';
  const locationText = isArabic ? 'قرية المفيجر التراثية | الرياض، المملكة العربية السعودية' : 'Almufaijer Heritage Village | Riyadh, Saudi Arabia';
  const contactText = isArabic ? 'للتنسيق والاستفسارات:' : 'For coordination and inquiries:';
  const dateLabel = isArabic ? 'التاريخ:' : 'Date:';
  const timeLabel = isArabic ? 'الوقت:' : 'Time:';
  
  const videoUrl = "https://hekgkfdunwpxqbrotfpn.supabase.co/storage/v1/object/public/videos/souq-almufaijer-video.mp4";
  const rsvpUrl = rsvpToken ? getRSVPUrl(rsvpToken) : '#';

  // Generate perks HTML - supports both string IDs and full perk objects
  const perksHtml = perks.length > 0 ? `
    <table role="presentation" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%); padding: 25px; border-radius: 12px;">
          <p style="color: #C9A86C; font-size: 12px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
            ${isArabic ? 'تجربتكم المميزة' : 'YOUR VIP EXPERIENCE'}
          </p>
          ${perks.map(perk => {
            const label = getPerkLabel(perk as PerkInput, isArabic);
            if (!label) return '';
            return `
              <table role="presentation" style="width: 100%; margin-bottom: 10px;">
                <tr>
                  <td style="width: 24px; vertical-align: top;">
                    <span style="color: #C9A86C; font-size: 18px;">•</span>
                  </td>
                  <td>
                    <span style="color: #FFFFFF; font-size: 15px; line-height: 1.6;">${label}</span>
                  </td>
                </tr>
              </table>
            `;
          }).join('')}
        </td>
      </tr>
    </table>
  ` : '';

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
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5F1E8; direction: ${dir}; -webkit-text-fill-color: inherit;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 30px rgba(139, 111, 71, 0.15);">
          
          <!-- Heritage Header - Matching Standard Design -->
          <tr>
            <td style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%); padding: 40px 30px; text-align: center;">
              <!-- Gold brand name -->
              <p style="color: #C9A86C; font-size: 12px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">
                ${isArabic ? 'سوق المفيجر' : 'SOUQ ALMUFAIJER'}
              </p>
              <!-- Main title -->
              <h1 style="color: #FFFFFF; margin: 0 0 12px 0; font-size: 28px; font-weight: 700;">
                ${isArabic ? 'دعوة حصرية' : 'Exclusive Invitation'}
              </h1>
              <!-- English subtitle -->
              <p style="color: #E8DED0; font-size: 11px; margin: 0 0 16px 0; letter-spacing: 3px; text-transform: uppercase;">
                ${isArabic ? 'EXCLUSIVE VIP INVITATION' : 'دعوة خاصة للشخصيات المميزة'}
              </p>
              <!-- Gold divider line -->
              <div style="width: 60px; height: 2px; background-color: #C9A86C; margin: 0 auto 16px auto;"></div>
              <!-- VIP label -->
              <p style="color: #FFFFFF; font-size: 14px; margin: 0; font-weight: 600; letter-spacing: 1px;">
                ${isArabic ? 'للشخصيات المميزة' : 'VIP'}
              </p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 35px;">
              <!-- Greeting -->
              <p style="color: #3D2E1F; font-size: 18px; margin: 0 0 24px 0; line-height: 1.6; font-weight: 500;">
                ${greeting}
              </p>
              
              <!-- Message Body -->
              <div style="color: #5C4A3A; font-size: 15px; margin: 0 0 32px 0; line-height: 1.8;">
                ${messageBody.split('\n').map(p => `<p style="margin: 0 0 16px 0;">${p}</p>`).join('')}
              </div>
              
              ${includeVideo ? `
              <!-- Video Section -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td>
                    <a href="${videoUrl}" target="_blank" style="text-decoration: none; display: block;">
                      <table role="presentation" style="width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid #E8DED0; box-shadow: 0 4px 12px rgba(92, 74, 50, 0.15);">
                        <tr>
                          <td style="background-image: url('https://almufaijer.com/images/hero-heritage-new.webp'); background-size: cover; background-position: center;">
                            <div style="background: rgba(74, 54, 37, 0.75); padding: 48px; text-align: center;">
                              <table role="presentation" style="margin: 0 auto 20px;">
                                <tr>
                                  <td style="width: 80px; height: 80px; background: rgba(255,255,255,0.25); border-radius: 40px; text-align: center; vertical-align: middle; border: 3px solid rgba(255,255,255,0.4);">
                                    <span style="font-size: 36px; color: #FFFFFF;">&#9654;</span>
                                  </td>
                                </tr>
                              </table>
                              <p style="color: #FFFFFF; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">
                                ${isArabic ? 'اكتشف سحر المفيجر' : 'Discover the Magic of Almufaijer'}
                              </p>
                              <p style="color: #E8DED0; font-size: 13px; margin: 0;">
                                ${isArabic ? 'اضغط لمشاهدة الفيديو' : 'Click to watch video'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Guest Allowance Box - Matching Standard Card Style -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #FAF6F1; padding: 25px; border-radius: 12px; text-align: center; border: 1px solid #E8DED0;">
                    <p style="color: #5C4A3A; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      ${isArabic ? 'عدد الضيوف المسموح' : 'GUEST ALLOWANCE'}
                    </p>
                    <p style="color: #3D2E1F; font-size: 22px; margin: 0; font-weight: 700;">
                      ${isArabic ? `حتى ${guestAllowance} ضيوف` : `Up to ${guestAllowance} Guests`}
                    </p>
                  </td>
                </tr>
              </table>
              
              ${perksHtml}
              
              ${(eventDate || eventTime || offerDetails) ? `
              <!-- Event Details Box - Matching Standard Card Style -->
              <table role="presentation" style="width: 100%; margin-bottom: 32px;">
                <tr>
                  <td style="background-color: #FAF6F1; padding: 25px; border-radius: 12px; border: 1px solid #E8DED0;">
                    <p style="color: #5C4A3A; font-size: 12px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      ${isArabic ? 'تفاصيل الفعالية' : 'EVENT DETAILS'}
                    </p>
                    
                    ${eventDate ? `
                    <p style="color: #3D2E1F; font-size: 16px; margin: 0 0 10px 0; font-weight: 600;">
                      <span style="color: #5C4A3A;">${dateLabel}</span> ${eventDate}
                    </p>
                    ` : ''}
                    
                    ${eventTime ? `
                    <p style="color: #3D2E1F; font-size: 16px; margin: 0; font-weight: 600;">
                      <span style="color: #5C4A3A;">${timeLabel}</span> ${eventTime}
                    </p>
                    ` : ''}
                    
                    ${offerDetails ? `
                    <p style="color: #5C4A3A; font-size: 14px; margin: ${eventDate || eventTime ? '16px' : '0'} 0 0 0; line-height: 1.7; border-top: ${eventDate || eventTime ? '1px solid #E8DED0' : 'none'}; padding-top: ${eventDate || eventTime ? '16px' : '0'};">
                      ${offerDetails}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}
              
              ${enableRSVP && rsvpToken ? `
              <!-- RSVP Button - Heritage Style -->
              <table role="presentation" style="width: 100%; margin-bottom: 32px;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${rsvpUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #5C4A3A, #4A3625); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 8px; font-size: 18px; font-weight: 700; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(92, 74, 50, 0.3);">
                      ${isArabic ? 'تأكيد الحضور' : 'Accept Invitation'}
                    </a>
                    <p style="color: #5C4A3A; font-size: 13px; margin: 16px 0 0 0;">
                      ${isArabic ? 'اضغط للتأكيد واختيار عدد المرافقين' : 'Click to confirm and select number of guests'}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Contact Info -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #FAF6F1; padding: 20px; border-radius: 12px; border: 1px solid #E8DED0; text-align: center;">
                    <p style="color: #5C4A3A; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      ${isArabic ? 'للتواصل' : 'CONTACT US'}
                    </p>
                    <p style="margin: 0;">
                      <a href="tel:+966501018811" dir="ltr" style="color: #3D2E1F; font-weight: 600; text-decoration: none; unicode-bidi: embed; display: inline-block; font-size: 15px;">+966 50 101 8811</a>
                      <span style="color: #A89585; margin: 0 10px;">|</span>
                      <a href="mailto:info@almufaijer.com" dir="ltr" style="color: #3D2E1F; font-weight: 600; text-decoration: none; unicode-bidi: embed; display: inline-block; font-size: 15px;">info@almufaijer.com</a>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Signature -->
              <p style="color: #5C4A3A; font-size: 15px; margin: 0 0 6px 0; line-height: 1.6;">
                ${regardsText}
              </p>
              <p style="color: #3D2E1F; font-size: 17px; font-weight: 600; margin: 0;">
                ${teamText}
              </p>
            </td>
          </tr>
          
          <!-- Footer - Matching Standard Design -->
          <tr>
            <td style="background-color: #3D2E1F; padding: 30px; text-align: center;">
              <p style="color: #C9A86C; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">
                ${isArabic ? 'سوق المفيجر - التراث الأصيل' : 'Souq Almufaijer - Authentic Heritage'}
              </p>
              <p style="color: #A89585; font-size: 13px; margin: 0 0 16px 0;">
                ${locationText}
              </p>
              <p style="margin: 0;">
                <a href="https://aynn.io" style="color: #8B7355; font-size: 11px; text-decoration: none;">Powered by AYN</a>
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
      eventTime,
      // NEW: Enhanced fields
      guestAllowance = 2,
      perks = [],
      includeVideo = true,
      enableRSVP = true,
    } = body as VIPEmailRequest;

    console.log(`Sending VIP invitation to: ${contactEmail}`);

    // Generate tracking ID and RSVP token
    const trackingId = crypto.randomUUID();
    const rsvpToken = crypto.randomUUID();

    // Create invitation record in database if RSVP is enabled
    if (enableRSVP && contactId) {
      const { error: invError } = await supabase.from("vip_invitations").insert({
        contact_id: contactId,
        rsvp_token: rsvpToken,
        guest_allowance: guestAllowance,
        perks: perks,
        include_video: includeVideo,
        event_date: eventDate || null,
        event_time: eventTime || null,
        offer_details_en: offerDetails || null,
        offer_details_ar: offerDetails || null,
      });
      
      if (invError) {
        console.error("Failed to create invitation record:", invError);
      }
    }

    // Generate email HTML with all enhancements
    let emailHtml = generateVIPEmailHTML(
      preferredLanguage,
      contactName,
      subject,
      messageBody,
      {
        offerDetails,
        eventDate,
        eventTime,
        guestAllowance,
        perks,
        includeVideo,
        enableRSVP,
        rsvpToken: enableRSVP ? rsvpToken : undefined,
      }
    );
    emailHtml = addTrackingPixel(emailHtml, trackingId);

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Souq Almufaijer VIP <info@almufaijer.com>",
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
      JSON.stringify({ success: true, messageId: emailData?.id, rsvpToken }),
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
