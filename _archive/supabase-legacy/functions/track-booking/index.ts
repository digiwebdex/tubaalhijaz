import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tracking_id, phone } = await req.json();

    // Validate input
    if (!tracking_id && !phone) {
      return new Response(
        JSON.stringify({ error: "tracking_id or phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate tracking_id format (alphanumeric with dash, max 20 chars)
    if (tracking_id && (typeof tracking_id !== "string" || tracking_id.length > 20 || !/^[A-Z0-9\-]+$/i.test(tracking_id))) {
      return new Response(
        JSON.stringify({ error: "Invalid tracking ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format
    if (phone && (typeof phone !== "string" || phone.length > 20 || !/^[\+]?[0-9\s\-]{7,15}$/.test(phone.trim()))) {
      return new Response(
        JSON.stringify({ error: "Invalid phone format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let booking = null;

    if (phone) {
      const { data } = await supabase
        .from("bookings")
        .select("tracking_id, status, guest_name, num_travelers, due_amount, notes, created_at, packages(name, type)")
        .eq("guest_phone", phone.trim())
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) booking = data[0];
    } else {
      const id = tracking_id.toUpperCase();
      const { data } = await supabase
        .from("bookings")
        .select("tracking_id, status, guest_name, num_travelers, due_amount, notes, created_at, packages(name, type)")
        .eq("tracking_id", id)
        .maybeSingle();

      booking = data;
    }

    if (!booking) {
      return new Response(
        JSON.stringify({ booking: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return only safe, minimal fields — no user_id, email, phone, passport, address, financial amounts
    const safeBooking = {
      tracking_id: booking.tracking_id,
      status: booking.status,
      guest_name: booking.guest_name,
      num_travelers: booking.num_travelers,
      due_amount: booking.due_amount,
      notes: booking.notes,
      created_at: booking.created_at,
      packages: booking.packages,
    };

    return new Response(
      JSON.stringify({ booking: safeBooking }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
