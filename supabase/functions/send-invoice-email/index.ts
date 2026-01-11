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
      return new Response(
        JSON.stringify({ success: false, error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentLink = `https://almufaijer.com/invoice/${invoice.id}`;
    const expiresAt = new Date(invoice.expires_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build services list
    const servicesList = (invoice.services || [])
      .map((s: string) => SERVICES_MAP[s])
      .filter(Boolean);

    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Invoice | فاتورة</title>
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
              <div style="font-size: 28px; color: #ffffff !important; margin: 10px 0 0;">سوق المفيجر</div>
              <p style="color: #D4C5B0 !important; margin: 10px 0 0 0; font-size: 14px;">Souq Almufaijer</p>
            </td>
          </tr>
          
          <!-- Gold Divider -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #C9A86C, #8B6F47, #C9A86C) !important;"></td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff !important;">
              
              <!-- Arabic Section -->
              <div style="text-align: right; margin-bottom: 40px;">
                <h2 style="color: #4A3625 !important; margin: 0 0 20px 0;">فاتورة رقم: ${invoice.invoice_number}</h2>
                <p style="color: #666666 !important; font-size: 16px; line-height: 1.6;">
                  عزيزي/عزيزتي ${invoice.client_name}،
                </p>
                <p style="color: #666666 !important; font-size: 16px; line-height: 1.6;">
                  شكراً لاختياركم سوق المفيجر. تجدون أدناه تفاصيل الفاتورة:
                </p>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF6F1 !important; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <tr>
                    <td style="padding: 8px 0; color: #666666 !important;">تاريخ الزيارة:</td>
                    <td style="padding: 8px 0; color: #4A3625 !important; font-weight: bold;">${invoice.visit_date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666 !important;">الوقت:</td>
                    <td style="padding: 8px 0; color: #4A3625 !important; font-weight: bold;">${invoice.visit_time}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666 !important;">عدد الزوار:</td>
                    <td style="padding: 8px 0; color: #4A3625 !important; font-weight: bold;">${invoice.num_adults} بالغ${invoice.num_children > 0 ? ` + ${invoice.num_children} طفل` : ''}</td>
                  </tr>
                  ${servicesList.length > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666666 !important;">الخدمات:</td>
                    <td style="padding: 8px 0; color: #4A3625 !important; font-weight: bold;">${servicesList.map((s: { ar: string }) => s.ar).join('، ')}</td>
                  </tr>
                  ` : ''}
                </table>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #5C4A3A !important; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <tr>
                    <td>
                      <p style="margin: 0; font-size: 14px; color: #D4C5B0 !important;">المبلغ الإجمالي</p>
                      <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #ffffff !important;">${invoice.total_amount.toLocaleString()} ريال</p>
                    </td>
                  </tr>
                </table>
                
                <p style="color: #999999 !important; font-size: 14px;">
                  ينتهي رابط الدفع في: ${expiresAt}
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
              
              <!-- English Section -->
              <div style="text-align: left;">
                <h2 style="color: #4A3625 !important; margin: 0 0 20px 0;">Invoice: ${invoice.invoice_number}</h2>
                <p style="color: #666666 !important; font-size: 16px; line-height: 1.6;">
                  Dear ${invoice.client_name},
                </p>
                <p style="color: #666666 !important; font-size: 16px; line-height: 1.6;">
                  Thank you for choosing Souq Almufaijer. Please find your invoice details below:
                </p>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF6F1 !important; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <tr>
                    <td style="padding: 8px 0; color: #666666 !important;">Visit Date:</td>
                    <td style="padding: 8px 0; color: #4A3625 !important; font-weight: bold;">${invoice.visit_date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666 !important;">Time:</td>
                    <td style="padding: 8px 0; color: #4A3625 !important; font-weight: bold;">${invoice.visit_time}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666 !important;">Visitors:</td>
                    <td style="padding: 8px 0; color: #4A3625 !important; font-weight: bold;">${invoice.num_adults} Adult${invoice.num_adults > 1 ? 's' : ''}${invoice.num_children > 0 ? ` + ${invoice.num_children} Child${invoice.num_children > 1 ? 'ren' : ''}` : ''}</td>
                  </tr>
                  ${servicesList.length > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666666 !important;">Services:</td>
                    <td style="padding: 8px 0; color: #4A3625 !important; font-weight: bold;">${servicesList.map((s: { en: string }) => s.en).join(', ')}</td>
                  </tr>
                  ` : ''}
                </table>
                
                <p style="color: #999999 !important; font-size: 14px;">
                  Payment link expires: ${expiresAt}
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%); color: #ffffff !important; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                  ادفع الآن | Pay Now
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #4A3625 !important; padding: 20px; text-align: center;">
              <p style="color: #ffffff !important; margin: 0; font-size: 14px; font-weight: 600;">
                Souq Almufaijer - Living Heritage
              </p>
              <p style="color: #D4C5B0 !important; margin: 8px 0 0 0; font-size: 13px;">
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

    const emailResponse = await resend.emails.send({
      from: "Souq Almufaijer <noreply@almufaijer.com>",
      to: [invoice.client_email],
      subject: `فاتورة ${invoice.invoice_number} | Invoice from Souq Almufaijer`,
      html: emailHtml,
    });

    console.log("Invoice email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
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
