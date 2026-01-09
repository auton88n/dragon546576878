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
  <style>
    body { font-family: 'Cairo', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f1e8; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #8B6F47 0%, #4A3625 100%); padding: 30px; text-align: center; }
    .header img { height: 60px; }
    .header h1 { color: white; margin: 20px 0 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .refund-box { background: #e8f5e9; border: 2px solid #4caf50; border-radius: 12px; padding: 25px; text-align: center; margin: 20px 0; }
    .refund-amount { font-size: 32px; font-weight: bold; color: #2e7d32; }
    .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
    .info-label { color: #666; }
    .info-value { font-weight: 600; color: #333; }
    .message-box { background: #fff3e0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { background: #4A3625; color: white; padding: 25px; text-align: center; font-size: 14px; }
    .footer a { color: #D4C5B0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://hekgkfdunwpxqbrotfpn.supabase.co/storage/v1/object/public/tickets/logo-white-email.png" alt="Souq Almufaijer">
      <h1>${isArabic ? 'تم استرداد المبلغ' : 'Refund Processed'}</h1>
    </div>
    
    <div class="content">
      <p style="font-size: 16px; color: #333;">
        ${isArabic 
          ? `عزيزي/عزيزتي ${booking.customer_name}،`
          : `Dear ${booking.customer_name},`
        }
      </p>
      
      <div class="message-box">
        <p style="margin: 0; color: #e65100;">
          ${isArabic 
            ? 'نعتذر عن أي إزعاج قد تعرضتم له. تم معالجة استرداد المبلغ الخاص بكم بنجاح.'
            : 'We apologize for any inconvenience caused. Your refund has been successfully processed.'
          }
        </p>
      </div>
      
      <div class="refund-box">
        <p style="margin: 0 0 10px; color: #666;">
          ${isArabic ? 'المبلغ المسترد' : 'Refund Amount'}
        </p>
        <div class="refund-amount">
          ${refundAmount} ${isArabic ? 'ر.س' : 'SAR'}
        </div>
        <p style="margin: 10px 0 0; color: #666; font-size: 14px;">
          ${isFullRefund 
            ? (isArabic ? 'استرداد كامل' : 'Full Refund')
            : (isArabic ? 'استرداد جزئي' : 'Partial Refund')
          }
        </p>
      </div>
      
      <div style="margin: 25px 0;">
        <div class="info-row">
          <span class="info-label">${isArabic ? 'رقم الحجز' : 'Booking Reference'}</span>
          <span class="info-value">${booking.booking_reference}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${isArabic ? 'المبلغ الأصلي' : 'Original Amount'}</span>
          <span class="info-value">${booking.total_amount} ${isArabic ? 'ر.س' : 'SAR'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${isArabic ? 'تاريخ الزيارة' : 'Visit Date'}</span>
          <span class="info-value">${booking.visit_date}</span>
        </div>
      </div>
      
      <p style="color: #666; font-size: 14px; background: #f5f5f5; padding: 15px; border-radius: 8px;">
        <strong>${isArabic ? 'ملاحظة:' : 'Note:'}</strong>
        ${isArabic 
          ? 'سيظهر المبلغ المسترد في حسابك خلال 3-5 أيام عمل، حسب البنك الخاص بك.'
          : 'The refunded amount will appear in your account within 3-5 business days, depending on your bank.'
        }
      </p>
      
      <p style="margin-top: 30px; color: #333;">
        ${isArabic 
          ? 'نأمل أن نراكم قريباً في سوق المفيجر.'
          : 'We hope to see you soon at Souq Almufaijer.'
        }
      </p>
      
      <p style="color: #8B6F47; font-weight: 600;">
        ${isArabic ? 'فريق سوق المفيجر' : 'Souq Almufaijer Team'}
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px;">
        ${isArabic ? 'سوق المفيجر - تراث حي' : 'Souq Almufaijer - Living Heritage'}
      </p>
      <p style="margin: 0; font-size: 12px;">
        ${isArabic ? 'للاستفسارات:' : 'For inquiries:'} 
        <a href="mailto:info@almufaijer.com">info@almufaijer.com</a>
      </p>
    </div>
  </div>
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
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending refund notification:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send refund notification", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
