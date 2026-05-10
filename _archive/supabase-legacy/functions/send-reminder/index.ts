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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if called manually (with auth) or via cron (no auth)
    const authHeader = req.headers.get("Authorization");
    const isCron = !authHeader || authHeader === `Bearer ${anonKey}`;

    if (!isCron) {
      // Verify admin for manual calls
      const token = authHeader!.replace("Bearer ", "");
      if (token !== serviceKey) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader! } },
        });
        const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
        if (claimsError || !claimsData?.claims) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const userId = claimsData.claims.sub;
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: "Admin access required" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Parse body for manual single-reminder calls
    let manualData: any = null;
    try {
      manualData = await req.json();
    } catch {
      // No body = auto mode (cron)
    }

    if (manualData?.phone) {
      // Manual single reminder (existing behavior)
      const { phone, customer_name, tracking_id, amount, due_date, installment_number } = manualData;
      const message = `Dear ${customer_name}, installment #${installment_number} of ৳${Number(amount).toLocaleString()} for booking ${tracking_id} is due on ${due_date}. Please pay at the earliest. TRIP TASTIC: 01711-999910`;

      const apiKey = Deno.env.get("BULKSMSBD_API_KEY");
      const senderId = Deno.env.get("BULKSMSBD_SENDER_ID");

      if (!apiKey || !senderId) {
        return new Response(JSON.stringify({ error: "SMS credentials not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const smsUrl = `https://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=text&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`;
      const smsRes = await fetch(smsUrl);
      const smsText = await smsRes.text();

      return new Response(JSON.stringify({ success: true, sms_response: smsText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AUTO REMINDER MODE (CRON) ──
    // Find all overdue or due-today payments
    const today = new Date().toISOString().split("T")[0];
    const { data: duePayments, error: dueErr } = await supabase
      .from("payments")
      .select("*, bookings(tracking_id, total_amount, paid_amount, due_amount, user_id, guest_name, guest_phone, guest_email)")
      .eq("status", "pending")
      .lte("due_date", today)
      .order("due_date");

    if (dueErr) {
      console.error("Error fetching due payments:", dueErr);
      return new Response(JSON.stringify({ error: dueErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "noreply@example.com";
    const smsApiKey = Deno.env.get("BULKSMSBD_API_KEY");
    const smsSenderId = Deno.env.get("BULKSMSBD_SENDER_ID");

    for (const payment of (duePayments || [])) {
      const booking = payment.bookings;
      if (!booking) continue;

      // Get customer info
      let name = booking.guest_name || "Valued Customer";
      let phone = booking.guest_phone;
      let email: string | null = booking.guest_email;

      if (booking.user_id) {
        const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("user_id", booking.user_id).single();
        if (profile) {
          name = profile.full_name || name;
          phone = profile.phone || phone;
        }
        const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
        email = authUser?.user?.email || email;
      }

      const dueDate = payment.due_date ? new Date(payment.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
      const result: any = { payment_id: payment.id, tracking_id: booking.tracking_id, sms: null, email: null };

      // Send SMS
      if (smsApiKey && phone) {
        try {
          const message = `Dear ${name}, installment #${payment.installment_number || 1} of ৳${Number(payment.amount).toLocaleString()} for booking ${booking.tracking_id} is overdue (${dueDate}). Please pay immediately. TRIP TASTIC: 01711-999910`;
          const smsUrl = `https://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(smsApiKey)}&type=text&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(smsSenderId || "")}&message=${encodeURIComponent(message)}`;
          const smsRes = await fetch(smsUrl);
          result.sms = smsRes.ok ? "sent" : "failed";

          await supabase.from("notification_logs").insert({
            user_id: booking.user_id || "00000000-0000-0000-0000-000000000000",
            booking_id: payment.booking_id, payment_id: payment.id,
            event_type: "payment_reminder", channel: "sms", recipient: phone,
            message, status: smsRes.ok ? "sent" : "failed",
          });
        } catch (e) {
          result.sms = `error: ${e.message}`;
        }
      }

      // Send Email
      if (resendKey && email) {
        try {
          const subject = `⏰ Payment Overdue — ${booking.tracking_id}`;
          const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fff;border:1px solid #e0e0e0;border-radius:8px">
            <div style="text-align:center;padding:15px 0;border-bottom:2px solid #d97706;margin-bottom:20px">
              <h1 style="color:#d97706;margin:0">Payment Reminder</h1>
            </div>
            <p>Dear <strong>${name}</strong>,</p>
            <p>Your installment <strong>#${payment.installment_number || 1}</strong> of <strong>৳${Number(payment.amount).toLocaleString()}</strong> for booking <strong>${booking.tracking_id}</strong> was due on <strong>${dueDate}</strong>.</p>
            <p style="color:#d97706;font-weight:bold">Please make your payment as soon as possible.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9">Amount Due</td><td style="padding:8px;border:1px solid #ddd">৳${Number(payment.amount).toLocaleString()}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9">Total Due</td><td style="padding:8px;border:1px solid #ddd">৳${Number(booking.due_amount || 0).toLocaleString()}</td></tr>
            </table>
            <p style="font-size:12px;color:#999">TRIP TASTIC | +880 1711-999910</p>
          </div>`;

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: fromEmail, to: [email], subject, html }),
          });
          result.email = emailRes.ok ? "sent" : "failed";

          await supabase.from("notification_logs").insert({
            user_id: booking.user_id || "00000000-0000-0000-0000-000000000000",
            booking_id: payment.booking_id, payment_id: payment.id,
            event_type: "payment_reminder", channel: "email", recipient: email,
            subject, message: html, status: emailRes.ok ? "sent" : "failed",
          });
        } catch (e) {
          result.email = `error: ${e.message}`;
        }
      }

      results.push(result);
    }

    console.log(`Auto-reminder: processed ${results.length} overdue payments`);

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
