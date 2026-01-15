import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SERVICES_MAP: Record<string, { en: string; ar: string }> = {
  private_tour: { en: 'Private Heritage Tour', ar: 'جولة تراثية خاصة' },
  refreshments: { en: 'Traditional Refreshments', ar: 'ضيافة تقليدية' },
  photography: { en: 'Professional Photography', ar: 'تصوير احترافي' },
  vip_seating: { en: 'VIP Seating', ar: 'مقاعد VIP' },
  coordinator: { en: 'Dedicated Coordinator', ar: 'منسق مخصص' },
  custom_itinerary: { en: 'Custom Itinerary', ar: 'برنامج مخصص' },
  transportation: { en: 'Transportation Arrangement', ar: 'ترتيب النقل' },
  catering: { en: 'Full Catering Service', ar: 'خدمة طعام كاملة' },
};

// Generate Arabic email template
function generateArabicEmail(invoice: any, paymentLink: string, expiresAt: string, servicesList: any[]) {
  const isCorporate = invoice.is_corporate || invoice.client_type === 'company';
  const hasDiscount = invoice.original_amount && invoice.discount_amount && invoice.discount_amount > 0;

  const corporateBadge = isCorporate ? `
    <div style="display: inline-block; background: linear-gradient(135deg, #C9A86C 0%, #8B6F47 100%) !important; color: #4A3625 !important; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; margin: 10px 0;">
      🏢 حجز شركة${invoice.company_name ? ` - ${invoice.company_name}` : ''}
    </div>
  ` : '';

  const fastTrackNotice = isCorporate ? `
    <div style="background-color: #FAF6F1 !important; border-right: 4px solid #C9A86C; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #4A3625 !important; font-weight: bold;">✨ مسار VIP للشركات</p>
      <p style="margin: 8px 0 0 0; color: #666666 !important; font-size: 14px;">ستحصلون على تذاكر خاصة بمسار سريع للدخول بأولوية يوم الزيارة.</p>
    </div>
  ` : '';

  // Unified pricing card with discount and total combined - centered wrapper for mobile
  const pricingCard = hasDiscount ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%) !important; border-radius: 12px; overflow: hidden; margin: 20px auto; max-width: 100%;">
            <!-- Discount Badge Header -->
            <tr>
              <td style="background-color: rgba(201, 168, 108, 0.15) !important; padding: 12px 20px; text-align: center; border-bottom: 1px solid rgba(201, 168, 108, 0.3);">
                <span style="display: inline-block; background-color: #C9A86C !important; color: #4A3625 !important; padding: 4px 14px; border-radius: 12px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px;">
                  ✨ خصم خاص للشركات
                </span>
              </td>
            </tr>
            <!-- Pricing Details -->
            <tr>
              <td style="padding: 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl">
                  <tr>
                    <td style="padding: 8px 0; color: #D4C5B0 !important; font-size: 14px; text-align: right; width: 50%;">السعر الأصلي:</td>
                    <td style="padding: 8px 0; color: #999999 !important; font-size: 14px; text-align: left; text-decoration: line-through; width: 50%;">${invoice.original_amount?.toLocaleString()} ريال</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #D4C5B0 !important; font-size: 14px; text-align: right;">الخصم:</td>
                    <td style="padding: 8px 0; color: #7CB97C !important; font-size: 14px; font-weight: bold; text-align: left;">- ${invoice.discount_amount?.toLocaleString()} ريال</td>
                  </tr>
                  ${invoice.discount_reason ? `
                  <tr>
                    <td colspan="2" style="padding: 8px 0 12px 0; color: #A39580 !important; font-size: 12px; text-align: center; font-style: italic;">"${invoice.discount_reason}"</td>
                  </tr>
                  ` : ''}
                </table>
                <!-- Divider -->
                <div style="height: 1px; background: linear-gradient(90deg, transparent, #C9A86C, transparent); margin: 10px 0 15px 0;"></div>
                <!-- Total Amount -->
                <div style="text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #D4C5B0 !important; text-transform: uppercase; letter-spacing: 1px;">المبلغ الإجمالي</p>
                  <p style="margin: 8px 0 0 0; font-size: 36px; font-weight: bold; color: #ffffff !important;">${invoice.total_amount.toLocaleString()} <span style="font-size: 18px;">ريال</span></p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  ` : `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%) !important; padding: 25px; border-radius: 12px; text-align: center; margin: 20px auto; max-width: 100%;">
            <tr>
              <td>
                <p style="margin: 0; font-size: 12px; color: #D4C5B0 !important; text-transform: uppercase; letter-spacing: 1px;">المبلغ الإجمالي</p>
                <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; color: #ffffff !important;">${invoice.total_amount.toLocaleString()} <span style="font-size: 18px;">ريال</span></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>فاتورة - سوق المفيجر</title>
</head>
<body style="margin: 0 !important; padding: 0 !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f1e8 !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f1e8 !important; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff !important; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%) !important; background-color: #5C4A3A !important; padding: 30px; text-align: center;">
              <div style="font-size: 28px; color: #ffffff !important; margin-bottom: 5px;">سوق المفيجر</div>
              <p style="color: #C9A86C !important; margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px;">SOUQ ALMUFAIJER</p>
            </td>
          </tr>
          
          <!-- Gold Divider -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #C9A86C, #8B6F47, #C9A86C) !important;"></td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff !important; text-align: right;">
              
              <h2 style="color: #4A3625 !important; margin: 0 0 10px 0; font-size: 22px;">فاتورة رقم: ${invoice.invoice_number}</h2>
              ${corporateBadge}
              
              <p style="color: #666666 !important; font-size: 16px; line-height: 1.8; margin-top: 20px;">
                عزيزي/عزيزتي <strong>${invoice.client_name}</strong>،
              </p>
              <p style="color: #666666 !important; font-size: 16px; line-height: 1.8;">
                شكراً لاختياركم سوق المفيجر. تجدون أدناه تفاصيل الفاتورة:
              </p>
              
              <!-- Visit Details Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF6F1 !important; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 10px 0; color: #888888 !important; font-size: 14px; width: 40%;">تاريخ الزيارة:</td>
                  <td style="padding: 10px 0; color: #4A3625 !important; font-weight: bold; font-size: 15px;">${invoice.visit_date}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #888888 !important; font-size: 14px;">الوقت:</td>
                  <td style="padding: 10px 0; color: #4A3625 !important; font-weight: bold; font-size: 15px;">${invoice.visit_time}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #888888 !important; font-size: 14px;">عدد الزوار:</td>
                  <td style="padding: 10px 0; color: #4A3625 !important; font-weight: bold; font-size: 15px;">${invoice.num_adults} بالغ${invoice.num_children > 0 ? ` + ${invoice.num_children} طفل` : ''}</td>
                </tr>
                ${servicesList.length > 0 ? `
                <tr>
                  <td style="padding: 10px 0; color: #888888 !important; font-size: 14px; vertical-align: top;">الخدمات:</td>
                  <td style="padding: 10px 0; color: #4A3625 !important; font-weight: bold; font-size: 15px;">${servicesList.map((s: { ar: string }) => s.ar).join('، ')}</td>
                </tr>
                ` : ''}
              </table>
              
              <!-- Unified Pricing Card -->
              ${pricingCard}
              
              ${fastTrackNotice}
              
              <p style="color: #999999 !important; font-size: 13px; margin-top: 20px;">
                ⏰ ينتهي رابط الدفع في: <strong>${expiresAt}</strong>
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0 10px 0;">
                <a href="${paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%); color: #ffffff !important; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                  ادفع الآن
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #4A3625 !important; padding: 20px; text-align: center;">
              <p style="color: #ffffff !important; margin: 0; font-size: 15px; font-weight: 600;">
                سوق المفيجر - تراث حي
              </p>
              <p style="margin: 10px 0 0 0;">
                <a href="mailto:info@almufaijer.com" style="color: #C9A86C !important; text-decoration: none; font-size: 12px;">info@almufaijer.com</a>
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
}

// Generate English email template
function generateEnglishEmail(invoice: any, paymentLink: string, expiresAt: string, servicesList: any[]) {
  const isCorporate = invoice.is_corporate || invoice.client_type === 'company';
  const hasDiscount = invoice.original_amount && invoice.discount_amount && invoice.discount_amount > 0;

  const corporateBadge = isCorporate ? `
    <div style="display: inline-block; background: linear-gradient(135deg, #C9A86C 0%, #8B6F47 100%) !important; color: #4A3625 !important; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; margin: 10px 0;">
      🏢 Corporate Booking${invoice.company_name ? ` - ${invoice.company_name}` : ''}
    </div>
  ` : '';

  const fastTrackNotice = isCorporate ? `
    <div style="background-color: #FAF6F1 !important; border-left: 4px solid #C9A86C; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #4A3625 !important; font-weight: bold;">✨ Corporate VIP Fast-Track</p>
      <p style="margin: 8px 0 0 0; color: #666666 !important; font-size: 14px;">You will receive special fast-track tickets for priority entry on your visit day.</p>
    </div>
  ` : '';

  // Unified pricing card with discount and total combined
  const pricingCard = hasDiscount ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%) !important; border-radius: 12px; overflow: hidden; margin: 20px 0;">
      <!-- Discount Badge Header -->
      <tr>
        <td style="background-color: rgba(201, 168, 108, 0.15) !important; padding: 12px 20px; text-align: center; border-bottom: 1px solid rgba(201, 168, 108, 0.3);">
          <span style="display: inline-block; background-color: #C9A86C !important; color: #4A3625 !important; padding: 4px 14px; border-radius: 12px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px;">
            ✨ CORPORATE SPECIAL DISCOUNT
          </span>
        </td>
      </tr>
      <!-- Pricing Details -->
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; color: #D4C5B0 !important; font-size: 14px;">Original Price:</td>
              <td style="padding: 8px 0; color: #999999 !important; font-size: 14px; text-align: right; text-decoration: line-through;">${invoice.original_amount?.toLocaleString()} SAR</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #D4C5B0 !important; font-size: 14px;">Discount:</td>
              <td style="padding: 8px 0; color: #7CB97C !important; font-size: 14px; font-weight: bold; text-align: right;">- ${invoice.discount_amount?.toLocaleString()} SAR</td>
            </tr>
            ${invoice.discount_reason ? `
            <tr>
              <td colspan="2" style="padding: 8px 0 12px 0; color: #A39580 !important; font-size: 12px; text-align: center; font-style: italic;">"${invoice.discount_reason}"</td>
            </tr>
            ` : ''}
          </table>
          <!-- Divider -->
          <div style="height: 1px; background: linear-gradient(90deg, transparent, #C9A86C, transparent); margin: 10px 0 15px 0;"></div>
          <!-- Total Amount -->
          <div style="text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #D4C5B0 !important; text-transform: uppercase; letter-spacing: 1px;">TOTAL TO PAY</p>
            <p style="margin: 8px 0 0 0; font-size: 36px; font-weight: bold; color: #ffffff !important;">${invoice.total_amount.toLocaleString()} <span style="font-size: 18px;">SAR</span></p>
          </div>
        </td>
      </tr>
    </table>
  ` : `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%) !important; padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0; font-size: 12px; color: #D4C5B0 !important; text-transform: uppercase; letter-spacing: 1px;">TOTAL TO PAY</p>
          <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; color: #ffffff !important;">${invoice.total_amount.toLocaleString()} <span style="font-size: 18px;">SAR</span></p>
        </td>
      </tr>
    </table>
  `;

  return `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Invoice - Souq Almufaijer</title>
</head>
<body style="margin: 0 !important; padding: 0 !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f1e8 !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f1e8 !important; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff !important; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%) !important; background-color: #5C4A3A !important; padding: 30px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #C9A86C !important; letter-spacing: 2px; margin-bottom: 5px;">
                SOUQ ALMUFAIJER
              </div>
              <p style="color: #ffffff !important; margin: 8px 0 0 0; font-size: 16px;">سوق المفيجر</p>
            </td>
          </tr>
          
          <!-- Gold Divider -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #C9A86C, #8B6F47, #C9A86C) !important;"></td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff !important; text-align: left;">
              
              <h2 style="color: #4A3625 !important; margin: 0 0 10px 0; font-size: 22px;">Invoice: ${invoice.invoice_number}</h2>
              ${corporateBadge}
              
              <p style="color: #666666 !important; font-size: 16px; line-height: 1.8; margin-top: 20px;">
                Dear <strong>${invoice.client_name}</strong>,
              </p>
              <p style="color: #666666 !important; font-size: 16px; line-height: 1.8;">
                Thank you for choosing Souq Almufaijer. Please find your invoice details below:
              </p>
              
              <!-- Visit Details Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF6F1 !important; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 10px 0; color: #888888 !important; font-size: 14px; width: 40%;">Visit Date:</td>
                  <td style="padding: 10px 0; color: #4A3625 !important; font-weight: bold; font-size: 15px;">${invoice.visit_date}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #888888 !important; font-size: 14px;">Time:</td>
                  <td style="padding: 10px 0; color: #4A3625 !important; font-weight: bold; font-size: 15px;">${invoice.visit_time}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #888888 !important; font-size: 14px;">Visitors:</td>
                  <td style="padding: 10px 0; color: #4A3625 !important; font-weight: bold; font-size: 15px;">${invoice.num_adults} Adult${invoice.num_adults > 1 ? 's' : ''}${invoice.num_children > 0 ? ` + ${invoice.num_children} Child${invoice.num_children > 1 ? 'ren' : ''}` : ''}</td>
                </tr>
                ${servicesList.length > 0 ? `
                <tr>
                  <td style="padding: 10px 0; color: #888888 !important; font-size: 14px; vertical-align: top;">Services:</td>
                  <td style="padding: 10px 0; color: #4A3625 !important; font-weight: bold; font-size: 15px;">${servicesList.map((s: { en: string }) => s.en).join(', ')}</td>
                </tr>
                ` : ''}
              </table>
              
              <!-- Unified Pricing Card -->
              ${pricingCard}
              
              ${fastTrackNotice}
              
              <p style="color: #999999 !important; font-size: 13px; margin-top: 20px;">
                ⏰ Payment link expires: <strong>${expiresAt}</strong>
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0 10px 0;">
                <a href="${paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%); color: #ffffff !important; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                  Pay Now
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #4A3625 !important; padding: 20px; text-align: center;">
              <p style="color: #ffffff !important; margin: 0; font-size: 15px; font-weight: 600;">
                Souq Almufaijer - Living Heritage
              </p>
              <p style="margin: 10px 0 0 0;">
                <a href="mailto:info@almufaijer.com" style="color: #C9A86C !important; text-decoration: none; font-size: 12px;">info@almufaijer.com</a>
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing invoiceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get invoice
    const { data: invoice, error } = await supabase
      .from("custom_invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (error || !invoice) {
      console.error("Invoice not found:", invoiceId, error);
      return new Response(
        JSON.stringify({ success: false, error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending invoice email:", {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      clientEmail: invoice.client_email,
      language: invoice.language,
    });

    const paymentLink = `https://almufaijer.com/invoice/${invoice.id}`;
    const expiresAt = new Date(invoice.expires_at).toLocaleDateString(
      invoice.language === 'ar' ? 'ar-SA' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    // Build services list
    const servicesList = (invoice.services || [])
      .map((s: string) => SERVICES_MAP[s])
      .filter(Boolean);

    // Generate language-specific email
    const isArabic = invoice.language === 'ar';
    const emailHtml = isArabic
      ? generateArabicEmail(invoice, paymentLink, expiresAt, servicesList)
      : generateEnglishEmail(invoice, paymentLink, expiresAt, servicesList);

    // Language-specific subject
    const subject = isArabic
      ? `فاتورة ${invoice.invoice_number} - سوق المفيجر`
      : `Invoice ${invoice.invoice_number} - Souq Almufaijer`;

    const emailResponse = await resend.emails.send({
      from: "Souq Almufaijer <noreply@almufaijer.com>",
      to: [invoice.client_email],
      subject,
      html: emailHtml,
    });

    console.log("Resend API response:", JSON.stringify(emailResponse, null, 2));

    // Check for errors in the response
    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ success: false, error: emailResponse.error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Invoice email sent successfully:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending invoice email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
