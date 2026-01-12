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

// Professional VIP email template matching original design
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
  
  const videoUrl = "https://hekgkfdunwpxqbrotfpn.supabase.co/storage/v1/object/public/videos/souq-almufaijer-video.mp4";
  const rsvpUrl = rsvpToken ? getRSVPUrl(rsvpToken) : '#';

  // Generate perks HTML - 2-column grid layout
  const perkLabelsArray = perks.map(perk => getPerkLabel(perk as PerkInput, isArabic)).filter(Boolean);
  const perksHtml = perkLabelsArray.length > 0 ? `
    <table role="presentation" style="width: 100%; margin-bottom: 16px;">
      <tr>
        <td style="background-color: #4A3625; padding: 14px 18px; border-radius: 8px;">
          <p style="color: #E8D5A3; font-size: 11px; margin: 0 0 10px 0; font-weight: 600; ${!isArabic ? 'text-transform: uppercase; letter-spacing: 0.5px;' : ''}">
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
                    <td style="width: 50%; vertical-align: top; padding: 3px 6px 3px 0;">
                      <span style="color: #C9A962; font-size: 9px;">●</span>
                      <span style="color: #FFFFFF; font-size: 12px; margin-${isArabic ? 'right' : 'left'}: 5px;">${perk1}</span>
                    </td>
                    ${perk2 ? `
                    <td style="width: 50%; vertical-align: top; padding: 3px 0 3px 6px;">
                      <span style="color: #C9A962; font-size: 9px;">●</span>
                      <span style="color: #FFFFFF; font-size: 12px; margin-${isArabic ? 'right' : 'left'}: 5px;">${perk2}</span>
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
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
  <style>
    :root { color-scheme: light only; }
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #4A3625 !important; }
      .email-content { background-color: #4A3625 !important; }
    }
    [data-ogsc] .email-body { background-color: #4A3625 !important; }
    [data-ogsc] .email-content { background-color: #4A3625 !important; }
    [data-ogsb] .email-body { background-color: #4A3625 !important; }
    [data-ogsb] .email-content { background-color: #4A3625 !important; }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #4A3625 !important; direction: ${dir}; -webkit-text-fill-color: inherit;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #4A3625 !important;">
    <tr>
      <td style="padding: 32px 16px;">
        <table role="presentation" style="max-width: 580px; margin: 0 auto; background-color: #4A3625 !important; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);">
          
          <!-- Header - Compact with Gold gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #C9A962 0%, #E8D5A3 50%, #C9A962 100%) !important; padding: 20px 16px; text-align: center;">
              <div style="width: 60px; height: 2px; background: linear-gradient(90deg, #4A3625, #3D2E1F, #4A3625); margin: 0 auto 12px auto;"></div>
              <h1 style="color: #3D2E1F !important; font-size: 20px; margin: 0 0 6px 0; font-weight: 700; font-family: 'Cairo', Arial, sans-serif;">
                سوق المفيجر
              </h1>
              <p style="color: #4A3625 !important; font-size: 12px; margin: 0; font-weight: 600;">
                ${isArabic ? 'دعوة حصرية للشخصيات المميزة' : 'Exclusive VIP Invitation'}
              </p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="email-content" style="padding: 28px 24px; background-color: #4A3625 !important;">
              <!-- Greeting -->
              <p style="color: #F5F1E8 !important; font-size: 16px; margin: 0 0 18px 0; line-height: 1.5; font-weight: 500;">
                ${greeting}
              </p>
              
              <!-- Message Body -->
              <div style="color: #D4C5B0 !important; font-size: 14px; margin: 0 0 24px 0; line-height: 1.7;">
                ${messageBody.split('\n').map(p => `<p style="margin: 0 0 12px 0; color: #D4C5B0 !important;">${p}</p>`).join('')}
              </div>
              
              <!-- Guest + Event Details - Side by Side with Equal Heights -->
              <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                <tr>
                  <td style="width: 48%; vertical-align: top; padding-${isArabic ? 'left' : 'right'}: 8px; height: 70px;">
                    <div style="background-color: #3D2E1F !important; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #C9A962; height: 100%; box-sizing: border-box;">
                      <p style="color: #C9A962 !important; font-size: 10px; margin: 0 0 6px 0; font-weight: 600; ${!isArabic ? 'text-transform: uppercase;' : ''}">
                        ${isArabic ? 'عدد الضيوف' : 'GUESTS'}
                      </p>
                      <p style="color: #F5F1E8 !important; font-size: 14px; margin: 0; font-weight: 600;">
                        ${isArabic ? `حتى ${guestAllowance} ضيوف` : `Up to ${guestAllowance}`}
                      </p>
                    </div>
                  </td>
                  <td style="width: 48%; vertical-align: top; padding-${isArabic ? 'right' : 'left'}: 8px; height: 70px;">
                    <div style="background-color: #3D2E1F !important; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #C9A962; height: 100%; box-sizing: border-box;">
                      <p style="color: #C9A962 !important; font-size: 10px; margin: 0 0 6px 0; font-weight: 600; ${!isArabic ? 'text-transform: uppercase;' : ''}">
                        ${isArabic ? 'الموعد' : 'DATE & TIME'}
                      </p>
                      <p style="color: #F5F1E8 !important; font-size: 14px; margin: 0; font-weight: 600;">
                        ${eventDate ? eventDate : (isArabic ? 'سيُحدد لاحقاً' : 'TBD')}${eventTime ? ` • ${eventTime}` : ''}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              ${perksHtml}
              
              ${includeVideo ? `
              <!-- Video Section - After Perks -->
              <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                <tr>
                  <td>
                    <a href="${videoUrl}" target="_blank" style="text-decoration: none; display: block;">
                      <table role="presentation" style="width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid #C9A962;">
                        <tr>
                          <td style="background-image: url('https://317f2d24-1b4e-49d4-90fb-37dde9a3046d.lovableproject.com/images/hero-heritage-new.webp'); background-size: cover; background-position: center;">
                            <div style="background: rgba(74, 54, 37, 0.75); padding: 20px; text-align: center;">
                              <table role="presentation" style="margin: 0 auto 8px;">
                                <tr>
                                  <td style="width: 44px; height: 44px; background: rgba(255,255,255,0.2); border-radius: 22px; text-align: center; vertical-align: middle; border: 2px solid rgba(255,255,255,0.35);">
                                    <span style="font-size: 18px; color: #FFFFFF;">&#9654;</span>
                                  </td>
                                </tr>
                              </table>
                              <p style="color: #FFFFFF !important; font-size: 13px; font-weight: 600; margin: 0;">
                                ${isArabic ? 'اكتشف سحر المفيجر' : 'Discover Almufaijer'}
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
              
              ${enableRSVP && rsvpToken ? `
              <!-- RSVP Button -->
              <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                <tr>
                  <td style="text-align: center; padding: 4px 0;">
                    <a href="${rsvpUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #C9A962, #E8D5A3) !important; color: #3D2E1F !important; text-decoration: none; padding: 11px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; border: 1px solid #C9A962;">
                      ${isArabic ? 'تأكيد الحضور' : 'Confirm Attendance'}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              ${offerDetails ? `
              <!-- Additional Details -->
              <div style="background-color: #3D2E1F !important; padding: 12px 14px; border-radius: 6px; margin-bottom: 16px; border: 1px solid #C9A962;">
                <p style="color: #D4C5B0 !important; font-size: 12px; margin: 0; line-height: 1.5;">
                  ${offerDetails}
                </p>
              </div>
              ` : ''}
              
              <!-- Signature -->
              <div style="width: 50px; height: 1px; background: linear-gradient(90deg, transparent, #C9A962, transparent); margin: 8px auto 10px auto;"></div>
              <p style="color: #D4C5B0 !important; font-size: 12px; margin: 0; text-align: center;">
                ${regardsText}
              </p>
              <p style="color: #F5F1E8 !important; font-size: 13px; font-weight: 600; margin: 4px 0 0 0; text-align: center;">
                ${teamText}
              </p>
            </td>
          </tr>
          
          <!-- Footer - Compact -->
          <tr>
            <td style="background-color: #3D2E1F !important; padding: 14px; text-align: center;">
              <p style="color: #C9A962 !important; font-size: 12px; font-weight: 500; margin: 0;">
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
