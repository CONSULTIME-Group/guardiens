import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";
import { finalizeErasure } from "../_shared/account-erasure.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authFail = await requireAdminOrServiceRole(req, corsHeaders);
  if (authFail) return authFail;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find deletion requests that have passed their scheduled date
    const { data: requests, error: fetchErr } = await adminClient
      .from("account_deletion_requests")
      .select("id, user_id, requester_email")
      .eq("status", "pending")
      .lte("scheduled_deletion_at", new Date().toISOString());

    if (fetchErr) {
      console.error("Error fetching deletion requests:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!requests || requests.length === 0) {
      return new Response(
        JSON.stringify({ purged: 0, message: "No accounts to purge" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const request of requests) {
      try {
        // Accusé de traitement RGPD + liste de blocage, AVANT la suppression.
        const { data: prof } = await adminClient
          .from("profiles")
          .select("email, first_name")
          .eq("id", request.user_id)
          .maybeSingle();
        const purgeEmail =
          (prof as { email?: string } | null)?.email ?? request.requester_email ?? null;
        await finalizeErasure(adminClient, purgeEmail, {
          firstName: (prof as { first_name?: string } | null)?.first_name ?? null,
          metadata: { source: "purge_cron", user_id: request.user_id },
        });

        // Delete user from auth (cascades to profiles and related data)
        const { error: deleteErr } = await adminClient.auth.admin.deleteUser(
          request.user_id
        );

        if (deleteErr) {
          console.error(`Failed to delete user ${request.user_id}:`, deleteErr);
          results.push({
            userId: request.user_id,
            success: false,
            error: deleteErr.message,
          });
          continue;
        }

        // Mark request as completed (the row may be cascade-deleted already,
        // so we ignore errors here)
        await adminClient
          .from("account_deletion_requests")
          .update({ status: "completed", processed_at: new Date().toISOString() })
          .eq("id", request.id);

        results.push({ userId: request.user_id, success: true });
        console.log(`Successfully purged user ${request.user_id}`);
      } catch (err) {
        console.error(`Unexpected error for user ${request.user_id}:`, err);
        results.push({
          userId: request.user_id,
          success: false,
          error: String(err),
        });
      }
    }

    const purged = results.filter((r) => r.success).length;
    console.log(`Purge complete: ${purged}/${requests.length} accounts deleted`);

    return new Response(
      JSON.stringify({ purged, total: requests.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
