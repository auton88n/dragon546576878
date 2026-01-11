import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are the customer relations manager for Souq Almufaijer (سوق المفيجر), a prestigious heritage tourism destination in Riyadh, Saudi Arabia. Your role is to craft professional, empathetic customer service replies.

IMPORTANT GUIDELINES:
1. Always acknowledge the customer's feelings/concerns first
2. Be apologetic when appropriate, especially for complaints
3. Offer concrete solutions or next steps when possible
4. Maintain a warm, professional tone reflecting Saudi hospitality
5. Keep replies concise but thorough (2-3 paragraphs max)
6. Generate reply in the SAME LANGUAGE as the customer's message:
   - If message is in Arabic → Reply in Arabic (formal, warm)
   - If message is in English → Reply in English (professional, friendly)
7. Sign off appropriately as "فريق سوق المفيجر" or "Souq Almufaijer Team"

RESPONSE TYPES:
- Complaint: Apologize sincerely, acknowledge issue, promise action
- Question: Answer clearly, provide helpful information
- Feedback: Thank them, show appreciation
- Booking Issue: Apologize, offer solution/alternative`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, customerMessage, subject } = await req.json();
    
    if (!customerMessage) {
      return new Response(
        JSON.stringify({ error: "Customer message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userPrompt = `Customer Name: ${customerName || "Unknown"}
Subject: ${subject || "General Inquiry"}

Customer Message:
${customerMessage}

Generate a professional, empathetic reply to this customer in the same language as their message.`;

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
              name: "generate_reply",
              description: "Generate a customer service reply",
              parameters: {
                type: "object",
                properties: {
                  suggestedReply: {
                    type: "string",
                    description: "The complete reply text to send to the customer",
                  },
                },
                required: ["suggestedReply"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_reply" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "monthly_limit_exceeded",
            message_en: "AI rate limit exceeded. Please try again later.",
            message_ar: "تم تجاوز حد الذكاء الاصطناعي. يرجى المحاولة لاحقاً.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "payment_required",
            message_en: "AI credits exhausted. Please contact support.",
            message_ar: "نفدت أرصدة الذكاء الاصطناعي. يرجى الاتصال بالدعم.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call response from AI");
    }

    const functionArgs = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ suggestedReply: functionArgs.suggestedReply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI contact reply error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
