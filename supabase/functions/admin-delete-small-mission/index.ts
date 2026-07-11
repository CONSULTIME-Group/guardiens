import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();
    if (callerError || !caller) return json({ error: "Non autorisé" }, 401);

    const { data: isAdmin, error: roleError } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (roleError) return json({ error: roleError.message }, 500);
    if (!isAdmin) return json({ error: "Accès refusé" }, 403);

    const { missionId } = (await req.json()) as { missionId?: string };
    if (!missionId) return json({ error: "missionId est requis" }, 400);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Récupère titre + count responses avant suppression pour le log
    const { data: mission } = await adminClient
      .from("small_missions")
      .select("id, title")
      .eq("id", missionId)
      .maybeSingle();
    if (!mission) return json({ error: "Mission introuvable" }, 404);

    const { count: responsesCount } = await adminClient
      .from("small_mission_responses")
      .select("id", { count: "exact", head: true })
      .eq("mission_id", missionId);

    // Suppression explicite des dépendances (CASCADE en place, on force l'ordre pour éviter tout edge case).
    // FKs référencées : small_mission_responses (CASCADE), mission_feedbacks (CASCADE),
    // reviews (CASCADE), mission_notification_queue (CASCADE), conversations.small_mission_id (SET NULL, no-op).
    const cleanupTables: Array<{ table: string; column: string }> = [
      { table: "small_mission_responses", column: "mission_id" },
      { table: "mission_feedbacks", column: "mission_id" },
      { table: "reviews", column: "mission_id" },
      { table: "mission_notification_queue", column: "mission_id" },
    ];
    for (const { table, column } of cleanupTables) {
      const { error } = await adminClient.from(table).delete().eq(column, missionId);
      if (error) return json({ error: `Nettoyage ${table} échoué : ${error.message}` }, 500);
    }

    const { error: deleteError, count } = await adminClient
      .from("small_missions")
      .delete({ count: "exact" })
      .eq("id", missionId);
    if (deleteError) return json({ error: deleteError.message }, 500);
    if (!count) return json({ error: "Mission introuvable ou déjà supprimée" }, 404);

    await adminClient.from("admin_action_logs").insert({
      admin_id: caller.id,
      action: "small_mission_delete",
      target_type: "small_mission",
      target_id: missionId,
      metadata: {
        title: mission.title,
        responses_deleted: responsesCount ?? 0,
      },
    });

    return json({ success: true, responses_deleted: responsesCount ?? 0 });
  } catch (error) {
    console.error("admin-delete-small-mission error", error);
    return json({ error: error instanceof Error ? error.message : "Erreur interne" }, 500);
  }
});
