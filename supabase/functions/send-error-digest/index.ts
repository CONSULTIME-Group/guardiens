/**
 * send-error-digest
 *
 * Envoie un digest quotidien à l'admin avec les nouvelles erreurs JS captées
 * sur le site dans les dernières 24h. Ne s'envoie QUE si seuil dépassé.
 *
 * Déclenché par cron pg tous les jours à 9h Europe/Paris.
 * Peut aussi être appelé manuellement avec ?force=true pour tester.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ADMIN_EMAIL = "jeremie.martinot@gmail.com";
const FROM_EMAIL = "Guardiens Monitoring <notify@guardiens.fr>";
const SEUIL_NOUVELLES = 5; // déclenche l'email si > N erreurs non résolues sur 24h
const SITE_URL = "https://guardiens.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const since = new Date();
    since.setHours(since.getHours() - 24);
    const sinceISO = since.toISOString();

    // Erreurs non résolues vues dans les dernières 24h
    const { data: errors, error: qErr } = await supabase
      .from("error_logs")
      .select("id, message, url, source, line_no, occurrences, last_seen_at, user_email, severity")
      .is("resolved_at", null)
      .gte("last_seen_at", sinceISO)
      .order("occurrences", { ascending: false })
      .limit(20);

    if (qErr) throw qErr;

    const total = errors?.length ?? 0;
    const totalOccurrences = (errors ?? []).reduce((s, e) => s + (e.occurrences || 1), 0);
    const affectedUsers = new Set(
      (errors ?? []).filter((e) => e.user_email).map((e) => e.user_email),
    ).size;

    // Pas assez d'erreurs → on n'envoie rien (sauf force)
    if (!force && total < SEUIL_NOUVELLES) {
      return new Response(
        JSON.stringify({
          sent: false,
          reason: `Seuil non atteint (${total} < ${SEUIL_NOUVELLES})`,
          total,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Construire le HTML
    const dateStr = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const rowsHtml = (errors ?? [])
      .map(
        (e) => `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 8px;vertical-align:top;width:50px;">
            <span style="background:#fee;color:#c00;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;">×${e.occurrences}</span>
          </td>
          <td style="padding:10px 8px;vertical-align:top;">
            <div style="font-weight:600;color:#222;font-size:14px;line-height:1.4;">${escapeHtml(e.message).slice(0, 200)}</div>
            <div style="color:#666;font-size:12px;margin-top:4px;word-break:break-all;">${escapeHtml(e.url ?? "—")}</div>
            ${e.source ? `<div style="color:#888;font-size:11px;font-family:monospace;margin-top:2px;">${escapeHtml(e.source)}${e.line_no ? `:${e.line_no}` : ""}</div>` : ""}
            ${e.user_email ? `<div style="color:#666;font-size:11px;margin-top:4px;">👤 ${escapeHtml(e.user_email)}</div>` : ""}
          </td>
        </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f6f6f6;margin:0;padding:24px;color:#222;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">

    <div style="background:#1A365D;color:#fff;padding:24px;">
      <div style="font-size:13px;opacity:0.8;margin-bottom:4px;">Guardiens — Monitoring</div>
      <div style="font-size:22px;font-weight:700;">⚠️ Erreurs détectées en 24h</div>
      <div style="font-size:13px;opacity:0.8;margin-top:6px;">${dateStr}</div>
    </div>

    <div style="padding:20px 24px;background:#fafafa;border-bottom:1px solid #eee;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="text-align:center;padding:8px;">
            <div style="font-size:28px;font-weight:700;color:#c00;">${total}</div>
            <div style="font-size:12px;color:#666;text-transform:uppercase;">Erreurs distinctes</div>
          </td>
          <td style="text-align:center;padding:8px;">
            <div style="font-size:28px;font-weight:700;color:#222;">${totalOccurrences}</div>
            <div style="font-size:12px;color:#666;text-transform:uppercase;">Occurrences</div>
          </td>
          <td style="text-align:center;padding:8px;">
            <div style="font-size:28px;font-weight:700;color:#222;">${affectedUsers}</div>
            <div style="font-size:12px;color:#666;text-transform:uppercase;">Utilisateurs touchés</div>
          </td>
        </tr>
      </table>
    </div>

    <div style="padding:16px 24px;">
      <div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#444;">Top ${Math.min(total, 20)} par fréquence</div>
      <table style="width:100%;border-collapse:collapse;">
        ${rowsHtml || `<tr><td style="padding:20px;text-align:center;color:#888;">Aucune erreur 🎉</td></tr>`}
      </table>
    </div>

    <div style="padding:20px 24px;text-align:center;border-top:1px solid #eee;">
      <a href="${SITE_URL}/admin/errors" style="display:inline-block;background:#1A365D;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ouvrir le tableau de bord</a>
    </div>

    <div style="padding:14px 24px;background:#fafafa;color:#888;font-size:11px;text-align:center;border-top:1px solid #eee;">
      Cet email est envoyé automatiquement quand plus de ${SEUIL_NOUVELLES} erreurs sont captées en 24h.<br>
      Les erreurs cross-origin et chunks périmés sont déjà filtrés.
    </div>
  </div>
</body></html>`;

    // Envoi via Resend (pas via la queue : c'est un email admin technique, pas marketing)
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `⚠️ ${total} erreurs sur Guardiens — ${dateStr}`,
        html,
      }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("Resend error:", result);
      throw new Error(`Resend ${resp.status}: ${JSON.stringify(result)}`);
    }

    console.log("Digest envoyé:", { total, totalOccurrences, affectedUsers, messageId: result.id });

    return new Response(
      JSON.stringify({ sent: true, total, totalOccurrences, affectedUsers, messageId: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    console.error("Digest erreur:", e);
    return new Response(
      JSON.stringify({ error: String(e instanceof Error ? e.message : e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
