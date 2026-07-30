/**
 * application-quick-action
 *
 * Repond a une candidature depuis un email, sans connexion, via un jeton
 * signe a usage unique (table application_action_tokens, 30 jours).
 *
 * Deux actions seulement, toutes deux non destructrices :
 *  - decline  : passe la candidature en refusee et previent le gardien
 *  - thinking : ne change rien au statut, previent le gardien (une seule fois)
 *
 * Accepter une candidature n'est jamais possible par jeton.
 *
 * Aucune action n'est executee sur un GET : le mode "peek" se contente de
 * decrire ce qui sera fait, l'execution exige un POST explicite depuis la
 * page de confirmation.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verrou anti pre-chargement : les clients mail et antivirus font des GET.
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const mode = body?.mode === "confirm" ? "confirm" : "peek";

    if (!token || token.length < 20 || token.length > 200 || !/^[a-f0-9]+$/i.test(token)) {
      return json({ valid: false, ok: false, reason: "invalid" }, 200);
    }

    if (mode === "peek") {
      const { data, error } = await service.rpc("peek_application_action_token", {
        p_token: token,
      });
      if (error) {
        console.error("[application-quick-action] peek failed", error.message);
        return json({ valid: false, reason: "invalid" }, 200);
      }
      return json(data ?? { valid: false, reason: "invalid" });
    }

    const { data, error } = await service.rpc("consume_application_action_token", {
      p_token: token,
    });
    if (error) {
      console.error("[application-quick-action] consume failed", error.message);
      return json({ ok: false, reason: "error" }, 200);
    }

    const result = (data ?? {}) as Record<string, unknown>;
    if (!result.ok) return json(result);

    const action = String(result.action);
    const sitterEmail = typeof result.sitter_email === "string" ? result.sitter_email : "";

    if (sitterEmail) {
      const templateName = action === "decline"
        ? "application-declined"
        : "application-under-review";
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify({
          templateName,
          recipientEmail: sitterEmail,
          idempotencyKey: `quick-${action}-${result.application_id}`,
          templateData: {
            sitterFirstName: result.sitter_first_name ?? "",
            sitTitle: result.sit_title ?? "",
            sitCity: result.sit_city ?? "",
            ownerFirstName: result.owner_first_name ?? "",
          },
          logMetadata: {
            application_id: result.application_id,
            source: "email_quick_action",
            action,
          },
        }),
      });
      if (!resp.ok) {
        console.error(
          "[application-quick-action] sitter email failed",
          resp.status,
          await resp.text(),
        );
      }
    }

    return json({ ok: true, action, application_id: result.application_id });
  } catch (e) {
    console.error("[application-quick-action] unexpected", e);
    return json({ ok: false, reason: "error" }, 500);
  }
});
