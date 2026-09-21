/**
 * mission-quick-action
 *
 * Répond « Je peux » à un besoin d'entraide depuis un email, sans
 * reconnexion, via un jeton à usage unique (table mission_action_tokens).
 *
 * Aucune action sur GET : le mode « peek » décrit seulement ce qui sera fait,
 * l'exécution exige un POST explicite depuis la page de confirmation.
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

    if (!token || token.length < 20 || token.length > 200 || !/^[a-f0-9]+$/i.test(token)) {
      return json({ valid: false, ok: false, reason: "invalid" }, 200);
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
