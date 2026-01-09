import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactReplyRequest {
  submissionId: string;
  replyMessage: string;
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

    const { submissionId, replyMessage }: ContactReplyRequest = await req.json();

    if (!submissionId || !replyMessage) {
      return new Response(
        JSON.stringify({ error: "Submission ID and reply message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get submission details
    const { data: submission, error: submissionError } = await supabaseClient
      .from("contact_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) {
      return new Response(
        JSON.stringify({ error: "Submission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate bilingual email
    const subject = `Re: ${submission.subject} | Souq Almufaijer - سوق المفيجر`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <style>
    body { 
      font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; 
      margin: 0; 
      padding: 0; 
      background-color: #f5f1e8; 
      color: #3D2E1F;
    }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { 
      background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%); 
      padding: 30px; 
      text-align: center; 
    }
    .header img { height: 50px; }
    .header h1 { 
      color: #ffffff; 
      margin: 15px 0 0; 
      font-size: 22px; 
      font-weight: 600;
    }
    .content { padding: 35px 30px; }
    .greeting { font-size: 16px; color: #3D2E1F; margin-bottom: 20px; }
    .original-message {
      background: #f8f6f3;
      border-left: 4px solid #C9A86C;
      border-radius: 0 8px 8px 0;
      padding: 15px 20px;
      margin: 20px 0;
      font-size: 14px;
      color: #666;
    }
    .original-label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .reply-box {
      background: linear-gradient(135deg, #faf8f5 0%, #f5f1eb 100%);
      border: 2px solid #C9A86C;
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
    }
    .reply-label {
      color: #5C4A3A;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .reply-content {
      color: #3D2E1F;
      font-size: 15px;
      line-height: 1.7;
      white-space: pre-wrap;
    }
    .footer { 
      background: #4A3625; 
      color: #D4C5B0; 
      padding: 25px; 
      text-align: center; 
      font-size: 13px; 
    }
    .footer a { color: #C9A86C; text-decoration: none; }
    .divider { 
      height: 3px; 
      background: linear-gradient(90deg, #C9A86C, #8B6F47, #C9A86C); 
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://hekgkfdunwpxqbrotfpn.supabase.co/storage/v1/object/public/tickets/logo-white-email.png" alt="Souq Almufaijer">
      <h1>Response to Your Inquiry<br>الرد على استفسارك</h1>
    </div>
    <div class="divider"></div>
    
    <div class="content">
      <p class="greeting">
        Dear ${submission.name},<br>
        عزيزي/عزيزتي ${submission.name}،
      </p>
      
      <p style="color: #555; font-size: 14px;">
        Thank you for contacting Souq Almufaijer. Below is our response to your inquiry.<br>
        <span dir="rtl" style="display: block; text-align: right;">شكراً لتواصلك مع سوق المفيجر. فيما يلي ردنا على استفسارك.</span>
      </p>
      
      <div class="original-message">
        <div class="original-label">Your Original Message / رسالتك الأصلية</div>
        <div style="color: #555;">${submission.message}</div>
      </div>
      
      <div class="reply-box">
        <div class="reply-label">
          <span style="color: #C9A86C;">◆</span>
          Our Response / ردنا
        </div>
        <div class="reply-content">${replyMessage}</div>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 25px;">
        If you have any further questions, please don't hesitate to reach out.<br>
        <span dir="rtl" style="display: block; text-align: right;">إذا كانت لديك أي أسئلة أخرى، لا تتردد في التواصل معنا.</span>
      </p>
      
      <p style="color: #5C4A3A; font-weight: 600; margin-top: 30px;">
        Best regards / مع أطيب التحيات،<br>
        <span style="color: #C9A86C;">Souq Almufaijer Team | فريق سوق المفيجر</span>
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px; font-size: 14px; color: #ffffff;">
        Souq Almufaijer - Living Heritage<br>
        سوق المفيجر - تراث حي
      </p>
      <p style="margin: 0;">
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
      to: [submission.email],
      reply_to: "info@almufaijer.com",
      subject,
      html: htmlContent,
    });

    console.log("Contact reply email sent:", emailResponse);

    // Update submission with reply info
    const { error: updateError } = await supabaseClient
      .from("contact_submissions")
      .update({
        reply_sent: true,
        reply_message: replyMessage,
        reply_sent_at: new Date().toISOString(),
        status: "resolved",
      })
      .eq("id", submissionId);

    if (updateError) {
      console.error("Error updating submission:", updateError);
    }

    // Log email in queue
    await supabaseClient.from("email_queue").insert({
      to_email: submission.email,
      to_name: submission.name,
      subject,
      body_html: htmlContent,
      email_type: "contact_reply",
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, emailId: (emailResponse as { id?: string }).id || "sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error sending contact reply:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to send reply", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
