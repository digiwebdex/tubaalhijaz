import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tracking_id } = await req.json();

    if (!tracking_id || typeof tracking_id !== "string") {
      return new Response(JSON.stringify({ error: "tracking_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("bookings")
      .select("tracking_id, total_amount, paid_amount, due_amount, status, created_at, num_travelers, guest_name, packages(name, type)")
      .eq("tracking_id", tracking_id.toUpperCase())
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ booking: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return only safe public fields
    return new Response(JSON.stringify({
      booking: {
        tracking_id: data.tracking_id,
        total_amount: data.total_amount,
        paid_amount: data.paid_amount,
        due_amount: data.due_amount,
        status: data.status,
        created_at: data.created_at,
        num_travelers: data.num_travelers,
        guest_name: data.guest_name,
        packages: data.packages,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
