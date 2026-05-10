import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type NotificationType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_completed"
  | "booking_status_updated"
  | "payment_received"
  | "payment_reminder"
  | "supplier_payment_recorded"
  | "commission_paid"
  | "custom";

interface NotificationRequest {
  type: NotificationType;
  channels: ("email" | "sms")[];
  user_id: string;
  booking_id?: string;
  payment_id?: string;
  custom_subject?: string;
  custom_message?: string;
  amount?: number;
  due_date?: string;
  installment_number?: number;
  // Extended fields
  moallem_name?: string;
  supplier_name?: string;
  new_status?: string;
}

// --- Email templates ---
function getEmailTemplate(type: NotificationType, d: any) {
  const header = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;border:1px solid #e0e0e0;border-radius:8px">
    <div style="text-align:center;padding:15px 0;border-bottom:2px solid #E8860B;margin-bottom:20px">
      <h1 style="color:#E8860B;margin:0;font-size:22px">TRIP TASTIC</h1>
      <p style="color:#888;margin:4px 0 0;font-size:12px">Hajj & Umrah Services</p>
    </div>`;
  const footer = `<hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"/>
    <p style="font-size:11px;color:#999;text-align:center">
      TRIP TASTIC | +880 1711-999910 | info@triptastic.com.bd<br/>
      595/1, Milk Vita Road, Three-Way Intersection, Dewla, Tangail Sadar, Tangail
    </p></div>`;
  const table = (rows: [string, string][]) => `<table style="width:100%;border-collapse:collapse;margin:16px 0">${rows.map(([k, v]) => `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:40%;background:#f9f9f9">${k}</td><td style="padding:8px;border:1px solid #ddd">${v}</td></tr>`).join("")}</table>`;

  switch (type) {
    case "booking_created":
      return {
        subject: `📋 Booking Created — ${d.trackingId}`,
        html: `${header}<h2 style="color:#E8860B">Booking Created</h2><p>Dear <strong>${d.name}</strong>,</p><p>Your booking for <strong>${d.packageName}</strong> has been created.</p>${table([["Tracking ID", d.trackingId], ["Package", d.packageName], ["Total Amount", `৳${d.totalAmount.toLocaleString()}`], ["Contact", "+880 1711-999910"]])}<p>We'll keep you updated. Thank you!</p>${footer}`,
      };
    case "booking_confirmed":
      return {
        subject: `✅ Booking Confirmed — ${d.trackingId}`,
        html: `${header}<h2 style="color:#1a7f37">Booking Confirmed</h2><p>Dear <strong>${d.name}</strong>,</p><p>Your booking <strong>${d.trackingId}</strong> has been confirmed.</p>${table([["Tracking ID", d.trackingId], ["Total", `৳${d.totalAmount.toLocaleString()}`], ["Paid", `৳${d.paidAmount.toLocaleString()}`], ["Due", `৳${d.dueAmount.toLocaleString()}`]])}<p>Please ensure timely payments. Thank you!</p>${footer}`,
      };
    case "booking_completed":
      return {
        subject: `🎉 Booking Completed — ${d.trackingId}`,
        html: `${header}<h2 style="color:#1a7f37">Payment Completed ✅</h2><p>Dear <strong>${d.name}</strong>,</p><p>Your booking <strong>${d.trackingId}</strong> is fully paid!</p>${table([["Tracking ID", d.trackingId], ["Total Paid", `৳${d.totalAmount.toLocaleString()}`], ["Status", "Completed"]])}<p>Thank you for choosing TRIP TASTIC!</p>${footer}`,
      };
    case "booking_status_updated":
      return {
        subject: `🔄 Booking Status Updated — ${d.trackingId}`,
        html: `${header}<h2 style="color:#2563eb">Booking Status Updated</h2><p>Dear <strong>${d.name}</strong>,</p><p>Your booking <strong>${d.trackingId}</strong> status has been updated to <strong>${d.newStatus || "Updated"}</strong>.</p>${table([["Tracking ID", d.trackingId], ["New Status", d.newStatus || "Updated"], ["Total", `৳${d.totalAmount.toLocaleString()}`], ["Due", `৳${d.dueAmount.toLocaleString()}`]])}<p>Contact us for any queries: +880 1711-999910</p>${footer}`,
      };
    case "payment_received":
      return {
        subject: `💰 Payment Received — ${d.trackingId}`,
        html: `${header}<h2 style="color:#b8860b">Payment Received</h2><p>Dear <strong>${d.name}</strong>,</p><p>We received <strong>৳${(d.amount || 0).toLocaleString()}</strong> for booking <strong>${d.trackingId}</strong>.</p>${table([["Amount Paid", `৳${(d.amount || 0).toLocaleString()}`], ["Total Paid", `৳${d.paidAmount.toLocaleString()}`], ["Remaining", `৳${d.dueAmount.toLocaleString()}`]])}<p>Thank you for your payment!</p>${footer}`,
      };
    case "payment_reminder":
      return {
        subject: `⏰ Payment Reminder — ${d.trackingId}`,
        html: `${header}<h2 style="color:#d97706">Payment Reminder</h2><p>Dear <strong>${d.name}</strong>,</p><p>Installment <strong>#${d.installmentNumber || 1}</strong> of <strong>৳${(d.amount || 0).toLocaleString()}</strong> for booking <strong>${d.trackingId}</strong> is due on <strong>${d.dueDate}</strong>.</p>${table([["Installment", `#${d.installmentNumber || 1}`], ["Amount Due", `৳${(d.amount || 0).toLocaleString()}`], ["Due Date", d.dueDate]])}<p>Please pay at the earliest. Contact: +880 1711-999910</p>${footer}`,
      };
    case "supplier_payment_recorded":
      return {
        subject: `📦 Supplier Payment Recorded — ${d.trackingId || "N/A"}`,
        html: `${header}<h2 style="color:#2563eb">Supplier Payment Recorded</h2><p>A payment of <strong>৳${(d.amount || 0).toLocaleString()}</strong> has been recorded for supplier <strong>${d.supplierName || "N/A"}</strong>.</p>${table([["Supplier", d.supplierName || "N/A"], ["Amount", `৳${(d.amount || 0).toLocaleString()}`], ["Booking", d.trackingId || "N/A"]])}<p>This is an automated notification for your records.</p>${footer}`,
      };
    case "commission_paid":
      return {
        subject: `💼 Commission Paid — ${d.moallemName || "Moallem"}`,
        html: `${header}<h2 style="color:#b8860b">Commission Payment</h2><p>A commission payment of <strong>৳${(d.amount || 0).toLocaleString()}</strong> has been recorded for Moallem <strong>${d.moallemName || "N/A"}</strong>.</p>${table([["Moallem", d.moallemName || "N/A"], ["Amount", `৳${(d.amount || 0).toLocaleString()}`], ["Booking", d.trackingId || "N/A"]])}<p>This is an automated notification.</p>${footer}`,
      };
    case "custom":
      return {
        subject: d.customSubject || "Notification from TRIP TASTIC",
        html: `${header}<h2 style="color:#b8860b">${d.customSubject || "Message"}</h2><p>Dear <strong>${d.name}</strong>,</p><p>${d.customMessage || ""}</p>${footer}`,
      };
    default:
      return { subject: "Notification", html: `<p>${d.customMessage || ""}</p>` };
  }
}

// --- SMS templates ---
function getSmsMessage(type: NotificationType, d: any): string {
  const contact = "TRIP TASTIC: 01711-999910";
  switch (type) {
    case "booking_created":
      return `Dear ${d.name}, booking ${d.trackingId} for ${d.packageName} created. Total: ৳${d.totalAmount.toLocaleString()}. ${contact}`;
    case "booking_confirmed":
      return `Dear ${d.name}, booking ${d.trackingId} confirmed. Due: ৳${d.dueAmount.toLocaleString()}. ${contact}`;
    case "booking_completed":
      return `Dear ${d.name}, booking ${d.trackingId} fully paid (৳${d.totalAmount.toLocaleString()}). Status: Completed. ${contact}`;
    case "booking_status_updated":
      return `Dear ${d.name}, booking ${d.trackingId} status: ${d.newStatus || "Updated"}. Due: ৳${d.dueAmount.toLocaleString()}. ${contact}`;
    case "payment_received":
      return `Dear ${d.name}, ৳${(d.amount || 0).toLocaleString()} received for ${d.trackingId}. Due: ৳${d.dueAmount.toLocaleString()}. ${contact}`;
    case "payment_reminder":
      return `Dear ${d.name}, installment #${d.installmentNumber || 1} of ৳${(d.amount || 0).toLocaleString()} for ${d.trackingId} due on ${d.dueDate}. ${contact}`;
    case "supplier_payment_recorded":
      return `Supplier payment: ৳${(d.amount || 0).toLocaleString()} recorded for ${d.supplierName || "supplier"}. Booking: ${d.trackingId || "N/A"}. ${contact}`;
    case "commission_paid":
      return `Commission: ৳${(d.amount || 0).toLocaleString()} paid to ${d.moallemName || "moallem"}. Booking: ${d.trackingId || "N/A"}. ${contact}`;
    case "custom":
      return d.customMessage || "";
    default:
      return d.customMessage || "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    let callerUserId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      if (token !== serviceKey) {
        const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
        if (claimsError || !claimsData?.claims) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        callerUserId = claimsData.claims.sub as string;
        const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: callerUserId, _role: "admin" });
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: "Admin access required" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const body: NotificationRequest = await req.json();
    const { type, channels, user_id, booking_id, payment_id } = body;

    if (!type || !channels?.length || !user_id) {
      return new Response(JSON.stringify({ error: "type, channels, and user_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user data
    const { data: profile } = await adminClient.from("profiles").select("full_name, phone").eq("user_id", user_id).single();
    const { data: authUser } = await adminClient.auth.admin.getUserById(user_id);
    const email = authUser?.user?.email;
    const name = profile?.full_name || "Valued Customer";
    const phone = profile?.phone;

    // Fetch booking data
    let booking: any = null;
    if (booking_id) {
      const { data } = await adminClient.from("bookings").select("*, packages(name)").eq("id", booking_id).single();
      booking = data;
    }

    // Fetch payment data
    let payment: any = null;
    if (payment_id) {
      const { data } = await adminClient.from("payments").select("*").eq("id", payment_id).single();
      payment = data;
    }

    const templateData = {
      name,
      trackingId: booking?.tracking_id || "N/A",
      packageName: booking?.packages?.name || "Package",
      totalAmount: Number(booking?.total_amount || 0),
      paidAmount: Number(booking?.paid_amount || 0),
      dueAmount: Number(booking?.due_amount || booking?.total_amount || 0) - Number(booking?.paid_amount || 0),
      amount: body.amount || Number(payment?.amount || 0),
      dueDate: body.due_date || (payment?.due_date ? new Date(payment.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"),
      installmentNumber: body.installment_number || payment?.installment_number || 1,
      customSubject: body.custom_subject,
      customMessage: body.custom_message,
      moallemName: body.moallem_name,
      supplierName: body.supplier_name,
      newStatus: body.new_status,
    };

    const results: { email?: string; sms?: string } = {};

    // --- Send Email ---
    if (channels.includes("email")) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "noreply@example.com";

      if (resendKey && email) {
        try {
          const { subject, html } = getEmailTemplate(type, templateData);
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: fromEmail, to: [email], subject, html }),
          });
          const emailData = await emailRes.json();
          results.email = emailRes.ok ? "sent" : `failed: ${JSON.stringify(emailData)}`;

          await adminClient.from("notification_logs").insert({
            user_id, booking_id: booking_id || null, payment_id: payment_id || null,
            event_type: type, channel: "email", recipient: email, subject,
            message: html, status: emailRes.ok ? "sent" : "failed",
            error_detail: emailRes.ok ? null : JSON.stringify(emailData), sent_by: callerUserId,
          });
        } catch (e) {
          results.email = `error: ${e.message}`;
          await adminClient.from("notification_logs").insert({
            user_id, booking_id: booking_id || null, payment_id: payment_id || null,
            event_type: type, channel: "email", recipient: email || "unknown",
            subject: "Error", message: "", status: "failed", error_detail: e.message, sent_by: callerUserId,
          });
        }
      } else {
        results.email = !resendKey ? "skipped: no API key" : "skipped: no email";
      }
    }

    // --- Send SMS ---
    if (channels.includes("sms")) {
      const smsApiKey = Deno.env.get("BULKSMSBD_API_KEY");
      const smsSenderId = Deno.env.get("BULKSMSBD_SENDER_ID");

      if (smsApiKey && phone) {
        try {
          const message = getSmsMessage(type, templateData);
          const smsUrl = `https://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(smsApiKey)}&type=text&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(smsSenderId || "")}&message=${encodeURIComponent(message)}`;
          const smsRes = await fetch(smsUrl);
          const smsText = await smsRes.text();
          results.sms = smsRes.ok ? "sent" : `failed: ${smsText}`;

          await adminClient.from("notification_logs").insert({
            user_id, booking_id: booking_id || null, payment_id: payment_id || null,
            event_type: type, channel: "sms", recipient: phone, subject: null,
            message, status: smsRes.ok ? "sent" : "failed",
            error_detail: smsRes.ok ? null : smsText, sent_by: callerUserId,
          });
        } catch (e) {
          results.sms = `error: ${e.message}`;
          await adminClient.from("notification_logs").insert({
            user_id, booking_id: booking_id || null, payment_id: payment_id || null,
            event_type: type, channel: "sms", recipient: phone || "unknown",
            subject: null, message: "", status: "failed", error_detail: e.message, sent_by: callerUserId,
          });
        }
      } else {
        results.sms = !smsApiKey ? "skipped: no API key" : "skipped: no phone";
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
