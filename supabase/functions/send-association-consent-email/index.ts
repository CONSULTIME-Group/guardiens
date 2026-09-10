/**
 * send-association-consent-email
 *
 * Envoie la demande d'accord à une association de protection animale, un
 * destinataire par appel. Messages individuels adressés à des organisations,
 * hors membres : cet envoi ne passe donc pas par email-cap.
 *
 * Le suivi des ouvertures et des clics est réglé au niveau du domaine chez
 * Resend, pas par email : cette fonction n'enrobe aucun lien, l'URL de la
 * fiche part telle quelle.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resendFetch } from "../_shared/resend-guard.ts";
import { PERSONAL_SENDER_FROM, REPLY_TO_ADDRESS } from "../_shared/sender-address.ts";
import { buildAssociationConsentEmail } from "../_shared/association-consent-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERSION = "assoc-consent-v1";
const COOLDOWN_DAYS = 30;

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const service = createClient(SUPABASE_URL, SERVICE_KEY);

    let isServiceRole = token === SERVICE_KEY;
    if (!isServiceRole && token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const pad = parts[1].length % 4 === 0 ? "" : "=".repeat(4 - (parts[1].length % 4));
          const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/") + pad;
          const payload = JSON.parse(atob(b64));
          if (payload?.role === "service_role") isServiceRole = true;
        }
      } catch { /* jeton non décodable : traité comme un JWT utilisateur */ }
    }

    if (!isServiceRole) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401);
      const { data: hasRole } = await service.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!hasRole) return json({ error: "Admin only" }, 403);
    }

    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY non configurée" }, 500);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const mode = body?.mode === "test" ? "test" : body?.mode === "send" ? "send" : "";
    const testTo = typeof body?.test_to === "string" ? body.test_to.trim() : "";
    const force = body?.force === true;

    if (!slug) return json({ error: "slug obligatoire" }, 400);
    if (!mode) return json({ error: "mode doit valoir test ou send" }, 400);

    const { data: assoc, error: assocErr } = await service
      .from("animal_associations")
      .select("id, slug, name, status, contact_email, consent_status, consent_requested_at")
      .eq("slug", slug)
      .maybeSingle();

    if (assocErr) return json({ error: assocErr.message }, 500);
    if (!assoc) return json({ error: "Fiche introuvable" }, 404);
    if (assoc.status !== "published") return json({ error: "Fiche non publiée" }, 409);

    const ficheUrl = `https://guardiens.fr/associations/${assoc.slug}`;
    const email = buildAssociationConsentEmail({ name: assoc.name, ficheUrl });

    let to = "";
    if (mode === "test") {
      if (!testTo) return json({ error: "test_to obligatoire en mode test" }, 400);
      to = testTo;
    } else {
      const contact = (assoc.contact_email ?? "").trim();
      if (!contact) return json({ error: "Adresse de contact absente" }, 409);
      to = contact;

      const { data: suppressed, error: supErr } = await service
        .from("suppressed_emails")
        .select("email")
        .eq("email", contact.toLowerCase())
        .maybeSingle();
      if (supErr) return json({ error: supErr.message }, 500);
      if (suppressed) return json({ error: "Adresse en liste de suppression" }, 409);

      if (!force && assoc.consent_requested_at) {
        const ageMs = Date.now() - new Date(assoc.consent_requested_at).getTime();
        if (ageMs < COOLDOWN_DAYS * 24 * 60 * 60 * 1000) {
          return json({
            error: `Demande déjà envoyée le ${assoc.consent_requested_at}`,
            consent_requested_at: assoc.consent_requested_at,
          }, 409);
        }
      }
    }

    const resendRes = await resendFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: PERSONAL_SENDER_FROM,
        reply_to: REPLY_TO_ADDRESS,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    }, { functionName: "send-association-consent-email" });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", resendRes.status, errText);
      return json({ error: `Envoi Resend échoué (${resendRes.status}): ${errText}` }, 502);
    }

    const sendPayload = await resendRes.json().catch(() => ({} as Record<string, unknown>));
    const resendId = (sendPayload?.id as string | undefined) ?? null;

    if (mode === "send") {
      const patch: Record<string, unknown> = {
        consent_requested_at: new Date().toISOString(),
        consent_email_sent_to: to,
        consent_email_resend_id: resendId,
      };
      if (assoc.consent_status === "pending") patch.consent_status = "requested";
      const { error: updErr } = await service
        .from("animal_associations")
        .update(patch)
        .eq("id", assoc.id);
      if (updErr) console.error("Mise à jour de la fiche impossible", updErr);
    }

    return json({ mode, to, resend_id: resendId, version: VERSION });
  } catch (err) {
    console.error("send-association-consent-email error:", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return json({ error: message }, 500);
  }
});
