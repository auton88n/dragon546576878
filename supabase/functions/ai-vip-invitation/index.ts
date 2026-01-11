import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VIPContactInfo {
  name: string;
  category: string;
  title?: string;
  templateType: string;
}

const systemPrompt = `You are the VIP relations manager for Souq Almufaijer (سوق المفيجر), a prestigious heritage tourism destination in Riyadh, Saudi Arabia. Your role is to craft elegant, culturally-appropriate VIP invitations that honor Saudi traditions and heritage.

IMPORTANT GUIDELINES:
1. Match formality to recipient category:
   - Government: Very formal, use respectful titles (معالي، سعادة، سمو)
   - Celebrity: Warm, appreciative, celebratory tone
   - Influencer: Friendly-professional, collaborative, exciting opportunities
   - Media: Professional, newsworthy angle, exclusive access
   - Business: Partnership-focused, mutual benefit, prestige

2. Content must reflect:
   - Rich Saudi heritage and traditions
   - Exclusive VIP experience
   - Authentic cultural immersion
   - Prestigious invitation tone

3. Generate BOTH Arabic and English versions:
   - Arabic should be formal, eloquent, and culturally appropriate
   - English should be professional and inviting

4. Suggest appropriate perks based on VIP category:
   - Government: private_tour, vip_seating, dinner
   - Celebrity: photography, special_gift, private_tour
   - Influencer: photography, private_tour, special_gift
   - Media: private_tour, photography, dinner
   - Business: vip_seating, dinner, private_tour`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify staff authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is staff
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: user.id });
    if (!isStaff) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Staff access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { contact, templateType } = await req.json() as { 
      contact: VIPContactInfo; 
      templateType: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userPrompt = `Generate a VIP invitation for the following contact:

Name: ${contact.name}
Category: ${contact.category}
Title: ${contact.title || 'Distinguished Guest'}
Template Type: ${templateType}

Please create personalized invitation content for this ${contact.category} VIP guest.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_vip_invitation",
              description: "Generate a personalized VIP invitation with bilingual content",
              parameters: {
                type: "object",
                properties: {
                  subjectEn: {
                    type: "string",
                    description: "Email subject line in English (professional, inviting)"
                  },
                  subjectAr: {
                    type: "string",
                    description: "Email subject line in Arabic (formal, culturally appropriate)"
                  },
                  messageEn: {
                    type: "string",
                    description: "Main invitation message in English (2-3 paragraphs, warm and exclusive)"
                  },
                  messageAr: {
                    type: "string",
                    description: "Main invitation message in Arabic (2-3 paragraphs, formal and eloquent)"
                  },
                  suggestedPerks: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of suggested perk IDs: private_tour, photography, dinner, vip_seating, special_gift"
                  }
                },
                required: ["subjectEn", "subjectAr", "messageEn", "messageAr", "suggestedPerks"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_vip_invitation" } },
      }),
    });

    // Handle rate limits and credit errors
    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "monthly_limit_exceeded",
            message_en: "You have exceeded your monthly AI limit. Please try again next month.",
            message_ar: "لقد تجاوزت الحد الشهري للذكاء الاصطناعي. يرجى المحاولة الشهر القادم."
          }), 
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "ai_error", message: "AI generation failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_vip_invitation") {
      throw new Error("Invalid AI response format");
    }

    const invitation = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(invitation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("ai-vip-invitation error:", error);
    return new Response(
      JSON.stringify({ 
        error: "server_error",
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
