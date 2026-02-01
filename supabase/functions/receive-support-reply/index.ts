import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface ResendInboundEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  created_at?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret
    const webhookSecret = req.headers.get("x-webhook-secret");
    const expectedSecret = Deno.env.get("SUPPORT_WEBHOOK_SECRET");

    if (!expectedSecret) {
      console.error("SUPPORT_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (webhookSecret !== expectedSecret) {
      console.error("Invalid webhook secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const payload: ResendInboundEmail = await req.json();
    console.log("Received inbound email:", {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
    });

    // Extract ticket reference from subject line
    // Format: Re: [Souq Almufaijer] HIGH - Issue title - #8BCE2742
    const ticketRefMatch = payload.subject.match(/#([A-F0-9]{8})/i);
    
    if (!ticketRefMatch) {
      console.log("No ticket reference found in subject:", payload.subject);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No ticket reference found, email ignored" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ticketRefPrefix = ticketRefMatch[1].toUpperCase();
    console.log("Extracted ticket reference prefix:", ticketRefPrefix);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the ticket by matching the first 8 characters of the ID
    const { data: tickets, error: searchError } = await supabase
      .from("support_tickets")
      .select("id, subject, status, ayn_notes")
      .ilike("id", `${ticketRefPrefix}%`)
      .limit(1);

    if (searchError) {
      console.error("Error searching for ticket:", searchError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tickets || tickets.length === 0) {
      console.log("No ticket found with reference:", ticketRefPrefix);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Ticket not found, email ignored" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ticket = tickets[0];
    console.log("Found ticket:", ticket.id, ticket.subject);

    // Extract the reply content (clean up email signature and quoted text)
    let replyContent = payload.text || "";
    
    // Remove common email signature patterns
    replyContent = replyContent
      .split(/^--\s*$/m)[0]  // Remove signature after "--"
      .split(/^On .* wrote:$/m)[0]  // Remove quoted reply header
      .split(/^>.*$/gm).join("")  // Remove quoted lines
      .trim();

    // If reply is empty after cleanup, use the full text
    if (!replyContent) {
      replyContent = payload.text || "No content";
    }

    // Format the new note with timestamp
    const timestamp = new Date().toISOString();
    const formattedReply = `[${timestamp}]\nFrom: ${payload.from}\n\n${replyContent}`;

    // Append to existing notes or create new
    const existingNotes = ticket.ayn_notes || "";
    const newNotes = existingNotes 
      ? `${existingNotes}\n\n---\n\n${formattedReply}`
      : formattedReply;

    // Update the ticket
    const { error: updateError } = await supabase
      .from("support_tickets")
      .update({
        ayn_notes: newNotes,
        status: ticket.status === "pending" ? "in_progress" : ticket.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);

    if (updateError) {
      console.error("Error updating ticket:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update ticket" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully updated ticket:", ticket.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ticketId: ticket.id,
        message: "Reply captured and ticket updated" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing inbound email:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
