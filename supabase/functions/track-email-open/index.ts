import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 
  0x01, 0x00, 0x3b
]);

const handler = async (req: Request): Promise<Response> => {
  // Always return the tracking pixel image, even on error
  const pixelResponse = () => new Response(TRACKING_PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Access-Control-Allow-Origin": "*",
    },
  });

  try {
    // Get tracking ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const trackingId = pathParts[pathParts.length - 1]?.replace('.gif', '');

    if (!trackingId || trackingId === 'track-email-open') {
      console.log("No tracking ID provided");
      return pixelResponse();
    }

    console.log(`Email open tracked: ${trackingId}`);

    // Update database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, check if this email has been opened before
    const { data: existingLog } = await supabase
      .from("vip_email_logs")
      .select("opened_at, open_count")
      .eq("tracking_id", trackingId)
      .maybeSingle();

    if (existingLog) {
      // Update with new open count, set opened_at only if first open
      const { error } = await supabase
        .from("vip_email_logs")
        .update({
          opened_at: existingLog.opened_at || new Date().toISOString(),
          open_count: (existingLog.open_count || 0) + 1,
        })
        .eq("tracking_id", trackingId);

      if (error) {
        console.error("Database update error:", error);
      } else {
        console.log(`Successfully tracked open for: ${trackingId} (count: ${(existingLog.open_count || 0) + 1})`);
      }
    } else {
      console.log(`No email log found for tracking ID: ${trackingId}`);
    }

  } catch (error) {
    console.error("Tracking error:", error);
  }

  // Always return pixel regardless of DB success
  return pixelResponse();
};

serve(handler);
