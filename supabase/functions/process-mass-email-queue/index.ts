// Worker pgmq pour les campagnes d'email de masse (Chantier A Phase 2).
// Cron toutes les 30 s via pg_cron + net.http_post (voir migration).
// Lit un lot de 25 messages de la file `mass_emails` avec VT 60 s, verrouille
// la ligne mass_email_sends, re-vérifie RGPD, envoie via Resend unitaire avec
// Idempotency-Key, puis marque sent/failed/skipped et supprime le message.
//
// Sécurité : verify_jwt = true. N'accepte que le service_role_key (identique
// aux autres watchdogs pilotés par cron).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const QUEUE = "mass_emails";
const DLQ = "mass_emails_dlq";
const BATCH = 25;
const VT_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const UNSUB_TOKEN_PLACEHOLDER = "__UNSUB_TOKEN__";

interface Campaign {
  id: string;
  subject: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  status: string;
}

function buildHtml(
  subject: string,
  body: string,
  ctaLabel?: string | null,
  ctaUrl?: string | null,
): string {
  const ctaBlock = ctaLabel && ctaUrl
    ? `<tr><td align="center" style="padding:32px 0 8px">
<a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background-color:#2C6E49;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(44,110,73,0.25)">${ctaLabel}</a>
</td></tr>
<tr><td align="center" style="padding:0 0 8px"><p style="margin:0;font-size:12px;color:#888">3 minutes, c'est tout.</p></td></tr>`
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

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Respect rate-limit cooldown partagé (comme process-email-queue)
    const { data: state } = await service
      .from("email_send_state")
      .select("retry_after_until")
      .eq("id", 1)
      .maybeSingle();
    const rau = (state as { retry_after_until?: string | null } | null)?.retry_after_until;
    if (rau && new Date(rau).getTime() > Date.now()) {
      return new Response(JSON.stringify({ skipped: "rate_limit_cooldown", until: rau }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lit un lot depuis pgmq
    const { data: msgs, error: readErr } = await service.rpc("read_email_batch", {
      queue_name: QUEUE,
      batch_size: BATCH,
      vt: VT_SECONDS,
    });
    if (readErr) throw new Error(`read_email_batch failed: ${readErr.message}`);
    const messages = (msgs || []) as Array<{
      msg_id: number;
      read_ct: number;
      message: { campaign_id: string; recipient_email: string };
    }>;

    if (messages.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const campaignCache = new Map<string, Campaign | null>();
    async function getCampaign(id: string): Promise<Campaign | null> {
      if (campaignCache.has(id)) return campaignCache.get(id)!;
      const { data } = await service
        .from("mass_emails")
        .select("id, subject, body, cta_label, cta_url, status")
        .eq("id", id)
        .maybeSingle();
      const c = (data as Campaign | null) ?? null;
      campaignCache.set(id, c);
      return c;
    }

    const affectedCampaigns = new Set<string>();
    let sent = 0, failed = 0, skipped = 0, dlq = 0;

    for (const msg of messages) {
      const { campaign_id: campaignId, recipient_email: rawEmail } = msg.message ?? {} as any;
      if (!campaignId || !rawEmail) {
        await service.rpc("move_to_dlq", {
          source_queue: QUEUE, dlq_name: DLQ, message_id: msg.msg_id, payload: msg.message as any,
        });
        dlq++;
        continue;
      }
      const email = String(rawEmail).toLowerCase();
      affectedCampaigns.add(campaignId);

      const campaign = await getCampaign(campaignId);
      if (!campaign) {
        // Campagne supprimée : discard
        await service.rpc("delete_email", { queue_name: QUEUE, message_id: msg.msg_id });
        skipped++;
        continue;
      }
      if (campaign.status === "cancelled") {
        await service.rpc("delete_email", { queue_name: QUEUE, message_id: msg.msg_id });
        await service.from("mass_email_sends").update({
          status: "skipped", last_error: "campaign cancelled", last_attempt_at: new Date().toISOString(),
        }).eq("mass_email_id", campaignId).eq("recipient_email", rawEmail).in("status", ["queued", "failed"]);
        skipped++;
        continue;
      }

      // Verrou : passe queued|failed → sending si toujours éligible
      const { data: locked, error: lockErr } = await service
        .from("mass_email_sends")
        .update({ status: "sending", last_attempt_at: new Date().toISOString() })
        .eq("mass_email_id", campaignId)
        .eq("recipient_email", rawEmail)
        .in("status", ["queued", "failed"])
        .select("id, attempts")
        .maybeSingle();
      if (lockErr) {
        console.error("lock update failed:", lockErr);
        // Laisse le message : VT expire, retry
        continue;
      }
      if (!locked) {
        // Déjà sent/suppressed/skipped/sending par un autre run → drop
        await service.rpc("delete_email", { queue_name: QUEUE, message_id: msg.msg_id });
        skipped++;
        continue;
      }

      // Re-check RGPD (frais)
      const { data: sup } = await service
        .from("suppressed_emails").select("email").eq("email", email).maybeSingle();
      if (sup) {
        await service.from("mass_email_sends").update({
          status: "suppressed", last_error: "in suppressed_emails", last_attempt_at: new Date().toISOString(),
        }).eq("id", (locked as any).id);
        await service.rpc("delete_email", { queue_name: QUEUE, message_id: msg.msg_id });
        skipped++;
        continue;
      }

      // Opt-out produit : email → profile.id → email_preferences
      const { data: profile } = await service
        .from("profiles").select("id, first_name").eq("email", rawEmail).maybeSingle();
      if (profile?.id) {
        const { data: prefs } = await service
          .from("email_preferences").select("product_emails").eq("user_id", profile.id).maybeSingle();
        if (prefs && (prefs as any).product_emails === false) {
          await service.from("mass_email_sends").update({
            status: "suppressed", last_error: "product opt-out", last_attempt_at: new Date().toISOString(),
          }).eq("id", (locked as any).id);
          await service.rpc("delete_email", { queue_name: QUEUE, message_id: msg.msg_id });
          skipped++;
          continue;
        }
      }

      // Token de désinscription (doit exister, créé par l'enqueueur ; fallback safe)
      let token = "";
      {
        const { data: tok } = await service
          .from("email_unsubscribe_tokens").select("token").eq("email", email).maybeSingle();
        token = (tok as { token?: string } | null)?.token ?? "";
      }

      // Personnalisation {prénom} / {prenom}, fallback « Bonjour » si prénom vide/null.
      const firstName = ((profile as { first_name?: string | null } | null)?.first_name ?? "").trim();
      const personalize = (t: string) => {
        const name = (firstName || "").trim();
        const replaced = t.replace(/\{pr[ée]nom\}/gi, name);
        if (name) return replaced;
        return replaced
          .replace(/Bonjour\s+([,.!?;:])/gi, "Bonjour$1")
          .replace(/[ \t]{2,}/g, " ");
      };
      const personalizedSubject = personalize(campaign.subject);

      const html = personalize(
        buildHtml(campaign.subject, campaign.body, campaign.cta_label, campaign.cta_url)
          .replaceAll(UNSUB_TOKEN_PLACEHOLDER, token),
      );

      const unsubApiBase = `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;
      const oneClick = `${unsubApiBase}?token=${token}`;
      const uiUrl = `https://guardiens.fr/unsubscribe?token=${token}`;

      const idempotencyKey = `mass-${campaignId}-${email}`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            from: "Guardiens <bonjour@guardiens.fr>",
            to: [rawEmail],
            subject: personalizedSubject,
            html,
            tracking: { opens: true, clicks: true },
            tags: [{ name: "campaign_id", value: campaignId }],
            headers: {
              "List-Unsubscribe": `<${oneClick}>, <${uiUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }),
        });

        if (res.status === 429) {
          // Rate limit → laisse le message (VT expire), pose un cooldown partagé
          const retryAfter = Number(res.headers.get("retry-after") ?? "60") || 60;
          const until = new Date(Date.now() + retryAfter * 1000).toISOString();
          await service.from("email_send_state").update({ retry_after_until: until }).eq("id", 1);
          // Remet la ligne en queued pour un prochain passage
          await service.from("mass_email_sends").update({
            status: "queued",
            attempts: (locked as any).attempts, // pas d'incrément sur 429
            last_error: `429 rate limited`,
          }).eq("id", (locked as any).id);
          console.warn("Resend 429 — cooldown until", until);
          // Stop du run
          break;
        }

        const bodyText = await res.text();
        if (!res.ok) {
          const attempts = ((locked as any).attempts ?? 0) + 1;
          if (attempts >= MAX_ATTEMPTS) {
            await service.from("mass_email_sends").update({
              status: "failed",
              attempts,
              last_error: `${res.status}: ${bodyText.slice(0, 500)}`,
              last_attempt_at: new Date().toISOString(),
            }).eq("id", (locked as any).id);
            await service.rpc("move_to_dlq", {
              source_queue: QUEUE, dlq_name: DLQ, message_id: msg.msg_id, payload: msg.message as any,
            });
            dlq++;
          } else {
            await service.from("mass_email_sends").update({
              status: "failed",
              attempts,
              last_error: `${res.status}: ${bodyText.slice(0, 500)}`,
              last_attempt_at: new Date().toISOString(),
            }).eq("id", (locked as any).id);
            await service.rpc("delete_email", { queue_name: QUEUE, message_id: msg.msg_id });
          }
          failed++;
          continue;
        }

        let resendId: string | null = null;
        try {
          const parsed = JSON.parse(bodyText);
          resendId = parsed?.id ?? null;
        } catch { /* ignore */ }

        await service.from("mass_email_sends").update({
          status: "sent",
          resend_id: resendId,
          error_message: null,
          last_error: null,
          attempts: ((locked as any).attempts ?? 0) + 1,
          last_attempt_at: new Date().toISOString(),
        }).eq("id", (locked as any).id);
        await service.rpc("delete_email", { queue_name: QUEUE, message_id: msg.msg_id });
        sent++;
      } catch (e) {
        const attempts = ((locked as any).attempts ?? 0) + 1;
        const errMsg = String(e).slice(0, 500);
        if (attempts >= MAX_ATTEMPTS || (msg.read_ct ?? 0) >= MAX_ATTEMPTS) {
          await service.from("mass_email_sends").update({
            status: "failed", attempts, last_error: errMsg, last_attempt_at: new Date().toISOString(),
          }).eq("id", (locked as any).id);
          await service.rpc("move_to_dlq", {
            source_queue: QUEUE, dlq_name: DLQ, message_id: msg.msg_id, payload: msg.message as any,
          });
          dlq++;
        } else {
          // Remet en queued et laisse VT gérer le retry
          await service.from("mass_email_sends").update({
            status: "failed", attempts, last_error: errMsg, last_attempt_at: new Date().toISOString(),
          }).eq("id", (locked as any).id);
        }
        failed++;
      }
    }

    // Recompte + clôture des campagnes qui n'ont plus de travail en cours
    for (const cid of affectedCampaigns) {
      const [{ count: sentCount }, { count: failedCount }, { count: skippedCount }, { count: openCount }] =
        await Promise.all([
          service.from("mass_email_sends").select("id", { count: "exact", head: true }).eq("mass_email_id", cid).eq("status", "sent"),
          service.from("mass_email_sends").select("id", { count: "exact", head: true }).eq("mass_email_id", cid).eq("status", "failed"),
          service.from("mass_email_sends").select("id", { count: "exact", head: true }).eq("mass_email_id", cid).in("status", ["skipped", "suppressed"]),
          service.from("mass_email_sends").select("id", { count: "exact", head: true }).eq("mass_email_id", cid).in("status", ["queued", "sending"]),
        ]);

      const update: Record<string, unknown> = {
        sent_count: sentCount ?? 0,
        failed_count: failedCount ?? 0,
        skipped_count: skippedCount ?? 0,
        recipients_count: sentCount ?? 0,
        heartbeat_at: new Date().toISOString(),
      };
      if ((openCount ?? 0) === 0) {
        update.status = "done";
      }
      await service.from("mass_emails").update(update).eq("id", cid);
    }

    return new Response(
      JSON.stringify({ processed: messages.length, sent, failed, skipped, dlq }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("process-mass-email-queue error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
