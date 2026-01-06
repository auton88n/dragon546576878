import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateBadgeRequest {
  fullName: string;
  email: string;
  phone?: string;
  department: string;
}

interface ResendBadgeRequest {
  employeeId: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Generate a simple checksum for QR data verification
const generateChecksum = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
};

// Generate email HTML template
const generateEmailTemplate = (employee: { full_name: string; department: string; qr_code_url: string }, isArabic: boolean) => {
  const direction = isArabic ? "rtl" : "ltr";
  const textAlign = isArabic ? "right" : "left";
  
  const translations = {
    title: isArabic ? "بطاقة الموظف - سوق المفيجر" : "Employee Badge - Souq Almufaijer",
    greeting: isArabic ? `مرحباً ${employee.full_name}،` : `Hello ${employee.full_name},`,
    welcome: isArabic 
      ? "مرحباً بك في فريق سوق المفيجر! هذه بطاقة الموظف الخاصة بك."
      : "Welcome to the Souq Almufaijer team! Here is your employee badge.",
    department: isArabic ? "القسم" : "Department",
    instructions: isArabic 
      ? "أظهر رمز QR هذا عند البوابة للدخول. يمكنك استخدامه عدة مرات."
      : "Show this QR code at the gate to enter. You can use it multiple times.",
    saveNote: isArabic
      ? "احفظ هذا البريد الإلكتروني أو حمّل صورة QR على هاتفك."
      : "Save this email or download the QR image to your phone.",
    contact: isArabic ? "للاستفسارات، تواصل مع الإدارة" : "For inquiries, contact management",
  };

  const departmentNames: Record<string, { ar: string; en: string }> = {
    security: { ar: "الأمن", en: "Security" },
    cleaning: { ar: "النظافة", en: "Cleaning" },
    guide: { ar: "الإرشاد", en: "Guide" },
    cafe: { ar: "المقهى", en: "Café" },
    shop: { ar: "المتجر", en: "Shop" },
    maintenance: { ar: "الصيانة", en: "Maintenance" },
    general: { ar: "عام", en: "General" },
    other: { ar: "أخرى", en: "Other" },
  };

  const deptDisplay = departmentNames[employee.department] 
    ? (isArabic ? departmentNames[employee.department].ar : departmentNames[employee.department].en)
    : employee.department;

  return `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${translations.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1F1F1F; font-family: Arial, sans-serif; direction: ${direction};">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #1F1F1F;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 500px;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%); padding: 32px 24px; border-radius: 16px 16px 0 0;">
              <h1 style="color: #FFFFFF; font-size: 28px; margin: 0 0 4px 0; font-weight: 700;">سوق المفيجر</h1>
              <p style="color: #E9D5FF; font-size: 11px; margin: 0 0 16px 0; letter-spacing: 3px; text-transform: uppercase;">SOUQ ALMUFAIJER</p>
              <div style="width: 60px; height: 2px; background-color: #E9D5FF; margin: 0 auto 16px;"></div>
              <p style="color: #FFFFFF; margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 1px;">
                ${isArabic ? 'بطاقة الموظف' : 'EMPLOYEE BADGE'}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: #2D2D2D; padding: 32px 24px; border-radius: 0 0 16px 16px;">
              
              <h2 style="color: #FFFFFF; margin: 0 0 10px; font-size: 18px; font-weight: 700; text-align: ${textAlign};">${translations.greeting}</h2>
              <p style="color: #E5E5E5; margin: 0 0 24px; line-height: 1.6; font-size: 14px; text-align: ${textAlign};">${translations.welcome}</p>
              
              <!-- Employee Info -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px; background-color: #3D3D3D; border-radius: 12px; border: 2px solid #4D4D4D;">
                <tr>
                  <td align="center" style="padding: 20px;">
                    <p style="color: #A3A3A3; margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">${translations.department}</p>
                    <p style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 700;">${deptDisplay}</p>
                  </td>
                </tr>
              </table>
              
              <!-- QR Code -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 24px; background-color: #FFFFFF; border-radius: 12px;">
                    <img src="${employee.qr_code_url}" alt="Employee Badge QR" width="250" height="250" style="display: block; border: 3px solid #7C3AED; border-radius: 12px;" />
                    <p style="color: #1F1F1F; margin: 16px 0 0; font-size: 12px; font-weight: 600;">${employee.full_name}</p>
                  </td>
                </tr>
              </table>
              
              <!-- Instructions -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 16px;">
                <tr>
                  <td style="padding: 16px; background-color: #14532D; border-radius: 12px; border: 1px solid #22C55E;">
                    <p style="color: #4ADE80; margin: 0; font-size: 13px; text-align: center; font-weight: 500;">
                      ✓ ${translations.instructions}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #D4D4D4; margin: 0 0 16px; font-size: 12px; text-align: center;">
                💾 ${translations.saveNote}
              </p>
              
              <p style="color: #A3A3A3; margin: 0; font-size: 11px; text-align: center;">
                ${translations.contact}
              </p>
              
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "generate";

    console.log(`[generate-employee-badge] Action: ${action}`);

    if (action === "resend") {
      // Resend badge email to existing employee
      const { employeeId }: ResendBadgeRequest = await req.json();
      
      if (!employeeId) {
        return new Response(
          JSON.stringify({ error: "Employee ID is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get employee data
      const { data: employee, error: fetchError } = await supabase
        .from("employees")
        .select("*")
        .eq("id", employeeId)
        .single();

      if (fetchError || !employee) {
        console.error("[generate-employee-badge] Employee not found:", fetchError);
        return new Response(
          JSON.stringify({ error: "Employee not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!employee.qr_code_url) {
        return new Response(
          JSON.stringify({ error: "Employee has no QR code generated" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Send email
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY not configured");
      }

      const resend = new Resend(resendApiKey);
      const emailHtml = generateEmailTemplate(employee, true); // Arabic by default

      const emailResponse = await resend.emails.send({
        from: "Souq Almufaijer <info@almufaijer.com>",
        to: [employee.email],
        subject: "بطاقة الموظف - سوق المفيجر | Employee Badge",
        html: emailHtml,
      });

      console.log("[generate-employee-badge] Resent email:", emailResponse);

      return new Response(
        JSON.stringify({ success: true, message: "Email resent successfully" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate new badge
    const { fullName, email, phone, department }: GenerateBadgeRequest = await req.json();

    // Validate required fields
    if (!fullName || !email || !department) {
      return new Response(
        JSON.stringify({ error: "Full name, email, and department are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from("employees")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "An employee with this email already exists" }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create employee record first (to get ID)
    const { data: newEmployee, error: insertError } = await supabase
      .from("employees")
      .insert({
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        department: department,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[generate-employee-badge] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create employee record" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[generate-employee-badge] Created employee:", newEmployee.id);

    // Generate QR code data
    const qrData = {
      type: "employee",
      id: newEmployee.id,
      name: fullName.trim(),
      dept: department,
      cs: generateChecksum(`${newEmployee.id}${fullName}${department}`),
    };

    const qrDataString = JSON.stringify(qrData);
    console.log("[generate-employee-badge] QR data:", qrDataString);

    // Generate QR code as base64 GIF
    const qrBase64 = await qrcode(qrDataString, { size: 600 }) as unknown as string;
    
    // Extract base64 data (remove data URL prefix if present)
    const base64Data = qrBase64.toString().replace(/^data:image\/\w+;base64,/, "");
    const qrBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to storage
    const storagePath = `employees/${newEmployee.id}.gif`;
    const { error: uploadError } = await supabase.storage
      .from("tickets")
      .upload(storagePath, qrBuffer, {
        contentType: "image/gif",
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate-employee-badge] Upload error:", uploadError);
      // Clean up employee record
      await supabase.from("employees").delete().eq("id", newEmployee.id);
      return new Response(
        JSON.stringify({ error: "Failed to upload QR code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("tickets").getPublicUrl(storagePath);
    const qrCodeUrl = urlData.publicUrl;

    console.log("[generate-employee-badge] QR URL:", qrCodeUrl);

    // Update employee with QR URL
    const { error: updateError } = await supabase
      .from("employees")
      .update({ qr_code_url: qrCodeUrl })
      .eq("id", newEmployee.id);

    if (updateError) {
      console.error("[generate-employee-badge] Update error:", updateError);
    }

    // Send email with badge
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("[generate-employee-badge] RESEND_API_KEY not configured, skipping email");
    } else {
      try {
        const resend = new Resend(resendApiKey);
        const emailHtml = generateEmailTemplate(
          { full_name: fullName, department, qr_code_url: qrCodeUrl },
          true // Arabic by default
        );

        const emailResponse = await resend.emails.send({
          from: "Souq Almufaijer <info@almufaijer.com>",
          to: [email],
          subject: "بطاقة الموظف - سوق المفيجر | Employee Badge",
          html: emailHtml,
        });

        console.log("[generate-employee-badge] Email sent:", emailResponse);
      } catch (emailErr) {
        console.error("[generate-employee-badge] Email send error:", emailErr);
        // Don't fail the whole operation if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        employee: {
          id: newEmployee.id,
          full_name: fullName,
          email: email,
          department: department,
          qr_code_url: qrCodeUrl,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("[generate-employee-badge] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
