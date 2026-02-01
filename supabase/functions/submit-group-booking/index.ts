import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const validateEmail = (email: string): boolean =>
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) && email.length <= 255;

const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return /^(\+966|966|05|5)[0-9]{8,9}$|^\+?[1-9][0-9]{7,14}$/.test(cleanPhone);
};

// Sanitize input to prevent XSS/injection
const sanitizeInput = (input: string, maxLength: number = 500): string => {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '');
};

const VALID_GROUP_TYPES = ['corporate', 'school', 'tour_group', 'government', 'private_event', 'other'];

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      organization_name, 
      contact_person, 
      email, 
      phone, 
      group_size, 
      preferred_dates, 
      group_type, 
      special_requirements 
    } = await req.json();

    // Validate organization_name
    if (!organization_name || typeof organization_name !== 'string' || 
        organization_name.trim().length < 3 || organization_name.trim().length > 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Organization name must be between 3 and 100 characters",
          error_ar: "اسم المنظمة يجب أن يكون بين 3 و 100 حرف"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate contact_person
    if (!contact_person || typeof contact_person !== 'string' || 
        contact_person.trim().length < 3 || contact_person.trim().length > 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Contact person name must be between 3 and 100 characters",
          error_ar: "اسم المسؤول يجب أن يكون بين 3 و 100 حرف"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email
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

    // Validate phone
    if (!phone || !validatePhone(phone)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Please provide a valid phone number",
          error_ar: "يرجى إدخال رقم هاتف صحيح"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate group_size
    const numericGroupSize = Number(group_size);
    if (!group_size || isNaN(numericGroupSize) || numericGroupSize < 20 || numericGroupSize > 1000) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Group size must be between 20 and 1000",
          error_ar: "عدد الأشخاص يجب أن يكون بين 20 و 1000"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate preferred_dates
    if (!preferred_dates || !Array.isArray(preferred_dates) || preferred_dates.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Please select at least one preferred date",
          error_ar: "يرجى اختيار تاريخ مفضل واحد على الأقل"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate group_type
    if (!group_type || !VALID_GROUP_TYPES.includes(group_type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Please select a valid group type",
          error_ar: "يرجى اختيار نوع المجموعة"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side rate limiting
    const normalizedEmail = email.toLowerCase().trim();
    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_identifier: normalizedEmail,
      p_action_type: 'group_booking',
      p_max_attempts: 5,
      p_window_minutes: 60
    });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue on error - don't block legitimate users
    } else if (allowed === false) {
      console.warn(`Rate limit exceeded for group booking: ${normalizedEmail.slice(0, 5)}...`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many submissions. Please try again in 1 hour.",
          error_ar: "محاولات كثيرة. يرجى المحاولة بعد ساعة."
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert with service role (bypasses RLS)
    const { error: insertError } = await supabase.from('group_booking_requests').insert({
      organization_name: sanitizeInput(organization_name, 100),
      contact_person: sanitizeInput(contact_person, 100),
      email: normalizedEmail,
      phone: sanitizeInput(phone, 20),
      group_size: numericGroupSize,
      preferred_dates: preferred_dates,
      group_type: group_type,
      special_requirements: special_requirements ? sanitizeInput(special_requirements, 500) : null,
    });

    if (insertError) {
      console.error("Group booking insert error:", insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to submit request. Please try again.",
          error_ar: "فشل إرسال الطلب. يرجى المحاولة مرة أخرى."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("submit-group-booking error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
