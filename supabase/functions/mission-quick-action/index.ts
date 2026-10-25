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
 *
 * Lot E19 : la fin d'échange accepte une troisième issue (« cancelled », le
 * coup de main a été annulé, sans rencontre ni avis), et le mot passe par
 * moderate-content avant enregistrement (_shared/meetup-word.ts).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  MEETUP_WORD_MAX_LENGTH,
  moderateMeetupWord,
  wordModerationParam,
} from "../_shared/meetup-word.ts";

const MEETUP_OUTCOMES = ["happened", "not_happened", "cancelled"] as const;
type MeetupOutcome = typeof MEETUP_OUTCOMES[number];

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

      // Lot E19 : issue explicite (« happened », « not_happened », « cancelled »),
      // sinon celle du jeton. Publication seulement sur accord explicite.
      const outcome = MEETUP_OUTCOMES.includes(body?.outcome) ? body.outcome as MeetupOutcome : null;
      const rawWord = typeof body?.word === "string" ? body.word.trim().slice(0, MEETUP_WORD_MAX_LENGTH) : "";
      const publicOk = body?.public_ok === true && outcome !== "cancelled";

      // Lot E19 : le mot passe par moderate-content (type « sit ») avant
      // enregistrement, seulement pour un jeton encore valable. Un mot retenu
      // n'est pas enregistré, la réponse l'est.
      let word: string | null = rawWord && outcome !== "cancelled" ? rawWord : null;
      let wordModeration: "ok" | "warning" | "unchecked" | null = null;
      let wordRefused = false;
      let wordRule: string | null = null;
      if (word) {
        const { data: tok } = await service
          .from("mission_action_tokens")
          .select("helper_id, used_at, expires_at")
          .eq("token", token)
          .maybeSingle();
        const usable = !!tok && !tok.used_at && new Date(tok.expires_at).getTime() > Date.now();
        if (!usable) {
          word = null;
        } else {
          const verdict = await moderateMeetupWord(word, {
            supabaseUrl: SUPABASE_URL,
            serviceKey: SERVICE_KEY,
            actingUserId: tok.helper_id,
          });
          if (verdict.verdict === "refused") {
            word = null;
            wordRefused = true;
            wordRule = verdict.rule;
          } else {
            wordModeration = wordModerationParam(verdict.verdict);
          }
        }
      }

      const { data, error } = await service.rpc("confirm_mission_meetup", {
        p_token: token,
        p_word: word,
        p_public_ok: publicOk,
        p_word_moderation: wordModeration,
        p_outcome: outcome,
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

      if (!data) return json({ ok: false, reason: "error" });
      return json({ ...(data as Record<string, unknown>), word_refused: wordRefused, word_rule: wordRule });
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
