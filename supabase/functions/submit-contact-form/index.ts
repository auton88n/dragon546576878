import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const validateEmail = (email: string): boolean =>
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) && email.length <= 255;

// Sanitize input to prevent XSS/injection
const sanitizeInput = (input: string, maxLength: number = 500): string => {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '');
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, subject, message } = await req.json();

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Name must be between 3 and 100 characters",
          error_ar: "الاسم يجب أن يكون بين 3 و 100 حرف"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email || !validateEmail(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Please provide a valid email address",
          error_ar: "يرجى إدخال بريد إلكتروني صحيح"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 200) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Subject must be between 3 and 200 characters",
          error_ar: "الموضوع يجب أن يكون بين 3 و 200 حرف"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 2000) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Message must be between 10 and 2000 characters",
          error_ar: "الرسالة يجب أن تكون بين 10 و 2000 حرف"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side rate limiting
    const normalizedEmail = email.toLowerCase().trim();
    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_identifier: normalizedEmail,
      p_action_type: 'contact_form',
      p_max_attempts: 10,
      p_window_minutes: 15
    });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue on error - don't block legitimate users
    } else if (allowed === false) {
      console.warn(`Rate limit exceeded for contact form: ${normalizedEmail.slice(0, 5)}...`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many submissions. Please try again later.",
          error_ar: "محاولات كثيرة. يرجى المحاولة لاحقاً."
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert with service role (bypasses RLS)
    const { error: insertError } = await supabase.from('contact_submissions').insert({
      name: sanitizeInput(name, 100),
      email: normalizedEmail,
      phone: phone ? sanitizeInput(phone, 20) : null,
      subject: sanitizeInput(subject, 200),
      message: sanitizeInput(message, 2000),
    });

    if (insertError) {
      console.error("Contact form insert error:", insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to submit form. Please try again.",
          error_ar: "فشل إرسال النموذج. يرجى المحاولة مرة أخرى."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("submit-contact-form error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
