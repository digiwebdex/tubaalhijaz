import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIMARY_ADMIN_USER_ID = "9c56194a-b0f9-4878-ac57-e97371acd199";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, target_user_id, updates } = await req.json();

    if (!target_user_id || !action) {
      return new Response(
        JSON.stringify({ error: "target_user_id and action required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Protect primary admin
    if (target_user_id === PRIMARY_ADMIN_USER_ID && (action === "delete" || action === "deactivate")) {
      return new Response(
        JSON.stringify({ error: "Cannot modify primary admin account" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "update") {
      const profileUpdates: Record<string, unknown> = {};
      if (updates?.full_name) profileUpdates.full_name = updates.full_name;
      if (updates?.status) profileUpdates.status = updates.status;

      if (Object.keys(profileUpdates).length > 0) {
        await supabaseAdmin
          .from("profiles")
          .update(profileUpdates)
          .eq("user_id", target_user_id);
      }

      // Update role if provided
      if (updates?.role && target_user_id !== PRIMARY_ADMIN_USER_ID) {
        // Delete existing roles and insert new one
        await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", target_user_id);
        await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: target_user_id, role: updates.role });
      }

      // Update password if provided
      if (updates?.password && updates.password.length >= 6) {
        await supabaseAdmin.auth.admin.updateUser(target_user_id, {
          password: updates.password,
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: "User updated" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "deactivate") {
      await supabaseAdmin
        .from("profiles")
        .update({ status: "inactive" })
        .eq("user_id", target_user_id);

      // Ban the user in auth
      await supabaseAdmin.auth.admin.updateUser(target_user_id, {
        ban_duration: "876000h", // ~100 years
      });

      return new Response(
        JSON.stringify({ success: true, message: "User deactivated" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "activate") {
      await supabaseAdmin
        .from("profiles")
        .update({ status: "active" })
        .eq("user_id", target_user_id);

      await supabaseAdmin.auth.admin.updateUser(target_user_id, {
        ban_duration: "none",
      });

      return new Response(
        JSON.stringify({ success: true, message: "User activated" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "delete") {
      // Remove roles first
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", target_user_id);

      // Delete auth user (cascade deletes profile)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: "User deleted" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
