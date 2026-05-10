import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SHA-256 hash helper for user data
async function sha256(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const encoded = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FB_ACCESS_TOKEN = Deno.env.get("FB_CONVERSIONS_API_TOKEN");
    const FB_PIXEL_ID = Deno.env.get("FB_PIXEL_ID");

    if (!FB_ACCESS_TOKEN || !FB_PIXEL_ID) {
      return new Response(
        JSON.stringify({ error: "Facebook Conversions API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      event_name,
      event_id,
      event_time,
      user_data = {},
      custom_data = {},
      event_source_url,
      action_source = "website",
      test_event_code,
    } = body;

    if (!event_name) {
      return new Response(
        JSON.stringify({ error: "event_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash PII fields per Facebook requirements
    const hashedUserData: Record<string, string> = {};

    if (user_data.em) hashedUserData.em = [await sha256(user_data.em)];
    if (user_data.ph) hashedUserData.ph = [await sha256(user_data.ph.replace(/[^0-9]/g, ""))];
    if (user_data.fn) hashedUserData.fn = [await sha256(user_data.fn)];
    if (user_data.ln) hashedUserData.ln = [await sha256(user_data.ln)];
    if (user_data.fbp) hashedUserData.fbp = user_data.fbp;
    if (user_data.fbc) hashedUserData.fbc = user_data.fbc;
    if (user_data.client_user_agent) hashedUserData.client_user_agent = user_data.client_user_agent;

    // Get client IP from request headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    if (clientIp) hashedUserData.client_ip_address = clientIp;

    const eventData: Record<string, any> = {
      event_name,
      event_time: event_time || Math.floor(Date.now() / 1000),
      action_source,
      user_data: hashedUserData,
    };

    if (event_id) eventData.event_id = event_id;
    if (event_source_url) eventData.event_source_url = event_source_url;
    if (Object.keys(custom_data).length > 0) eventData.custom_data = custom_data;

    const payload: Record<string, any> = {
      data: [eventData],
    };

    if (test_event_code) {
      payload.test_event_code = test_event_code;
    }

    // Send to Facebook Conversions API
    const fbResponse = await fetch(
      `https://graph.facebook.com/v21.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      console.error("Facebook CAPI error:", JSON.stringify(fbResult));
      return new Response(
        JSON.stringify({ error: "Facebook API error", details: fbResult }),
        { status: fbResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        events_received: fbResult.events_received,
        messages: fbResult.messages,
        fbtrace_id: fbResult.fbtrace_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("CAPI Edge Function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
