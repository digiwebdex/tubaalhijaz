import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().slice(0, 10);
    const results: any = { tickets: 0, visa: 0, refunds: 0, notified: 0 };

    // Find overdue ticket bookings
    const { data: tickets } = await supabase
      .from("ticket_bookings")
      .select("id, invoice_no, passenger_name, billing_name, customer_due, expected_collection_date")
      .gt("customer_due", 0)
      .eq("status", "active")
      .not("expected_collection_date", "is", null)
      .lt("expected_collection_date", today);
    results.tickets = tickets?.length || 0;

    // Find overdue visa
    const { data: visas } = await supabase
      .from("visa_applications")
      .select("id, invoice_no, applicant_name, billing_name, customer_due, expected_collection_date")
      .gt("customer_due", 0)
      .eq("status", "active")
      .not("expected_collection_date", "is", null)
      .lt("expected_collection_date", today);
    results.visa = visas?.length || 0;

    // Find overdue refunds
    const { data: refunds } = await supabase
      .from("ticket_refunds")
      .select("id, invoice_no, passenger_name, billing_name, due, refund_date")
      .gt("due", 0)
      .eq("status", "active");
    results.refunds = refunds?.length || 0;

    // Log alerts to notification_logs
    const allAlerts = [
      ...(tickets || []).map((t: any) => ({ type: "ticket", ...t, name: t.billing_name || t.passenger_name, due: t.customer_due })),
      ...(visas || []).map((v: any) => ({ type: "visa", ...v, name: v.billing_name || v.applicant_name, due: v.customer_due })),
      ...(refunds || []).map((r: any) => ({ type: "refund", ...r, name: r.billing_name || r.passenger_name })),
    ];

    for (const alert of allAlerts) {
      await supabase.from("notification_logs").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        event_type: "due_alert",
        channel: "system",
        recipient: alert.name || "unknown",
        message: `Overdue ${alert.type} invoice ${alert.invoice_no}: ${alert.name} owes ${alert.due} BDT`,
        status: "logged",
      });
      results.notified++;
    }

    return new Response(JSON.stringify({ success: true, ...results, date: today }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
