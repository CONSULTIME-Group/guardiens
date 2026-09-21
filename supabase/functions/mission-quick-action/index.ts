/**
 * mission-quick-action
 *
 * Deux gestes d'entraide depuis un email, sans reconnexion, par jeton à usage
 * unique (table mission_action_tokens) :
 *  - « Je peux » sur un besoin (kind « can_help », par défaut) ;
 *  - la fin d'échange « Vous vous êtes rencontrés ? » (kind « meetup »).
 *
 * Aucune action sur lecture : le mode « peek » décrit seulement ce qui sera
 * fait, l'exécution exige un POST explicite depuis la page de confirmation.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const mode = body?.mode === "confirm" ? "confirm" : "peek";
    const kind = body?.kind === "meetup" ? "meetup" : "can_help";

    if (!token || token.length < 20 || token.length > 200 || !/^[a-f0-9]+$/i.test(token)) {
      return json({ valid: false, ok: false, reason: "invalid" }, 200);
    }

    if (kind === "meetup") {
      if (mode === "peek") {
        const { data, error } = await service.rpc("peek_mission_meetup_token", { p_token: token });
        if (error) {
          console.error("[mission-quick-action] meetup peek failed", error.message);
          return json({ valid: false, reason: "invalid" }, 200);
        }
        return json(data ?? { valid: false, reason: "invalid" });
      }

      const word = typeof body?.word === "string" ? body.word.trim().slice(0, 140) : null;
      const publicOk = body?.public_ok === false ? false : true;
      const { data, error } = await service.rpc("confirm_mission_meetup", {
        p_token: token,
        p_word: word && word.length > 0 ? word : null,
        p_public_ok: publicOk,
      });
      if (error) {
        console.error("[mission-quick-action] meetup confirm failed", error.message);
        return json({ ok: false, reason: "error" }, 200);
      }

      const result = (data ?? {}) as { ok?: boolean; badge_awarded?: boolean; helper_id?: string };
      if (result.ok && result.badge_awarded && result.helper_id) {
        const { data: helper } = await service
          .from("profiles")
          .select("first_name")
          .eq("id", result.helper_id)
          .maybeSingle();
        const who = helper?.first_name?.trim();
        await service.from("notifications").insert({
          user_id: result.helper_id,
          type: "mission_first_help_badge",
          title: "Votre premier coup de main",
          body: `${who ? `${who}, v` : "V"}otre premier coup de main est noté. Merci.`,
          link: "/tableau-de-bord",
        });
      }

      return json(data ?? { ok: false, reason: "error" });
    }

    if (mode === "peek") {
      const { data, error } = await service.rpc("peek_mission_action_token", { p_token: token });
      if (error) {
        console.error("[mission-quick-action] peek failed", error.message);
        return json({ valid: false, reason: "invalid" }, 200);
      }
      return json(data ?? { valid: false, reason: "invalid" });
    }

    const { data, error } = await service.rpc("consume_mission_action_token", { p_token: token });
    if (error) {
      console.error("[mission-quick-action] consume failed", error.message);
      return json({ ok: false, reason: "error" }, 200);
    }

    return json(data ?? { ok: false, reason: "error" });
  } catch (e) {
    console.error("[mission-quick-action] unexpected", e);
    return json({ ok: false, reason: "error" }, 500);
  }
});
