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
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <!--[if mso]>
  <style type="text/css">
    table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    :root { color-scheme: light only; }
    body, .body-wrapper { 
      font-family: 'Cairo', 'Segoe UI', Arial, sans-serif !important; 
      margin: 0 !important; 
      padding: 0 !important; 
      background-color: #f5f1e8 !important; 
      color: #3D2E1F !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    .container { 
      max-width: 600px !important; 
      margin: 0 auto !important; 
      background-color: #ffffff !important; 
    }
    /* Prevent dark mode overrides */
    [data-ogsc] .container,
    [data-ogsb] .container,
    .container { background-color: #ffffff !important; }
    [data-ogsc] .content-area,
    [data-ogsb] .content-area,
    .content-area { background-color: #ffffff !important; color: #3D2E1F !important; }
    [data-ogsc] .header-area,
    [data-ogsb] .header-area,
    .header-area { background-color: #4A3625 !important; }
    [data-ogsc] .footer-area,
    [data-ogsb] .footer-area,
    .footer-area { background-color: #4A3625 !important; }
  </style>
</head>
<body class="body-wrapper" style="margin: 0 !important; padding: 0 !important; background-color: #f5f1e8 !important;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f1e8 !important;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff !important; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          
          <!-- HEADER -->
          <tr>
            <td class="header-area" style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%) !important; background-color: #4A3625 !important; padding: 35px 30px; text-align: center;">
              <div style="font-size: 26px; font-weight: 700; color: #C9A86C !important; letter-spacing: 2px; margin-bottom: 5px;">
                SOUQ ALMUFAIJER
              </div>
              <div style="font-size: 16px; color: #F5F1E8 !important; margin-bottom: 20px;">
                سوق المفيجر
              </div>
              <div style="font-size: 20px; font-weight: 600; color: #ffffff !important; line-height: 1.5;">
                Thank You for Reaching Out<br>
                <span style="font-size: 18px; color: #D4C5B0 !important;">شكراً لتواصلك معنا</span>
              </div>
            </td>
          </tr>
          
          <!-- GOLD DIVIDER -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #C9A86C, #8B6F47, #C9A86C) !important;"></td>
          </tr>
          
          <!-- CONTENT -->
          <tr>
            <td class="content-area" style="background-color: #ffffff !important; padding: 35px 30px;">
              
              <!-- Greeting -->
              <p style="font-size: 16px; color: #3D2E1F !important; margin: 0 0 20px; line-height: 1.6;">
                Dear ${submission.name},
              </p>
              
              <!-- Intro -->
              <p style="color: #555555 !important; font-size: 14px; margin: 0 0 25px; line-height: 1.6;">
                We appreciate you reaching out to us. Here's our response to your inquiry.
              </p>
              <p dir="rtl" style="color: #555555 !important; font-size: 14px; margin: 0 0 25px; line-height: 1.6; text-align: right;">
                نقدر تواصلك معنا. إليك ردنا على استفسارك.
              </p>
              
              <!-- Original Message Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 25px;">
                <tr>
                  <td style="background-color: #f8f6f3 !important; border-left: 4px solid #C9A86C; border-radius: 0 8px 8px 0; padding: 15px 20px;">
                    <div style="font-size: 11px; color: #888888 !important; text-transform: uppercase; margin-bottom: 10px; font-weight: 600; letter-spacing: 0.5px;">
                      Your Message / رسالتك
                    </div>
                    <div style="color: #666666 !important; font-size: 14px; line-height: 1.6;">${submission.message}</div>
                  </td>
                </tr>
              </table>
              
              <!-- Reply Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 30px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #faf8f5 0%, #f5f1eb 100%) !important; background-color: #f8f6f3 !important; border: 2px solid #C9A86C; border-radius: 12px; padding: 25px;">
                    <div style="color: #5C4A3A !important; font-weight: 600; font-size: 14px; margin-bottom: 15px;">
                      <span style="color: #C9A86C !important;">◆</span>
                      Our Response / ردنا
                    </div>
                    <div style="color: #3D2E1F !important; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">${replyMessage}</div>
                  </td>
                </tr>
              </table>
              
              <!-- Closing -->
              <p style="color: #666666 !important; font-size: 14px; margin: 0 0 8px; line-height: 1.6;">
                Need more help? We're here for you.
              </p>
              <p dir="rtl" style="color: #666666 !important; font-size: 14px; margin: 0 0 30px; line-height: 1.6; text-align: right;">
                نحن هنا لخدمتك دائماً.
              </p>
              
              <!-- Signature -->
              <p style="margin: 0; line-height: 1.6;">
                <span style="color: #5C4A3A !important; font-weight: 600;">With warm regards,</span><br>
                <span style="color: #C9A86C !important; font-weight: 600;">The Souq Almufaijer Team</span>
                <span style="color: #888888 !important;"> | </span>
                <span style="color: #C9A86C !important; font-weight: 600;">فريق سوق المفيجر</span>
              </p>
              
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td class="footer-area" style="background-color: #4A3625 !important; padding: 25px 30px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #ffffff !important; font-weight: 600;">
                Souq Almufaijer - Living Heritage
              </p>
              <p style="margin: 0 0 10px; font-size: 13px; color: #D4C5B0 !important;">
                سوق المفيجر - تراث حي
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
