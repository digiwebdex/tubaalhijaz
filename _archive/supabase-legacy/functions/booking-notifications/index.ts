import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch booking with package
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("*, packages(name)")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      console.error("Booking fetch error:", bookingErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile separately (no FK relationship)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", booking.user_id)
      .single();

    // Get user email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
    const email = authUser?.user?.email;
    const fullName = profile?.full_name || "Valued Customer";
    const phone = profile?.phone;
    const packageName = booking.packages?.name || "Umrah Package";
    const trackingId = booking.tracking_id;

    const results = { email: null as string | null, sms: null as string | null };

    // --- Send Email via Resend ---
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "noreply@example.com";

    if (resendKey && email) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: `✅ Booking ${trackingId} - Payment Complete!`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                <h2 style="color:#1a7f37">Payment Confirmed ✅</h2>
                <p>Dear <strong>${fullName}</strong>,</p>
                <p>Great news! Your booking <strong>${trackingId}</strong> for <strong>${packageName}</strong> has been fully paid.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0">
                  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Tracking ID</td><td style="padding:8px;border:1px solid #ddd">${trackingId}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Package</td><td style="padding:8px;border:1px solid #ddd">${packageName}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Total Paid</td><td style="padding:8px;border:1px solid #ddd">৳${Number(booking.total_amount).toLocaleString()}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Status</td><td style="padding:8px;border:1px solid #ddd;color:#1a7f37">Completed</td></tr>
                </table>
                <p>Thank you for choosing our services. We look forward to serving you!</p>
              </div>
            `,
          }),
        });
        const emailData = await emailRes.json();
        results.email = emailRes.ok ? "sent" : `failed: ${JSON.stringify(emailData)}`;
        console.log("Email result:", results.email);
      } catch (e) {
        results.email = `error: ${e.message}`;
        console.error("Email error:", e);
      }
    } else {
      results.email = !resendKey ? "skipped: no API key" : "skipped: no email";
    }

    // --- Send SMS via Bulk SMS BD ---
    const smsApiKey = Deno.env.get("BULKSMSBD_API_KEY");
    const smsSenderId = Deno.env.get("BULKSMSBD_SENDER_ID");

    if (smsApiKey && phone) {
      try {
        const message = `Dear ${fullName}, your booking ${trackingId} for ${packageName} is fully paid (৳${Number(booking.total_amount).toLocaleString()}). Status: Completed. Thank you!`;
        const smsUrl = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(smsApiKey)}&type=text&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(smsSenderId || "")}&message=${encodeURIComponent(message)}`;

        const smsRes = await fetch(smsUrl);
        const smsText = await smsRes.text();
        results.sms = smsRes.ok ? `sent: ${smsText}` : `failed: ${smsText}`;
        console.log("SMS result:", results.sms);
      } catch (e) {
        results.sms = `error: ${e.message}`;
        console.error("SMS error:", e);
      }
    } else {
      results.sms = !smsApiKey ? "skipped: no API key" : "skipped: no phone";
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
