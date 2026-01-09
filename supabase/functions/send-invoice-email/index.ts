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
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f1e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f1e8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #8B6F47; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">سوق المفيجر</h1>
              <p style="color: #D4C5B0; margin: 10px 0 0 0; font-size: 14px;">Souq Almufaijer</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Arabic Section -->
              <div style="text-align: right; margin-bottom: 40px;">
                <h2 style="color: #4A3625; margin: 0 0 20px 0;">فاتورة رقم: ${invoice.invoice_number}</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                  عزيزي/عزيزتي ${invoice.client_name}،
                </p>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                  شكراً لاختياركم سوق المفيجر. تجدون أدناه تفاصيل الفاتورة:
                </p>
                
                <div style="background-color: #f5f1e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <table width="100%" cellpadding="5">
                    <tr>
                      <td style="color: #666;">تاريخ الزيارة:</td>
                      <td style="color: #4A3625; font-weight: bold;">${invoice.visit_date}</td>
                    </tr>
                    <tr>
                      <td style="color: #666;">الوقت:</td>
                      <td style="color: #4A3625; font-weight: bold;">${invoice.visit_time}</td>
                    </tr>
                    <tr>
                      <td style="color: #666;">عدد الزوار:</td>
                      <td style="color: #4A3625; font-weight: bold;">${invoice.num_adults} بالغ${invoice.num_children > 0 ? ` + ${invoice.num_children} طفل` : ''}</td>
                    </tr>
                    ${servicesList.length > 0 ? `
                    <tr>
                      <td style="color: #666;">الخدمات:</td>
                      <td style="color: #4A3625; font-weight: bold;">${servicesList.map((s: { ar: string }) => s.ar).join('، ')}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                
                <div style="background-color: #8B6F47; color: #fff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px;">المبلغ الإجمالي</p>
                  <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold;">${invoice.total_amount.toLocaleString()} ريال</p>
                </div>
                
                <p style="color: #999; font-size: 14px;">
                  ينتهي رابط الدفع في: ${expiresAt}
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
              
              <!-- English Section -->
              <div style="text-align: left;">
                <h2 style="color: #4A3625; margin: 0 0 20px 0;">Invoice: ${invoice.invoice_number}</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                  Dear ${invoice.client_name},
                </p>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                  Thank you for choosing Souq Almufaijer. Please find your invoice details below:
                </p>
                
                <div style="background-color: #f5f1e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <table width="100%" cellpadding="5">
                    <tr>
                      <td style="color: #666;">Visit Date:</td>
                      <td style="color: #4A3625; font-weight: bold;">${invoice.visit_date}</td>
                    </tr>
                    <tr>
                      <td style="color: #666;">Time:</td>
                      <td style="color: #4A3625; font-weight: bold;">${invoice.visit_time}</td>
                    </tr>
                    <tr>
                      <td style="color: #666;">Visitors:</td>
                      <td style="color: #4A3625; font-weight: bold;">${invoice.num_adults} Adult${invoice.num_adults > 1 ? 's' : ''}${invoice.num_children > 0 ? ` + ${invoice.num_children} Child${invoice.num_children > 1 ? 'ren' : ''}` : ''}</td>
                    </tr>
                    ${servicesList.length > 0 ? `
                    <tr>
                      <td style="color: #666;">Services:</td>
                      <td style="color: #4A3625; font-weight: bold;">${servicesList.map((s: { en: string }) => s.en).join(', ')}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                
                <p style="color: #999; font-size: 14px;">
                  Payment link expires: ${expiresAt}
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${paymentLink}" style="display: inline-block; background-color: #8B6F47; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                  ادفع الآن | Pay Now
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #4A3625; padding: 20px; text-align: center;">
              <p style="color: #D4C5B0; margin: 0; font-size: 14px;">
                سوق المفيجر - Souq Almufaijer
              </p>
              <p style="color: #D4C5B0; margin: 10px 0 0 0; font-size: 12px;">
                info@almufaijer.com
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
