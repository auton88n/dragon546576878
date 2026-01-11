import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = "https://hekgkfdunwpxqbrotfpn.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Destination URL mapping
const DESTINATIONS: Record<string, string> = {
  home: "https://almufaijer.com",
  book: "https://almufaijer.com/book",
  contact: "https://almufaijer.com/contact",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const campaignId = pathParts[pathParts.length - 1]; // Last segment is campaign ID
    const destination = url.searchParams.get("to") || "home";
    const campaignName = url.searchParams.get("name") || campaignId;

    // Get destination URL
    const redirectUrl = DESTINATIONS[destination] || DESTINATIONS.home;

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Log the scan
    const userAgent = req.headers.get("user-agent") || null;
    const referrer = req.headers.get("referer") || null;

    await supabase.from("marketing_qr_scans").insert({
      campaign_id: campaignId,
      campaign_name: decodeURIComponent(campaignName),
      destination,
      user_agent: userAgent,
      referrer,
    });

    // Redirect to destination
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: redirectUrl,
      },
    });
  } catch (error) {
    console.error("Error tracking QR scan:", error);
    // Even on error, redirect to home
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: "https://almufaijer.com",
      },
    });
  }
});
