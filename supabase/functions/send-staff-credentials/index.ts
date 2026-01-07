import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffCredentialsRequest {
  email: string;
  fullName: string;
  password: string;
  role: string;
  language?: string;
}

const getRoleLabel = (role: string, isArabic: boolean): string => {
  const labels: Record<string, { ar: string; en: string }> = {
    scanner: { ar: 'ماسح تذاكر', en: 'Scanner' },
    manager: { ar: 'مشرف', en: 'Manager' },
    support: { ar: 'دعم العملاء', en: 'Support' },
    admin: { ar: 'مدير', en: 'Admin' },
  };
  return labels[role]?.[isArabic ? 'ar' : 'en'] || role;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, password, role, language = 'en' }: StaffCredentialsRequest = await req.json();
    const isArabic = language === 'ar';

    console.log(`Sending credentials email to ${email} for ${fullName}`);

    const loginUrl = 'https://tickets.almufaijer.com/login';
    const roleLabel = getRoleLabel(role, isArabic);

    const emailHtml = `
<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${isArabic ? 'مرحباً بك في فريق سوق المفيجر' : 'Welcome to Souq Almufaijer Team'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5F1E8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F1E8; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4A3625 0%, #8B6F47 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; -webkit-text-fill-color: #FFFFFF;">سوق المفيجر</h1>
              <p style="margin: 8px 0 0 0; color: #D4C5B0; font-size: 14px; letter-spacing: 2px; -webkit-text-fill-color: #D4C5B0;">SOUQ ALMUFAIJER</p>
            </td>
          </tr>
          
          <!-- Welcome Banner -->
          <tr>
            <td style="background-color: #8B6F47; padding: 20px 24px; text-align: center;">
              <h2 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 600; -webkit-text-fill-color: #FFFFFF;">
                ${isArabic ? '🎉 مرحباً بك في الفريق!' : '🎉 Welcome to the Team!'}
              </h2>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; color: #2C2416; font-size: 16px; line-height: 1.6;">
                ${isArabic 
                  ? `مرحباً <strong>${fullName}</strong>،` 
                  : `Hello <strong>${fullName}</strong>,`}
              </p>
              
              <p style="margin: 0 0 24px 0; color: #4A3625; font-size: 15px; line-height: 1.6;">
                ${isArabic 
                  ? `تمت إضافتك كـ <strong>${roleLabel}</strong> في سوق المفيجر. استخدم البيانات التالية لتسجيل الدخول:` 
                  : `You have been added as a <strong>${roleLabel}</strong> at Souq Almufaijer. Use the credentials below to login:`}
              </p>
              
              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #4A3625; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                          <span style="color: #D4C5B0; font-size: 13px; display: block; margin-bottom: 4px; -webkit-text-fill-color: #D4C5B0;">
                            ${isArabic ? '📧 البريد الإلكتروني' : '📧 Email'}
                          </span>
                          <span style="color: #FFFFFF; font-size: 16px; font-weight: 600; font-family: monospace; -webkit-text-fill-color: #FFFFFF;">${email}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                          <span style="color: #D4C5B0; font-size: 13px; display: block; margin-bottom: 4px; -webkit-text-fill-color: #D4C5B0;">
                            ${isArabic ? '🔑 كلمة المرور' : '🔑 Password'}
                          </span>
                          <span style="color: #FFFFFF; font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: 1px; -webkit-text-fill-color: #FFFFFF;">${password}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0 0 0;">
                          <span style="color: #D4C5B0; font-size: 13px; display: block; margin-bottom: 4px; -webkit-text-fill-color: #D4C5B0;">
                            ${isArabic ? '👤 الدور' : '👤 Role'}
                          </span>
                          <span style="color: #FFFFFF; font-size: 16px; font-weight: 600; -webkit-text-fill-color: #FFFFFF;">${roleLabel}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Login Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #8B6F47 0%, #4A3625 100%); color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; -webkit-text-fill-color: #FFFFFF;">
                      ${isArabic ? 'تسجيل الدخول الآن ←' : 'Login Now →'}
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.5;">
                      ⚠️ <strong>${isArabic ? 'تنبيه أمني:' : 'Security Notice:'}</strong><br/>
                      ${isArabic 
                        ? 'يرجى تغيير كلمة المرور بعد تسجيل الدخول الأول للحفاظ على أمان حسابك.' 
                        : 'Please change your password after your first login to keep your account secure.'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F1E8; padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #8B6F47; font-size: 14px; font-weight: 600;">
                ${isArabic ? 'سوق المفيجر - تراث الرياض' : 'Souq Almufaijer - Riyadh Heritage'}
              </p>
              <p style="margin: 0; color: #6B5B4A; font-size: 12px;">
                ${isArabic ? 'للمساعدة، تواصل معنا على:' : 'Need help? Contact us at:'} 
                <a href="mailto:info@almufaijer.com" style="color: #8B6F47;">info@almufaijer.com</a>
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

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Souq Almufaijer <info@almufaijer.com>",
        to: [email],
        subject: isArabic 
          ? `مرحباً بك في فريق سوق المفيجر - بيانات الدخول` 
          : `Welcome to Souq Almufaijer - Your Login Credentials`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(emailData.message || 'Failed to send email');
    }

    console.log("Credentials email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending staff credentials email:", error);
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
