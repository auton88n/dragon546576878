import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VIPConfirmationRequest {
  bookingId: string;
  invitationId?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Perk icons as emoji for email compatibility
const perkEmojis: Record<string, string> = {
  private_tour: "🏛️",
  photography: "📸",
  dinner: "🍽️",
  vip_seating: "🎭",
  special_gift: "🎁",
};

// Perk labels
const perkLabels: Record<string, { en: string; ar: string }> = {
  private_tour: { en: "Private guided tour", ar: "جولة خاصة مع مرشد" },
  photography: { en: "Professional photography session", ar: "جلسة تصوير احترافية" },
  dinner: { en: "Traditional Saudi hospitality dinner", ar: "عشاء ضيافة سعودية تقليدية" },
  vip_seating: { en: "VIP seating at cultural performances", ar: "مقاعد VIP في العروض الثقافية" },
  special_gift: { en: "Special gift from Souq Almufaijer", ar: "هدية خاصة من سوق المفيجر" },
};

type PerkData = string | { id: string; en: string; ar: string };

// Generate premium VIP email template
const generateVIPEmailTemplate = (
  booking: any,
  ticket: any,
  perks: PerkData[],
  isArabic: boolean
) => {
  const direction = isArabic ? "rtl" : "ltr";
  const textAlign = isArabic ? "right" : "left";
  const textAlignOpposite = isArabic ? "left" : "right";

  const translations = {
    title: isArabic ? "تأكيد دعوتك الخاصة" : "Your VIP Invitation Confirmed",
    greeting: isArabic ? `أهلاً ${booking.customer_name}،` : `Welcome ${booking.customer_name},`,
    thankYou: isArabic 
      ? "يسعدنا تأكيد حضوركم الكريم في سوق المفيجر. نتشرف باستضافتكم في تجربة استثنائية تعكس أصالة التراث السعودي."
      : "We are delighted to confirm your distinguished presence at Souq Almufaijer. It is our honor to host you for an exceptional experience reflecting authentic Saudi heritage.",
    eventDetails: isArabic ? "تفاصيل الفعالية" : "Event Details",
    date: isArabic ? "التاريخ" : "Date",
    guests: isArabic ? "عدد الضيوف" : "Number of Guests",
    validAllDay: isArabic ? "صالحة طوال اليوم" : "Valid All Day",
    operatingHours: isArabic ? "(٣ م - ١٢ ص منتصف الليل)" : "(3 PM - 12 AM Midnight)",
    yourPerks: isArabic ? "امتيازاتكم الخاصة" : "Your VIP Privileges",
    entryTicket: isArabic ? "تذكرة الدخول الخاصة" : "Your VIP Entry Pass",
    scanInstructions: isArabic 
      ? "قم بإظهار هذا الرمز عند البوابة الرئيسية"
      : "Present this code at the main entrance",
    
    seeYouSoon: isArabic ? "نتطلع لاستقبالكم!" : "We look forward to welcoming you!",
    address: isArabic ? "سوق المفيجر، المملكة العربية السعودية" : "Souq Almufaijer, Kingdom of Saudi Arabia",
    questions: isArabic 
      ? "للاستفسارات، تواصلوا معنا على"
      : "For inquiries, contact us at",
  };

  // Format date
  const visitDate = new Date(booking.visit_date);
  const formattedDate = visitDate.toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Generate perks HTML
  let perksHtml = "";
  if (perks && perks.length > 0) {
    const perkItems = perks.map((perk) => {
      const perkId = typeof perk === "object" ? perk.id : perk;
      const perkLabel = typeof perk === "object"
        ? (isArabic ? perk.ar : perk.en)
        : (perkLabels[perk]?.[isArabic ? "ar" : "en"] || perk);
      const emoji = perkEmojis[perkId] || "✨";
      
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid rgba(201, 169, 98, 0.2);">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="40" style="vertical-align: top;">
                  <span style="font-size: 20px;">${emoji}</span>
                </td>
                <td style="text-align: ${textAlign}; vertical-align: middle;">
                  <span style="color: #F5F1E8; font-size: 14px; font-family: Arial, sans-serif;">${perkLabel}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    }).join("");

    perksHtml = `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
          <td style="padding-bottom: 12px;">
            <h3 style="color: #C9A962; margin: 0; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif; text-align: ${textAlign};">
              ✨ ${translations.yourPerks}
            </h3>
          </td>
        </tr>
        <tr>
          <td>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#4A3625" class="dark-cell" style="background-color: #4A3625 !important; border-radius: 12px; border: 2px solid #C9A962;">
              ${perkItems}
            </table>
          </td>
        </tr>
      </table>`;
  }

  // QR code section
  const qrHtml = ticket?.qr_code_url ? `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="padding-bottom: 12px;">
          <h3 style="color: #3D2E1F; margin: 0; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif; text-align: ${textAlign};">
            🎫 ${translations.entryTicket}
          </h3>
        </td>
      </tr>
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="300" style="background: linear-gradient(135deg, #FAF7F2 0%, #F5F1E8 100%); border-radius: 20px; border: 3px solid #C9A962; box-shadow: 0 8px 24px rgba(74, 54, 37, 0.15);">
            <tr>
              <td align="center" style="padding: 24px 20px 16px 20px;">
                <span style="display: inline-block; background: linear-gradient(135deg, #C9A962 0%, #E8D5A3 50%, #C9A962 100%); color: #4A3625; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 700; font-family: Arial, sans-serif; letter-spacing: 2px; text-transform: uppercase;">
                  VIP GUEST
                </span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 24px 16px 24px;">
                <img src="${ticket.qr_code_url}" alt="VIP QR Code" width="200" height="200" style="display: block; border: 4px solid #C9A962; border-radius: 16px;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 20px 8px 20px;">
                <span style="display: inline-block; background-color: #4A3625; color: #F5F1E8; padding: 6px 16px; border-radius: 12px; font-size: 12px; font-weight: 600; font-family: Arial, sans-serif;">
                  ${booking.adult_count || 1} ${isArabic ? "ضيف" : "Guest(s)"}
                </span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 20px 16px 20px; font-family: monospace; font-size: 12px; color: #4A3625; letter-spacing: 2px; font-weight: 700;">
                ${ticket.ticket_code}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 20px 20px 20px;">
                <p style="color: #8B6F47; margin: 0; font-size: 11px; font-family: Arial, sans-serif;">
                  📱 ${translations.scanInstructions}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>` : "";

  return `<!DOCTYPE html>
<html lang="${isArabic ? "ar" : "en"}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <meta name="x-apple-disable-message-reformatting">
  <title>${translations.title}</title>
  <style>
    :root { color-scheme: light only; }
    * { -webkit-text-fill-color: inherit !important; }
    body, table, td, div, p, span { background-color: inherit !important; }
    @media (prefers-color-scheme: dark) {
      .email-body, .email-content, .dark-cell { background-color: #4A3625 !important; }
      .darker-cell { background-color: #3D2E1F !important; }
      .gold-cell { background-color: #C9A962 !important; }
    }
    [data-ogsc] .email-body, [data-ogsb] .email-body { background-color: #4A3625 !important; }
    [data-ogsc] .email-content, [data-ogsb] .email-content { background-color: #4A3625 !important; }
    [data-ogsc] .dark-cell, [data-ogsb] .dark-cell { background-color: #4A3625 !important; }
    [data-ogsc] .darker-cell, [data-ogsb] .darker-cell { background-color: #3D2E1F !important; }
    [data-ogsc] .gold-cell, [data-ogsb] .gold-cell { background-color: #C9A962 !important; }
  </style>
</head>
<body class="email-body" bgcolor="#4A3625" style="margin: 0; padding: 0; background-color: #4A3625 !important; font-family: Arial, sans-serif; direction: ${direction}; -webkit-text-fill-color: inherit;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#4A3625" style="background-color: #4A3625 !important;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px;">
          
          <!-- Premium VIP Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #4A3625 0%, #3D2E1F 50%, #4A3625 100%) !important; padding: 40px 24px; border-radius: 20px 20px 0 0; position: relative;">
              <!-- Decorative top border -->
              <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, transparent 0%, #C9A962 20%, #E8D5A3 50%, #C9A962 80%, transparent 100%);"></div>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <!-- VIP Badge -->
                    <span style="display: inline-block; background: linear-gradient(135deg, #C9A962 0%, #E8D5A3 50%, #C9A962 100%) !important; color: #4A3625 !important; padding: 6px 24px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: Arial, sans-serif; letter-spacing: 3px; text-transform: uppercase;">
                      VIP INVITATION
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 16px 0 4px 0;">
                    <h1 style="color: #C9A962 !important; font-size: 32px; margin: 0; font-weight: 700; font-family: 'Times New Roman', serif;">سوق المفيجر</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <p style="color: #D4C5B0 !important; font-size: 11px; margin: 0; letter-spacing: 4px; text-transform: uppercase; font-family: Arial, sans-serif;">SOUQ ALMUFAIJER</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent 0%, #C9A962 30%, #E8D5A3 50%, #C9A962 70%, transparent 100%); margin: 0 auto;"></div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="color: #F5F1E8 !important; margin: 0; font-size: 15px; font-weight: 600; letter-spacing: 1px; font-family: Arial, sans-serif;">
                      ✓ ${isArabic ? "تم تأكيد الحضور" : "ATTENDANCE CONFIRMED"}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="email-content dark-cell" bgcolor="#4A3625" style="background-color: #4A3625 !important; padding: 32px 24px; border-radius: 0 0 20px 20px;">
              
              <!-- Greeting -->
              <h2 style="color: #F5F1E8 !important; margin: 0 0 12px; font-size: 22px; font-weight: 700; font-family: Arial, sans-serif; text-align: ${textAlign};">${translations.greeting}</h2>
              <p style="color: #D4C5B0 !important; margin: 0 0 24px; line-height: 1.7; font-size: 15px; font-family: Arial, sans-serif; text-align: ${textAlign};">${translations.thankYou}</p>
              
              
              <!-- Event Details Card -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <h3 style="color: #C9A962 !important; margin: 0; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif; text-align: ${textAlign};">
                      📅 ${translations.eventDetails}
                    </h3>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#3D2E1F" class="darker-cell" style="background-color: #3D2E1F !important; border-radius: 12px; border: 1px solid #C9A962;">
                      <tr>
                        <td width="50%" bgcolor="#3D2E1F" class="darker-cell" style="background-color: #3D2E1F !important; padding: 16px; vertical-align: top; border-${isArabic ? "left" : "right"}: 1px solid #C9A962;">
                          <p style="color: #C9A962 !important; margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; font-family: Arial, sans-serif;">${translations.date}</p>
                          <p style="color: #F5F1E8 !important; margin: 0; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">${formattedDate}</p>
                        </td>
                        <td width="50%" bgcolor="#3D2E1F" class="darker-cell" style="background-color: #3D2E1F !important; padding: 16px; vertical-align: top;">
                          <p style="color: #C9A962 !important; margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; font-family: Arial, sans-serif;">${translations.guests}</p>
                          <p style="color: #F5F1E8 !important; margin: 0; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">${booking.adult_count || 1} ${isArabic ? "شخص" : "person(s)"}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" bgcolor="#C9A962" class="gold-cell" style="background-color: #C9A962 !important; padding: 12px 16px; border-radius: 0 0 12px 12px;">
                          <p style="color: #3D2E1F !important; margin: 0; font-size: 13px; font-weight: 600; font-family: Arial, sans-serif; text-align: center;">
                            ☀️ ${translations.validAllDay} ${translations.operatingHours}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- VIP Perks -->
              ${perksHtml}
              
              <!-- QR Code -->
              ${qrHtml}
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" bgcolor="#4A3625" class="dark-cell" style="background-color: #4A3625 !important; padding: 24px 16px;">
              <a href="https://maps.app.goo.gl/g4qJ4mM9ZVqg323t8" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #8B7355 0%, #6B5A45 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; margin-bottom: 16px;">
                📍 ${isArabic ? "احصل على الاتجاهات" : "Get Directions"}
              </a>
              <p style="color: #5C4A3A; margin: 0 0 6px; font-size: 13px; font-weight: 600; font-family: Arial, sans-serif;">${translations.address}</p>
              <p style="color: #8B7355; margin: 0 0 8px; font-size: 11px; font-family: Arial, sans-serif;">
                © ${new Date().getFullYear()} Souq Almufaijer. ${isArabic ? "جميع الحقوق محفوظة" : "All rights reserved"}.
              </p>
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: VIPConfirmationRequest = await req.json();
    const { bookingId, invitationId } = body;

    if (!bookingId) {
      throw new Error("Missing bookingId parameter");
    }

    console.log("=".repeat(50));
    console.log(`📧 Processing VIP confirmation for booking: ${bookingId}`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking with ticket
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, tickets(*)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    console.log(`📋 VIP Booking: ${booking.booking_reference}`);
    console.log(`   Customer: ${booking.customer_name} (${booking.customer_email})`);

    // Fetch invitation for perks if invitationId provided
    let perks: PerkData[] = [];
    if (invitationId) {
      const { data: invitation } = await supabase
        .from("vip_invitations")
        .select("perks")
        .eq("id", invitationId)
        .single();

      if (invitation?.perks) {
        perks = invitation.perks as PerkData[];
      }
    } else {
      // Try to find invitation by booking_id
      const { data: invitation } = await supabase
        .from("vip_invitations")
        .select("perks")
        .eq("booking_id", bookingId)
        .single();

      if (invitation?.perks) {
        perks = invitation.perks as PerkData[];
      }
    }

    const isArabic = booking.language === "ar";
    const ticket = booking.tickets?.[0] || null;

    const emailHtml = generateVIPEmailTemplate(booking, ticket, perks, isArabic);
    const subject = isArabic
      ? `تأكيد دعوتكم الخاصة | سوق المفيجر`
      : `Your VIP Invitation Confirmed | Souq Almufaijer`;

    const plainText = isArabic
      ? `تأكيد دعوتكم الخاصة - سوق المفيجر\n\nأهلاً ${booking.customer_name}،\n\nيسعدنا تأكيد حضوركم في سوق المفيجر.\n\nالتاريخ: ${booking.visit_date}\nعدد الضيوف: ${booking.adult_count || 1}\n\nنتطلع لاستقبالكم!\n\nPowered by AYN`
      : `VIP Invitation Confirmed - Souq Almufaijer\n\nWelcome ${booking.customer_name},\n\nWe are delighted to confirm your presence at Souq Almufaijer.\n\nDate: ${booking.visit_date}\nGuests: ${booking.adult_count || 1}\n\nWe look forward to welcoming you!\n\nPowered by AYN`;

    console.log(`📧 Sending VIP confirmation email...`);

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

    console.log(`✅ VIP confirmation email sent! Resend ID: ${data?.id}`);

    // Update booking
    await supabase
      .from("bookings")
      .update({
        confirmation_email_sent: true,
        last_email_sent_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    console.log("=".repeat(50));

    return new Response(
      JSON.stringify({
        success: true,
        recipient: booking.customer_email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ VIP confirmation email error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
