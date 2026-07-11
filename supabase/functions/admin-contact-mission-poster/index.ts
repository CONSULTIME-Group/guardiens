/**
 * admin-contact-mission-poster
 *
 * Insère une notification pour le posteur d'une petite mission depuis l'admin.
 * Passe en service_role pour contourner la RLS de public.notifications
 * (INSERT with_check auth.uid() = user_id).
 *
 * Body : { missionId: string, reason?: string }
 * Auth : admin (via helper partagé) ou service_role.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const guard = await requireAdminOrServiceRole(req, corsHeaders);
    if (guard) return guard;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Récupère l'admin appelant (null si service-role pur)
    let adminId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (token && token !== SUPABASE_SERVICE_ROLE_KEY) {
      const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data } = await anon.auth.getUser(token);
      adminId = data?.user?.id ?? null;
    }

    const payload = await req.json().catch(() => ({}));
    const missionId = typeof payload?.missionId === "string" ? payload.missionId.trim() : "";
    const reasonRaw = typeof payload?.reason === "string" ? payload.reason.trim() : "";

    if (!missionId) {
      return new Response(
        JSON.stringify({ success: false, error: "missionId requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: mission, error: mErr } = await service
      .from("small_missions")
      .select("id, user_id, title")
      .eq("id", missionId)
      .maybeSingle();

    if (mErr) throw mErr;
    if (!mission) {
      return new Response(
        JSON.stringify({ success: false, error: "Mission introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = reasonRaw
      ? `Un administrateur souhaite vous contacter au sujet de votre mission "${mission.title}".\n\nMotif : ${reasonRaw}`
      : `Un administrateur souhaite vous contacter au sujet de votre mission "${mission.title}".`;

    const { error: nErr } = await service.from("notifications").insert({
      user_id: mission.user_id,
      type: "admin_contact",
      title: "Message de l'équipe Guardiens",
      body,
    });
    if (nErr) throw nErr;

    if (adminId) {
      const { error: logErr } = await service.from("admin_action_logs").insert({
        admin_id: adminId,
        action: "small_mission_contact",
        target_type: "small_mission",
        target_id: missionId,
        metadata: reasonRaw ? { reason: reasonRaw } : null,
      });
      if (logErr) {
        console.error("[admin-contact-mission-poster] audit log failed", logErr.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[admin-contact-mission-poster]", err);
    return new Response(
      JSON.stringify({ success: false, error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
