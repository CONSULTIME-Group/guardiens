// Envoi d'un email de TEST à l'admin appelant (fidèle au gabarit send-mass-email).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";
import { entraideCardData } from "../_shared/entraide-card-data.ts";
import { OWNER_NOEL_TEMPLATE, buildNoelDataFor, type NoelTemplateData } from "../_shared/owner-noel-audience.ts";
import { buildResponderData } from "../_shared/owner-noel-v2.ts";
import { mintDepartureTokens, periodBaseUrl } from "../_shared/owner-departure-audience.ts";
import { DEPARTURE_TEMPLATE } from "../_shared/owner-departure-logic.ts";
import { resendFetch } from "../_shared/resend-guard.ts";
import { SENDER_FROM, REPLY_TO_ADDRESS } from "../_shared/sender-address.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { ENTRAIDE_LIGNE_RELANCE_FALLBACK_URL } from "../_shared/transactional-email-templates/entraide-ligne-relance.tsx";

const TEMPLATE_FALLBACK_URLS: Record<string, string | undefined> = {
  "entraide-ligne-relance": ENTRAIDE_LIGNE_RELANCE_FALLBACK_URL,
};

const UNSUB_TOKEN_PLACEHOLDER = "__UNSUB_TOKEN__";

// Réplique EXACTE de buildHtml() de send-mass-email/index.ts pour un test fidèle.
function buildHtml(subject: string, body: string, ctaLabel?: string, ctaUrl?: string): string {
  const ctaBlock = ctaLabel && ctaUrl
    ? `<tr><td align="center" style="padding:32px 0 8px">
<a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background-color:#2C6E49;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(44,110,73,0.25)">${ctaLabel}</a>
</td></tr>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#FAF9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F6;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04)">
<tr><td style="padding:0;background:linear-gradient(135deg,#2C6E49 0%,#3a8a5d 100%);height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:32px 40px 8px;text-align:center;background-color:#ffffff">
<img src="https://guardiens.fr/logo-guardiens.png" alt="Guardiens" width="120" style="display:block;margin:0 auto;height:auto"/>
</td></tr>
<tr><td style="padding:24px 40px 8px">
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#1a1a1a;font-weight:700">${subject}</h1>
<div style="margin:0;font-size:15px;line-height:1.75;color:#3a3a3a;white-space:pre-line">${body}</div>
</td></tr>
${ctaBlock}
<tr><td style="padding:24px 40px 32px"></td></tr>
<tr><td style="padding:20px 40px;border-top:1px solid #eee;background-color:#FAF9F6;text-align:center">
<p style="margin:0 0 6px;font-size:13px;color:#555;font-weight:600">Guardiens</p>
<p style="margin:0;font-size:12px;color:#888;line-height:1.6">L'entraide locale entre propriétaires et gardiens d'animaux.</p>
<p style="margin:14px 0 0;font-size:11px;color:#aaa">
<a href="https://guardiens.fr" style="color:#aaa;text-decoration:none">guardiens.fr</a>
&nbsp;·&nbsp;
<a href="https://guardiens.fr/unsubscribe?token=${UNSUB_TOKEN_PLACEHOLDER}" style="color:#aaa;text-decoration:underline">Se désinscrire</a>
</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authFail = await requireAdminOrServiceRole(req, corsHeaders);
  if (authFail) return authFail;

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY non configurée" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Récupère l'email de l'admin appelant via son JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Impossible de récupérer l'email de l'admin appelant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const adminEmail = userData.user.email;

    const payload = await req.json();
    const subject: string = String(payload?.subject ?? "").trim();
    const body: string = String(payload?.body ?? "").trim();
    const ctaLabel: string | undefined = payload?.cta_label ? String(payload.cta_label) : undefined;
    const ctaUrl: string | undefined = payload?.cta_url ? String(payload.cta_url) : undefined;

    const templateName: string = typeof payload?.template_name === "string" ? payload.template_name.trim() : "";

    // Test fidèle : même chemin que l'envoi réel (send-transactional-email).
    // __urgent franchit le plafond de fréquence (send-transactional-email/index.ts, ligne 670) ;
    // aucune ligne mass_emails n'est créée, le test reste hors statistiques de campagne.
    if (templateName) {
      const { data: prof } = await admin.from("profiles").select("first_name, city, avatar_url, latitude, longitude").eq("id", userData.user.id).maybeSingle();
      // Noël 2026 : test en variante A avec de vrais gardiens proches. Position
      // de l'admin si elle donne des gardiens, sinon Lyon comme démonstration.
      let noelData: Record<string, unknown> = {};
      if (templateName === OWNER_NOEL_TEMPLATE) {
        const self = { id: userData.user.id, first_name: prof?.first_name ?? "", city: prof?.city ?? null, latitude: prof?.latitude ?? null, longitude: prof?.longitude ?? null };
        const demo = { ...self, city: "Lyon", latitude: 45.764, longitude: 4.8357 };
        const both = await buildNoelDataFor(admin, [self, { ...demo, id: `${self.id}-demo` }]);
        const mine = both.get(self.id);
        noelData = (mine?.variant === "A" ? mine : both.get(`${self.id}-demo`)) as Record<string, unknown> ?? {};
        // Lot N6 : « responder_noel » (mode répondant Noël) ou « variant_a » (non-répondant, boutons à jeton).
        const noelTestMode = payload?.noel_test_mode === "responder_noel" ? "responder_noel" : "variant_a";
        if (noelTestMode === "responder_noel") {
          noelData = await buildResponderData(admin, userData.user.id, "noel", noelData as unknown as NoelTemplateData) as unknown as Record<string, unknown>;
        } else {
          const tokens = await mintDepartureTokens(admin, [userData.user.id]);
          const t = tokens.get(userData.user.id);
          if (t) noelData = { ...noelData, periodBaseUrl: periodBaseUrl(t) };
        }
      }
      // Question de départ : vrai jeton /ma-periode sur le compte de l'admin.
      if (templateName === DEPARTURE_TEMPLATE) {
        const tokens = await mintDepartureTokens(admin, [userData.user.id]);
        const t = tokens.get(userData.user.id);
        if (t) noelData = { periodBaseUrl: periodBaseUrl(t) };
      }
      const { data: sent, error: sendErr } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName,
          recipientEmail: adminEmail,
          idempotencyKey: `admin-test-${templateName}-${Date.now()}`,
          templateData: { firstName: prof?.first_name ?? "", lineUrl: TEMPLATE_FALLBACK_URLS[templateName], ...(templateName === "entraide-ligne-relance" ? entraideCardData(prof ?? {}) : {}), ...noelData, __urgent: true },
        },
      });
      if (sendErr || sent?.error) {
        return new Response(
          JSON.stringify({ error: `Envoi du gabarit échoué : ${sent?.error ?? String(sendErr)}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ success: true, to: adminEmail, mode: "template", template: templateName }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!subject || !body) {
      return new Response(
        JSON.stringify({ error: "subject et body sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const html = buildHtml(subject, body, ctaLabel, ctaUrl);
    const testSubject = `[TEST] ${subject}`;

    const resendRes = await resendFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER_FROM,
        reply_to: REPLY_TO_ADDRESS,
        to: [adminEmail],
        subject: testSubject,
        html,
      }),
    }, { functionName: "admin-send-test-email" });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", resendRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Envoi Resend échoué (${resendRes.status}): ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, to: adminEmail }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("admin-send-test-email error:", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
