import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-signature, svix-timestamp",
};

interface ResendInboundEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  created_at?: string;
}

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: ResendInboundEmail;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log all headers for debugging
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log("Received webhook with headers:", JSON.stringify(headers, null, 2));

    // For Resend webhooks, verify using svix signature
    const svixId = req.headers.get("svix-id");
    const svixSignature = req.headers.get("svix-signature");
    const svixTimestamp = req.headers.get("svix-timestamp");

    // Check if this looks like a Resend webhook (has svix headers)
    const isResendWebhook = svixId && svixSignature && svixTimestamp;
    
    if (!isResendWebhook) {
      console.log("Missing svix headers - this might not be a Resend webhook");
      // Still process if it's a direct test, but log it
    }

    // Parse the request body
    const rawBody = await req.text();
    console.log("Raw body:", rawBody.substring(0, 500));

    let emailData: ResendInboundEmail;
    
    try {
      const payload = JSON.parse(rawBody);
      
      // Resend wraps the email data in a { type, data } structure
      if (payload.type === "email.received" && payload.data) {
        emailData = payload.data;
      } else if (payload.from && payload.subject) {
        // Direct email format (for testing)
        emailData = payload;
      } else {
        console.log("Unexpected payload format:", JSON.stringify(payload, null, 2));
        return new Response(
          JSON.stringify({ success: true, message: "Unrecognized payload format, ignored" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received inbound email:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
    });

    // Extract ticket reference from subject line
    // Format: Re: [Souq Almufaijer] HIGH - Issue title - #8BCE2742
    const ticketRefMatch = emailData.subject.match(/#([A-F0-9]{8})/i);
    
    if (!ticketRefMatch) {
      console.log("No ticket reference found in subject:", emailData.subject);
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
    // Since UUID doesn't support ILIKE, we fetch recent tickets and match in code
    const { data: recentTickets, error: searchError } = await supabase
      .from("support_tickets")
      .select("id, subject, status, ayn_notes")
      .order("created_at", { ascending: false })
      .limit(100);

    if (searchError) {
      console.error("Error searching for tickets:", searchError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the ticket whose ID starts with the extracted prefix
    const ticket = recentTickets?.find(t => 
      t.id.toUpperCase().startsWith(ticketRefPrefix)
    );

    if (!ticket) {
      console.log("No ticket found with reference:", ticketRefPrefix);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Ticket not found, email ignored" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found ticket:", ticket.id, ticket.subject);

    // Extract the reply content (clean up email signature and quoted text)
    let replyContent = emailData.text || "";
    
    // Remove common email signature patterns
    replyContent = replyContent
      .split(/^--\s*$/m)[0]  // Remove signature after "--"
      .split(/^On .* wrote:$/m)[0]  // Remove quoted reply header
      .split(/^>.*$/gm).join("")  // Remove quoted lines
      .trim();

    // If reply is empty after cleanup, use the full text
    if (!replyContent) {
      replyContent = emailData.text || "No content";
    }

    // Format the new note with timestamp
    const timestamp = new Date().toISOString();
    const formattedReply = `[${timestamp}]\nFrom: ${emailData.from}\n\n${replyContent}`;

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
