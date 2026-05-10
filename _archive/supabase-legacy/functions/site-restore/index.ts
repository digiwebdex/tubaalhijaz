import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Order matters: delete in reverse dependency order, insert in forward order
const RESTORE_ORDER = [
  "accounts", "packages", "installment_plans", "hotels", "hotel_rooms",
  "moallems", "supplier_agents", "notification_settings", "company_settings",
  "site_content", "cms_versions", "blog_posts",
  "profiles", "user_roles",
  "bookings", "booking_members", "booking_documents",
  "payments", "hotel_bookings",
  "moallem_payments", "moallem_commission_payments",
  "supplier_agent_payments", "expenses", "transactions",
  "notification_logs", "financial_summary",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, mode } = await req.json();
    // mode: "full" (delete all & restore) or "merge" (upsert without deleting)
    
    if (!fileName) throw new Error("fileName is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Download backup file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("site-backups")
      .download(fileName);

    if (downloadError || !fileData) {
      throw new Error(`Download failed: ${downloadError?.message || "File not found"}`);
    }

    const text = await fileData.text();
    const backup = JSON.parse(text);
    const tables = backup.tables as Record<string, any[]>;

    if (!tables) throw new Error("Invalid backup format");

    const results: { table: string; status: string; rows: number }[] = [];
    const restoreMode = mode || "full";

    if (restoreMode === "full") {
      // Delete in reverse order to respect foreign keys
      const reverseOrder = [...RESTORE_ORDER].reverse();
      for (const table of reverseOrder) {
        if (tables[table] !== undefined) {
          try {
            // Delete all rows - use a filter that matches everything
            await supabase.from(table).delete().gte("id", "00000000-0000-0000-0000-000000000000");
          } catch (e) {
            console.warn(`Failed to clear ${table}:`, e);
          }
        }
      }
    }

    // Insert in forward order
    for (const table of RESTORE_ORDER) {
      const rows = tables[table];
      if (!rows || rows.length === 0) {
        results.push({ table, status: "skipped", rows: 0 });
        continue;
      }

      try {
        // Insert in batches of 500
        const batchSize = 500;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
          if (error) {
            console.warn(`Error restoring ${table} batch:`, error.message);
            results.push({ table, status: `error: ${error.message}`, rows: inserted });
            break;
          }
          inserted += batch.length;
        }
        if (!results.find(r => r.table === table)) {
          results.push({ table, status: "restored", rows: inserted });
        }
      } catch (e) {
        console.warn(`Error restoring ${table}:`, e);
        results.push({ table, status: `error: ${e.message}`, rows: 0 });
      }
    }

    return new Response(
      JSON.stringify({ success: true, mode: restoreMode, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Restore error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
