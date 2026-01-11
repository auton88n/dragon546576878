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

  // Generate perks HTML - 2-column grid layout matching original design
  const perkLabelsArray = perks.map(perk => getPerkLabel(perk as PerkInput, isArabic)).filter(Boolean);
  const perksHtml = perkLabelsArray.length > 0 ? `
    <table role="presentation" style="width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="background-color: #4A3625; padding: 16px 20px; border-radius: 8px;">
          <p style="color: #E8D5A3; font-size: 12px; margin: 0 0 12px 0; font-weight: 600; ${!isArabic ? 'text-transform: uppercase; letter-spacing: 0.5px;' : ''}">
            ${isArabic ? 'تجربتكم المميزة تتضمن' : 'VIP EXPERIENCE INCLUDES'}
          </p>
          <table role="presentation" style="width: 100%;">
            ${(() => {
              const rows = [];
              for (let i = 0; i < perkLabelsArray.length; i += 2) {
                const perk1 = perkLabelsArray[i];
                const perk2 = perkLabelsArray[i + 1];
                rows.push(`
                  <tr>
                    <td style="width: 50%; vertical-align: top; padding: 4px 8px 4px 0;">
                      <span style="color: #C9A962; font-size: 10px;">●</span>
                      <span style="color: #FFFFFF; font-size: 13px; margin-${isArabic ? 'right' : 'left'}: 6px;">${perk1}</span>
                    </td>
                    ${perk2 ? `
                    <td style="width: 50%; vertical-align: top; padding: 4px 0 4px 8px;">
                      <span style="color: #C9A962; font-size: 10px;">●</span>
                      <span style="color: #FFFFFF; font-size: 13px; margin-${isArabic ? 'right' : 'left'}: 6px;">${perk2}</span>
                    </td>
                    ` : '<td></td>'}
                  </tr>
                `);
              }
              return rows.join('');
            })()}
          </table>
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
          
          <!-- Header - Compact with warmer gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B6F47 0%, #5C4A32 100%); padding: 24px 20px; text-align: center;">
              <!-- Gradient gold line -->
              <div style="width: 80px; height: 2px; background: linear-gradient(90deg, #C9A962, #E8D5A3, #C9A962); margin: 0 auto 16px auto;"></div>
              <!-- Compact title -->
              <h1 style="color: #FFFFFF; font-size: 22px; margin: 0 0 8px 0; font-weight: 700; font-family: 'Cairo', Arial, sans-serif;">
                سوق المفيجر
              </h1>
              <!-- Subtitle with high contrast -->
              <p style="color: #F5F1E8; font-size: 13px; margin: 0;">
                ${isArabic ? 'دعوة حصرية للشخصيات المميزة' : 'Exclusive Invitation for Distinguished Guests'}
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
              <!-- Video Section - Compact with gold border -->
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td>
                    <a href="${videoUrl}" target="_blank" style="text-decoration: none; display: block;">
                      <table role="presentation" style="width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid #C9A962;">
                        <tr>
                          <td style="background-image: url('https://almufaijer.com/images/hero-heritage-new.webp'); background-size: cover; background-position: center;">
                            <div style="background: rgba(74, 54, 37, 0.8); padding: 24px; text-align: center;">
                              <table role="presentation" style="margin: 0 auto 12px;">
                                <tr>
                                  <td style="width: 50px; height: 50px; background: rgba(255,255,255,0.25); border-radius: 25px; text-align: center; vertical-align: middle; border: 2px solid rgba(255,255,255,0.4);">
                                    <span style="font-size: 22px; color: #FFFFFF;">&#9654;</span>
                                  </td>
                                </tr>
                              </table>
                              <p style="color: #FFFFFF; font-size: 14px; font-weight: 600; margin: 0;">
                                ${isArabic ? 'اكتشف سحر المفيجر' : 'Discover the Magic of Almufaijer'}
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
              
              <!-- Guest Allowance Box - Compact with gold border -->
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="background-color: #F5F1E8; padding: 12px 16px; border-radius: 8px; text-align: center; border: 1px solid #C9A962;">
                    <p style="color: #3D2E1F; font-size: 14px; margin: 0; font-weight: 500;">
                      ${isArabic ? `حتى ${guestAllowance} ضيوف` : `Up to ${guestAllowance} guests`}
                    </p>
                  </td>
                </tr>
              </table>
              
              ${perksHtml}
              
              ${(eventDate || eventTime || offerDetails) ? `
              <!-- Event Details Box - Compact with gold border -->
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="background-color: #F5F1E8; padding: 12px 16px; border-radius: 8px; border: 1px solid #C9A962;">
                    <p style="color: #3D2E1F; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">
                      ${isArabic ? 'تفاصيل الفعالية' : 'Event Details'}
                    </p>
                    ${eventDate ? `
                    <p style="color: #5C4A3A; font-size: 13px; margin: 0 0 4px 0;">
                      ${dateLabel} <span style="color: #3D2E1F; font-weight: 500;">${eventDate}</span>
                    </p>
                    ` : ''}
                    ${eventTime ? `
                    <p style="color: #5C4A3A; font-size: 13px; margin: 0;">
                      ${timeLabel} <span style="color: #3D2E1F; font-weight: 500;">${eventTime}</span>
                    </p>
                    ` : ''}
                    ${offerDetails ? `
                    <p style="color: #5C4A3A; font-size: 12px; margin: ${eventDate || eventTime ? '8px' : '0'} 0 0 0; line-height: 1.5;">
                      ${offerDetails}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}
              
              ${enableRSVP && rsvpToken ? `
              <!-- RSVP Button - Gradient with gold border -->
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="text-align: center; padding: 8px 0;">
                    <a href="${rsvpUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #5C4A32, #4A3625); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; border: 1px solid #C9A962;">
                      ${isArabic ? 'تأكيد الحضور' : 'Confirm Attendance'}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Signature with gold divider -->
              <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #C9A962, transparent); margin: 0 auto 12px auto;"></div>
              <p style="color: #5C4A3A; font-size: 13px; margin: 0; text-align: center;">
                ${regardsText}
              </p>
              <p style="color: #3D2E1F; font-size: 14px; font-weight: 600; margin: 6px 0 0 0; text-align: center;">
                ${teamText}
              </p>
            </td>
          </tr>
          
          <!-- Footer - Single line compact -->
          <tr>
            <td style="background-color: #4A3625; padding: 16px; text-align: center;">
              <p style="color: #C9A962; font-size: 13px; font-weight: 500; margin: 0;">
                ${isArabic ? 'سوق المفيجر | قرية المفيجر التراثية' : 'Souq Almufaijer | Heritage Village'}
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
