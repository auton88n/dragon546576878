import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportTicketRequest {
  ticketId: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  subject: string;
  category: string;
  priority: string;
  description: string;
}

const priorityLabels: Record<string, { en: string; ar: string; color: string }> = {
  low: { en: "Low", ar: "منخفضة", color: "#22c55e" },
  medium: { en: "Medium", ar: "متوسطة", color: "#f59e0b" },
  high: { en: "High", ar: "High", color: "#ef4444" },
  critical: { en: "Critical", ar: "حرجة", color: "#dc2626" },
};

const categoryLabels: Record<string, { en: string; ar: string }> = {
  bug: { en: "Bug Report", ar: "تقرير خطأ" },
  feature: { en: "Feature Request", ar: "طلب ميزة" },
  question: { en: "Question", ar: "سؤال" },
  other: { en: "Other", ar: "أخرى" },
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-ayn-support function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      ticketId,
      adminId,
      adminEmail,
      adminName,
      subject,
      category,
      priority,
      description,
    }: SupportTicketRequest = await req.json();

    console.log("Creating support ticket:", { ticketId, subject, category, priority });

    // Insert ticket into database
    const { error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        id: ticketId,
        admin_id: adminId,
        admin_email: adminEmail,
        admin_name: adminName,
        subject,
        category,
        priority,
        description,
        status: "pending",
      });

    if (insertError) {
      console.error("Failed to insert ticket:", insertError);
      throw new Error(`Failed to create ticket: ${insertError.message}`);
    }

    const ticketRef = ticketId.slice(0, 8).toUpperCase();
    const priorityInfo = priorityLabels[priority] || priorityLabels.medium;
    const categoryInfo = categoryLabels[category] || categoryLabels.other;
    const timestamp = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Email 1: To AYN Support
    const aynEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8B6F47, #4A3625); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .section { margin-bottom: 20px; }
    .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
    .value { margin-top: 4px; font-size: 14px; }
    .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; color: white; font-weight: bold; }
    .description { background: white; padding: 15px; border-radius: 8px; border: 1px solid #eee; white-space: pre-wrap; }
    .footer { background: #4A3625; color: white; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🎫 New Support Ticket</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Souq Almufaijer - Heritage Ticketing System</p>
    </div>
    <div class="content">
      <div class="section">
        <div class="label">Ticket Reference</div>
        <div class="value" style="font-size: 18px; font-weight: bold;">#${ticketRef}</div>
      </div>
      <div class="section">
        <div class="label">Submitted By</div>
        <div class="value">${adminName} &lt;${adminEmail}&gt;</div>
      </div>
      <div class="section" style="display: flex; gap: 20px;">
        <div>
          <div class="label">Category</div>
          <div class="value">${categoryInfo.en}</div>
        </div>
        <div>
          <div class="label">Priority</div>
          <div class="value">
            <span class="priority-badge" style="background: ${priorityInfo.color};">${priorityInfo.en}</span>
          </div>
        </div>
      </div>
      <div class="section">
        <div class="label">Subject</div>
        <div class="value" style="font-size: 16px; font-weight: bold;">${subject}</div>
      </div>
      <div class="section">
        <div class="label">Description</div>
        <div class="description">${description}</div>
      </div>
      <div class="section">
        <div class="label">Submitted At</div>
        <div class="value">${timestamp}</div>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">Reply directly to this email to respond to ${adminName}</p>
      <p style="margin: 10px 0 0 0; opacity: 0.7;">Project: Souq Almufaijer | tickets.almufaijer.com</p>
    </div>
  </div>
</body>
</html>
    `;

    // Email 2: Confirmation to Admin
    const confirmationEmailHtml = `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8B6F47, #4A3625); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 25px; border: 1px solid #ddd; }
    .bilingual { margin-bottom: 20px; }
    .en { direction: ltr; text-align: left; color: #555; }
    .ar { direction: rtl; text-align: right; color: #333; }
    .ticket-box { background: white; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin: 20px 0; }
    .response-times { background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .footer { background: #4A3625; color: white; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Ticket Received</h1>
      <h1 style="margin: 10px 0 0 0;">تم استلام الطلب</h1>
    </div>
    <div class="content">
      <div class="bilingual">
        <p class="ar">مرحباً ${adminName}،</p>
        <p class="ar">تم استلام طلب الدعم الخاص بك وسيقوم فريقنا بمراجعته في أقرب وقت.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
        <p class="en">Hello ${adminName},</p>
        <p class="en">Your support request has been received and our team will review it shortly.</p>
      </div>
      
      <div class="ticket-box">
        <h3 style="margin-top: 0;">📋 Ticket Summary | ملخص الطلب</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Reference | المرجع:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: left;">#${ticketRef}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Subject | الموضوع:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: left;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Category | الفئة:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: left;">${categoryInfo.en} / ${categoryInfo.ar}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Priority | الأولوية:</strong></td>
            <td style="padding: 8px 0; text-align: left;">
              <span style="background: ${priorityInfo.color}; color: white; padding: 2px 8px; border-radius: 4px;">${priorityInfo.en}</span>
            </td>
          </tr>
        </table>
      </div>

      <div class="response-times">
        <h4 style="margin-top: 0;">⏱️ Expected Response Time | وقت الاستجابة المتوقع</h4>
        <ul style="margin: 0; padding-right: 20px;">
          <li><strong>Critical:</strong> Within 4 hours | خلال 4 ساعات</li>
          <li><strong>High:</strong> Within 24 hours | خلال 24 ساعة</li>
          <li><strong>Medium:</strong> Within 48 hours | خلال 48 ساعة</li>
          <li><strong>Low:</strong> Within 72 hours | خلال 72 ساعة</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">For urgent issues | للمشاكل العاجلة</p>
      <p style="margin: 5px 0; font-size: 18px;">support@aynn.io</p>
      <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 15px 0;">
      <p style="margin: 0; opacity: 0.8;">AYN Development Team | فريق تطوير AYN</p>
    </div>
  </div>
</body>
</html>
    `;

    console.log("Sending email to AYN support...");
    const { error: aynEmailError } = await resend.emails.send({
      from: "Souq Almufaijer <onboarding@resend.dev>",
      to: ["support@aynn.io"],
      reply_to: adminEmail,
      subject: `[Souq Almufaijer] ${priorityInfo.en.toUpperCase()} - ${subject}`,
      html: aynEmailHtml,
    });

    if (aynEmailError) {
      console.error("Failed to send email to AYN:", aynEmailError);
      throw new Error(`Failed to send email to AYN: ${aynEmailError.message}`);
    }

    console.log("AYN email sent successfully");

    // Send confirmation email to Admin
    console.log("Sending confirmation email to admin...");
    const { error: confirmEmailError } = await resend.emails.send({
      from: "AYN Support <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `Ticket Received: ${subject} - #${ticketRef}`,
      html: confirmationEmailHtml,
    });

    if (confirmEmailError) {
      console.error("Failed to send confirmation email:", confirmEmailError);
      // Don't throw - ticket was created and AYN was notified
    } else {
      console.log("Confirmation email sent successfully");
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticketId,
        ticketRef,
        message: "Support ticket created and emails sent",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-ayn-support:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
