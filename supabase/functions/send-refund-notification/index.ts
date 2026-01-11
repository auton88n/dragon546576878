import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundEmailRequest {
  bookingId: string;
  refundAmount: number;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { bookingId, refundAmount, reason }: RefundEmailRequest = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Booking ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isArabic = booking.language === "ar";
    const isFullRefund = refundAmount >= Number(booking.total_amount);

    // Generate email content
    const subject = isArabic 
      ? `استرداد المبلغ - ${booking.booking_reference} | سوق المفيجر`
      : `Refund Processed - ${booking.booking_reference} | Souq Almufaijer`;

    const htmlContent = `
<!DOCTYPE html>
<html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${isArabic ? 'تم استرداد المبلغ' : 'Refund Processed'}</title>
</head>
<body style="margin: 0 !important; padding: 0 !important; font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; background-color: #f5f1e8 !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f1e8 !important;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff !important; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%) !important; background-color: #4A3625 !important; padding: 35px 30px; text-align: center;">
              <div style="font-size: 26px; font-weight: 700; color: #C9A86C !important; letter-spacing: 2px; margin-bottom: 5px;">
                SOUQ ALMUFAIJER
              </div>
              <div style="font-size: 16px; color: #F5F1E8 !important; margin-bottom: 20px;">
                سوق المفيجر
              </div>
              <div style="font-size: 20px; font-weight: 600; color: #ffffff !important;">
                ${isArabic ? 'تم استرداد المبلغ' : 'Refund Processed'}
              </div>
            </td>
          </tr>
          
          <!-- GOLD DIVIDER -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #C9A86C, #8B6F47, #C9A86C) !important;"></td>
          </tr>
          
          <!-- CONTENT -->
          <tr>
            <td style="background-color: #ffffff !important; padding: 35px 30px;">
              
              <!-- Greeting -->
              <p style="font-size: 16px; color: #3D2E1F !important; margin: 0 0 20px; line-height: 1.6; text-align: ${isArabic ? 'right' : 'left'};">
                ${isArabic 
                  ? `عزيزي/عزيزتي ${booking.customer_name}،`
                  : `Dear ${booking.customer_name},`
                }
              </p>
              
              <!-- Apology Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 25px;">
                <tr>
                  <td style="background-color: #FEF3C7 !important; padding: 16px 20px; border-radius: 10px; border: 1px solid #FCD34D;">
                    <p style="color: #92400E !important; margin: 0; font-size: 14px; line-height: 1.6; text-align: ${isArabic ? 'right' : 'left'};">
                      ${isArabic 
                        ? 'نعتذر عن أي إزعاج قد تعرضتم له. تم معالجة استرداد المبلغ الخاص بكم بنجاح.'
                        : 'We apologize for any inconvenience caused. Your refund has been successfully processed.'
                      }
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Refund Amount Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 25px;">
                <tr>
                  <td style="background-color: #ECFDF5 !important; padding: 25px; border-radius: 12px; border: 2px solid #10B981; text-align: center;">
                    <p style="color: #666666 !important; margin: 0 0 10px; font-size: 14px;">
                      ${isArabic ? 'المبلغ المسترد' : 'Refund Amount'}
                    </p>
                    <div style="font-size: 32px; font-weight: 800; color: #059669 !important;">
                      ${refundAmount} ${isArabic ? 'ر.س' : 'SAR'}
                    </div>
                    <p style="color: #666666 !important; margin: 10px 0 0; font-size: 13px;">
                      ${isFullRefund 
                        ? (isArabic ? 'استرداد كامل' : 'Full Refund')
                        : (isArabic ? 'استرداد جزئي' : 'Partial Refund')
                      }
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Booking Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF6F1 !important; border-radius: 10px; margin: 0 0 25px;">
                <tr>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #E8DED0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="color: #666666 !important; font-size: 14px;">${isArabic ? 'رقم الحجز' : 'Booking Reference'}</td>
                        <td style="color: #3D2E1F !important; font-weight: 600; font-size: 14px; text-align: ${isArabic ? 'left' : 'right'};">${booking.booking_reference}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #E8DED0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="color: #666666 !important; font-size: 14px;">${isArabic ? 'المبلغ الأصلي' : 'Original Amount'}</td>
                        <td style="color: #3D2E1F !important; font-weight: 600; font-size: 14px; text-align: ${isArabic ? 'left' : 'right'};">${booking.total_amount} ${isArabic ? 'ر.س' : 'SAR'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="color: #666666 !important; font-size: 14px;">${isArabic ? 'تاريخ الزيارة' : 'Visit Date'}</td>
                        <td style="color: #3D2E1F !important; font-weight: 600; font-size: 14px; text-align: ${isArabic ? 'left' : 'right'};">${booking.visit_date}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Bank Note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 25px;">
                <tr>
                  <td style="background-color: #F5F5F5 !important; padding: 16px 20px; border-radius: 8px;">
                    <p style="color: #3D2E1F !important; margin: 0; font-size: 14px; line-height: 1.6;">
                      <strong style="color: #5C4A3A !important;">${isArabic ? 'ملاحظة:' : 'Note:'}</strong>
                      ${isArabic 
                        ? 'سيظهر المبلغ المسترد في حسابك خلال 3-5 أيام عمل، حسب البنك الخاص بك.'
                        : 'The refunded amount will appear in your account within 3-5 business days, depending on your bank.'
                      }
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Closing -->
              <p style="color: #3D2E1F !important; font-size: 14px; margin: 0 0 8px; line-height: 1.6; text-align: ${isArabic ? 'right' : 'left'};">
                ${isArabic 
                  ? 'نأمل أن نراكم قريباً في سوق المفيجر.'
                  : 'We hope to see you soon at Souq Almufaijer.'
                }
              </p>
              
              <!-- Signature -->
              <p style="margin: 25px 0 0; line-height: 1.6; text-align: ${isArabic ? 'right' : 'left'};">
                <span style="color: #5C4A3A !important; font-weight: 600;">${isArabic ? 'مع أطيب التحيات،' : 'With warm regards,'}</span><br>
                <span style="color: #C9A86C !important; font-weight: 600;">${isArabic ? 'فريق سوق المفيجر' : 'Souq Almufaijer Team'}</span>
              </p>
              
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td style="background-color: #4A3625 !important; padding: 25px 30px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #ffffff !important; font-weight: 600;">
                ${isArabic ? 'سوق المفيجر - تراث حي' : 'Souq Almufaijer - Living Heritage'}
              </p>
              <p style="margin: 0;">
                <a href="mailto:info@almufaijer.com" style="color: #C9A86C !important; text-decoration: none; font-size: 13px;">info@almufaijer.com</a>
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

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Souq Almufaijer <noreply@almufaijer.com>",
      to: [booking.customer_email],
      subject,
      html: htmlContent,
    });

    console.log("Refund notification email sent:", emailResponse);

    // Log email in queue
    await supabaseClient.from("email_queue").insert({
      to_email: booking.customer_email,
      to_name: booking.customer_name,
      subject,
      body_html: htmlContent,
      email_type: "refund_notification",
      booking_id: bookingId,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, emailId: (emailResponse as { id?: string }).id || "sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error sending refund notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to send refund notification", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
