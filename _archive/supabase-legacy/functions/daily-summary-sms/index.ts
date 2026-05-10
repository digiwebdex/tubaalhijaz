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
    const smsApiKey = Deno.env.get("BULKSMSBD_API_KEY");
    const smsSenderId = Deno.env.get("BULKSMSBD_SENDER_ID");
    const ownerPhone = "01601505050";

    if (!smsApiKey) {
      return new Response(JSON.stringify({ error: "SMS API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(supabaseUrl, serviceKey);
    const today = new Date().toISOString().split("T")[0];

    // Today's income: completed customer payments
    const { data: todayPayments } = await db
      .from("payments")
      .select("amount")
      .eq("status", "completed")
      .gte("paid_at", `${today}T00:00:00`)
      .lte("paid_at", `${today}T23:59:59`);
    const todayIncome = (todayPayments || []).reduce((s, p) => s + Number(p.amount), 0);

    // Today's moallem payments
    const { data: todayMoallem } = await db
      .from("moallem_payments")
      .select("amount")
      .gte("date", today)
      .lte("date", today);
    const todayMoallemIncome = (todayMoallem || []).reduce((s, p) => s + Number(p.amount), 0);

    // Today's supplier payments
    const { data: todaySupplier } = await db
      .from("supplier_agent_payments")
      .select("amount")
      .gte("date", today)
      .lte("date", today);
    const todaySupplierPaid = (todaySupplier || []).reduce((s, p) => s + Number(p.amount), 0);

    // Overall customer due
    const { data: bookings } = await db
      .from("bookings")
      .select("due_amount");
    const totalCustomerDue = (bookings || []).reduce((s, b) => s + Number(b.due_amount || 0), 0);

    // Moallem due
    const { data: moallems } = await db
      .from("moallems")
      .select("total_due");
    const totalMoallemDue = (moallems || []).reduce((s, m) => s + Number(m.total_due || 0), 0);

    // Supplier due
    const { data: supplierDue } = await db
      .from("bookings")
      .select("supplier_due");
    const totalSupplierDue = (supplierDue || []).reduce((s, b) => s + Number(b.supplier_due || 0), 0);

    const fmt = (n: number) => n.toLocaleString("en-BD");

    const message = [
      `TRIP TASTIC Daily Summary (${today})`,
      ``,
      `Today Income: ৳${fmt(todayIncome + todayMoallemIncome)}`,
      `Today Supplier Paid: ৳${fmt(todaySupplierPaid)}`,
      ``,
      `Customer Due: ৳${fmt(totalCustomerDue)}`,
      `Moallem Due: ৳${fmt(totalMoallemDue)}`,
      `Supplier Due: ৳${fmt(totalSupplierDue)}`,
      ``,
      `Total Bookings Due: ৳${fmt(totalCustomerDue)}`,
    ].join("\n");

    const smsUrl = `https://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(smsApiKey)}&type=text&number=${encodeURIComponent(ownerPhone)}&senderid=${encodeURIComponent(smsSenderId || "")}&message=${encodeURIComponent(message)}`;
    const smsRes = await fetch(smsUrl);
    const smsText = await smsRes.text();

    // Log
    await db.from("notification_logs").insert({
      user_id: "9c56194a-b0f9-4878-ac57-e97371acd199",
      event_type: "daily_summary",
      channel: "sms",
      recipient: ownerPhone,
      subject: "Daily Summary",
      message,
      status: smsRes.ok ? "sent" : "failed",
      error_detail: smsRes.ok ? null : smsText,
    });

    return new Response(JSON.stringify({ success: true, message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Daily summary error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
