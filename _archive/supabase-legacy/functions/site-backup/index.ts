import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  "profiles", "bookings", "booking_members", "booking_documents",
  "payments", "packages", "installment_plans",
  "hotels", "hotel_rooms", "hotel_bookings",
  "moallems", "moallem_payments", "moallem_commission_payments",
  "supplier_agents", "supplier_agent_payments",
  "expenses", "transactions", "accounts", "financial_summary",
  "notification_logs", "notification_settings",
  "user_roles", "site_content", "company_settings",
  "blog_posts", "cms_versions",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const backupData: Record<string, any[]> = {};
    const stats: { name: string; rows: number }[] = [];

    for (const table of TABLES) {
      try {
        const { data, error } = await supabase.from(table).select("*");
        if (error) {
          console.warn(`Failed to fetch ${table}: ${error.message}`);
          stats.push({ name: table, rows: -1 });
          continue;
        }
        backupData[table] = data || [];
        stats.push({ name: table, rows: (data || []).length });
      } catch (e) {
        console.warn(`Error processing ${table}:`, e);
        stats.push({ name: table, rows: -1 });
      }
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const fileName = `backup_${timestamp}.json`;

    const jsonStr = JSON.stringify({
      created_at: now.toISOString(),
      tables: backupData,
      stats,
    });

    const { error: uploadError } = await supabase.storage
      .from("site-backups")
      .upload(fileName, new Blob([jsonStr], { type: "application/json" }), {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    return new Response(
      JSON.stringify({ success: true, fileName, stats, size: jsonStr.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
