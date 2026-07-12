/**
 * nudge-sitter-dormant
 *
 * Cron hebdomadaire (lundi 11h UTC) : détecte les gardiens inscrits depuis
 * plus de 30 jours, profil ≥ 60 %, identité vérifiée, ZÉRO candidature envoyée.
 * Insère un signal admin (warning + metadata.nature='nurturing') et envoie un
 * email de nurturing au gardien (une fois par semaine max via message_id
 * `dormant-sitter-<sid>-<YYYYWW>`).
 *
 * Respecte : feature flag admin_signals_active, suppressed_emails,
 * email_preferences.product_emails.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DormantSitter {
  sitter_id: string;
  sitter_first_name: string | null;
  sitter_email: string | null;
  days_since_signup: number;
  profile_completion: number | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** ISO week number (1-53). */
function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

function buildEmailHtml(params: {
  firstName: string;
  days: number;
  ctaUrl: string;
}): string {
  const greeting = params.firstName
    ? `Bonjour ${escapeHtml(params.firstName)},`
    : "Bonjour,";
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
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#1a1a1a;font-weight:700">Il y a peut-être une garde pour vous cette semaine</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">${greeting}</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">Votre profil est complet depuis ${params.days} jours, mais vous n'avez pas encore candidaté à une garde. Peut-être n'avez-vous pas vu passer les bonnes annonces ?</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">Prenez deux minutes pour parcourir les dernières annonces près de chez vous.</p>
</td></tr>
<tr><td align="center" style="padding:16px 0 8px">
<a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:14px 32px;background-color:#2C6E49;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(44,110,73,0.25)">Voir les annonces</a>
</td></tr>
<tr><td style="padding:24px 40px 8px">
<p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#3a3a3a">À bientôt,</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">L'équipe Guardiens</p>
</td></tr>
<tr><td style="padding:20px 40px;border-top:1px solid #eee;background-color:#FAF9F6;text-align:center">
<p style="margin:0 0 6px;font-size:13px;color:#555;font-weight:600">Guardiens</p>
<p style="margin:0;font-size:12px;color:#888;line-height:1.6">L'entraide locale entre propriétaires et gardiens d'animaux.</p>
<p style="margin:14px 0 0;font-size:11px;color:#aaa">
<a href="https://guardiens.fr" style="color:#aaa;text-decoration:none">guardiens.fr</a>
&nbsp;·&nbsp;
<a href="https://guardiens.fr/unsubscribe" style="color:#aaa;text-decoration:underline">Se désinscrire</a>
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
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: flag } = await service
      .from("feature_flags")
      .select("enabled")
      .eq("key", "admin_signals_active")
      .maybeSingle();
    if (!flag?.enabled) {
      return new Response(
        JSON.stringify({ skipped: "admin_signals_active is off" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data, error } = await service.rpc("detect_dormant_sitters");
    if (error) throw error;
    const sitters: DormantSitter[] = (data as DormantSitter[]) ?? [];

    const now = new Date();
    const { year, week } = isoWeek(now);
    const weekTag = `${year}${String(week).padStart(2, "0")}`;

    let signalsInserted = 0;
    let signalsSkipped = 0;
    let emailsSent = 0;
    let emailsSkipped = 0;
    const errors: Array<{ sitter_id: string; error: string }> = [];

    for (const s of sitters) {
      // Signal admin
      const { error: insErr } = await service.from("admin_signals").insert({
        signal_type: "dormant_sitter",
        severity: "warning",
        entity_type: "profile",
        entity_id: s.sitter_id,
        metadata: {
          nature: "nurturing",
          first_name: s.sitter_first_name,
          email: s.sitter_email,
          days_since_signup: s.days_since_signup,
          profile_completion: s.profile_completion,
        },
      });
      if (insErr) {
        if (insErr.code === "23505" || insErr.message?.includes("idx_admin_signals_idempotent")) {
          signalsSkipped += 1;
        } else {
          errors.push({ sitter_id: s.sitter_id, error: insErr.message });
          continue;
        }
      } else {
        signalsInserted += 1;
      }

      // Email hebdomadaire
      if (!RESEND_API_KEY || !s.sitter_email) {
        emailsSkipped += 1;
        continue;
      }
      const email = s.sitter_email.trim().toLowerCase();
      const messageId = `dormant-sitter-${s.sitter_id}-${weekTag}`;

      const { data: dup } = await service
        .from("email_send_log")
        .select("id")
        .eq("message_id", messageId)
        .limit(1)
        .maybeSingle();
      if (dup) { emailsSkipped += 1; continue; }

      const { data: sup } = await service
        .from("suppressed_emails")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      if (sup) { emailsSkipped += 1; continue; }

      const { data: pref } = await service
        .from("email_preferences")
        .select("product_emails")
        .eq("user_id", s.sitter_id)
        .maybeSingle();
      if (pref && (pref as { product_emails: boolean | null }).product_emails === false) {
        emailsSkipped += 1;
        continue;
      }

      const html = buildEmailHtml({
        firstName: s.sitter_first_name || "",
        days: s.days_since_signup,
        ctaUrl: "https://guardiens.fr/recherche",
      });
      const subject = `${s.sitter_first_name || "Bonjour"}, il y a peut-être une garde pour vous cette semaine`;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Guardiens <bonjour@guardiens.fr>",
          to: [s.sitter_email],
          subject,
          html,
        }),
      });
      const status = resp.ok ? "sent" : "failed";
      let resendId: string | null = null;
      let errMsg: string | null = null;
      try {
        const j = await resp.json();
        if (resp.ok) resendId = j?.id ?? null;
        else errMsg = JSON.stringify(j);
      } catch {
        if (!resp.ok) errMsg = `HTTP ${resp.status}`;
      }
      await service.from("email_send_log").insert({
        message_id: messageId,
        template_name: "dormant_sitter_nudge",
        recipient_email: s.sitter_email,
        status,
        error_message: errMsg,
        resend_id: resendId,
        metadata: { sitter_id: s.sitter_id, days_since_signup: s.days_since_signup },
      });
      if (resp.ok) emailsSent += 1;
      else emailsSkipped += 1;
    }

    return new Response(
      JSON.stringify({
        detected: sitters.length,
        signals_inserted: signalsInserted,
        signals_skipped: signalsSkipped,
        emails_sent: emailsSent,
        emails_skipped: emailsSkipped,
        errors,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[nudge-sitter-dormant]", err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
