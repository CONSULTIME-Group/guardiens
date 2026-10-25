/**
 * mission-choose-action
 *
 * Lien « Choisir {prénom} » des emails du demandeur (lot E17 :
 * mission-response-received, mission-response-waiting à 24 h,
 * mission-wave-status). Le mode « peek » décrit seulement le choix,
 * « confirm » l'exécute (accept_mission_response au nom du demandeur, via
 * consume_mission_choose_token), sans connexion. La confirmation sur la page
 * protège des clics automatiques des antivirus de messagerie. Aucun détail
 * interne n'est renvoyé au navigateur, hors identifiant de conversation.
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

interface ConsumeResult {
  ok: boolean;
  reason?: string;
  mission_id?: string;
  owner_id?: string;
  helper_id?: string;
  conversation_id?: string | null;
  declined_responder_ids?: unknown;
}

/** Identifiants écartés par le choix (accept_mission_response, cascade). */
export function declinedIdsOf(result: ConsumeResult): string[] {
  const ids = result.declined_responder_ids;
  return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
}

/** Appel interne de notify-mission-event, en clé de service ; un échec ne remonte jamais. */
async function notifyEvent(body: Record<string, unknown>) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const res = await fetch(`${url}/functions/v1/notify-mission-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error("[mission-choose-action] notify", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("[mission-choose-action] notify", e instanceof Error ? e.message : String(e));
  }
}

async function notifyChoice(result: ConsumeResult) {
  if (!result.mission_id || !result.owner_id) return;
  if (result.helper_id) {
    await notifyEvent({
      event_type: "mission_accepted",
      mission_id: result.mission_id,
      actor_id: result.owner_id,
      target_ids: [result.helper_id],
      metadata: { conversation_id: result.conversation_id ?? null, source: "choose_token" },
    });
  }
  const declined = declinedIdsOf(result);
  if (declined.length > 0) {
    await notifyEvent({
      event_type: "mission_declined",
      mission_id: result.mission_id,
      actor_id: result.owner_id,
      target_ids: declined,
      metadata: { source: "choose_token" },
    });
  }
}

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
    const result = data as ConsumeResult;
    if (!result.ok) {
      if (result.reason === "error") console.error("[mission-choose-action] consume error", JSON.stringify(data));
      return json({ ok: false, reason: REASONS.has(result.reason ?? "") ? result.reason : "invalid" });
    }
    // Lot E17 : mêmes notifications que la page du besoin. La personne choisie
    // est prévenue, les autres reçoivent « Merci, c'est pourvu ».
    await notifyChoice(result);
    return json({
      ok: true,
      helper_first_name: (peek as { helper_first_name?: string } | null)?.helper_first_name ?? "",
      mission_slug: (peek as { mission_slug?: string } | null)?.mission_slug ?? "",
      conversation_id: result.conversation_id ?? null,
    });
  } catch (e) {
    console.error("[mission-choose-action]", e instanceof Error ? e.message : String(e));
    return json({ ok: false, reason: "invalid" }, 500);
  }
});
