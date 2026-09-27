/**
 * mission-choose-action
 *
 * Lien « Choisir {prénom} » de l'email de relance à 48 h. Le mode « peek »
 * décrit seulement le choix, « confirm » l'exécute (accept_mission_response
 * au nom du demandeur, via consume_mission_choose_token). Aucun détail
 * interne n'est renvoyé au navigateur.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const REASONS = new Set(["invalid", "expired", "already_used", "mission_closed"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const mode = body?.mode === "confirm" ? "confirm" : "peek";
    if (!token || token.length < 20 || token.length > 200 || !/^[A-Za-z0-9_-]+$/.test(token)) {
      return json({ valid: false, ok: false, reason: "invalid" });
    }

    if (mode === "peek") {
      const { data, error } = await service.rpc("peek_mission_choose_token", { p_token: token });
      if (error || !data) return json({ valid: false, reason: "invalid" });
      return json(data);
    }

    const { data: peek } = await service.rpc("peek_mission_choose_token", { p_token: token });
    const { data, error } = await service.rpc("consume_mission_choose_token", { p_token: token });
    if (error || !data) return json({ ok: false, reason: "invalid" });
    const result = data as { ok: boolean; reason?: string };
    if (!result.ok) {
      if (result.reason === "error") console.error("[mission-choose-action] consume error", JSON.stringify(data));
      return json({ ok: false, reason: REASONS.has(result.reason ?? "") ? result.reason : "invalid" });
    }
    return json({
      ok: true,
      helper_first_name: (peek as { helper_first_name?: string } | null)?.helper_first_name ?? "",
      mission_slug: (peek as { mission_slug?: string } | null)?.mission_slug ?? "",
    });
  } catch (e) {
    console.error("[mission-choose-action]", e instanceof Error ? e.message : String(e));
    return json({ ok: false, reason: "invalid" }, 500);
  }
});
