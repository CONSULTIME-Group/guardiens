/**
 * nudge-sitter-dormant
 *
 * Cron hebdomadaire (lundi 11h UTC) : détecte les gardiens inscrits depuis au
 * moins 30 jours avec zéro candidature envoyée. Insère un signal admin
 * (warning + metadata.nature='nurturing') et envoie un email de nurturing au
 * gardien, avec au plus 3 envois sur la vie du compte, 14 jours au moins entre
 * deux envois, comptes administrateurs exclus.
 *
 * Lissage : premiers envois à partir du lundi 5 octobre 2026, 150 au plus par
 * passage, priorité à l'annonce ouverte la plus proche puis à la dernière
 * visite. Le reste attend le passage suivant, ce report est un état normal.
 *
 * Respecte : feature flag admin_signals_active, suppressed_emails,
 * email_preferences.product_emails.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";
import { dormantRunBatch, dormantSendDecision } from "../_shared/dormant-sitter-cap.ts";
import {
  fetchOpenSits,
  nearbySitsTemplateData,
  selectNearbyOpenSits,
} from "../_shared/nearby-open-sits.ts";

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


/** ISO week number (1-53). */
function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

/**
 * Appel du sender avec tolerance au rate limit de la passerelle.
 * `fetch` peut lever une RateLimitError avant de produire une reponse HTTP.
 * Le lot doit alors s'arreter et repondre normalement, sans attendre dans la
 * requete admin et sans accentuer la saturation par de nouvelles tentatives.
 */
async function postWithBackoff(
  url: string,
  init: RequestInit,
): Promise<Response | { rateLimited: true; retryAfterMs: number }> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const retryAfterMs = Number((err as { retryAfterMs?: number })?.retryAfterMs ?? 0);
    const isRateLimit = (err as { name?: string })?.name === "RateLimitError" || retryAfterMs > 0;
    if (isRateLimit) return { rateLimited: true, retryAfterMs };
    throw err;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const run = await startCronRun("nudge-sitter-dormant");
  try {
    const requestBody = await req.json().catch(() => ({})) as { sitter_id?: unknown };
    const requestedSitterId = typeof requestBody.sitter_id === "string"
      ? requestBody.sitter_id.trim()
      : "";
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
    const detectedSitters: DormantSitter[] = (data as DormantSitter[]) ?? [];
    const sitters = requestedSitterId
      ? detectedSitters.filter((s) => s.sitter_id === requestedSitterId)
      : detectedSitters;

    if (requestedSitterId && sitters.length === 0) {
      await run.finish("success", { detected: 0, requested_sitter_id: requestedSitterId });
      return new Response(
        JSON.stringify({ skipped: "sitter_not_eligible", detected: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = new Date();
    const { year, week } = isoWeek(now);
    const weekTag = `${year}${String(week).padStart(2, "0")}`;

    let signalsInserted = 0;
    let signalsSkipped = 0;
    let emailsSent = 0;
    let emailsDeferred = 0;
    let emailsSkipped = 0;
    let rateLimitRetryAfterMs = 0;
    const errors: Array<{ sitter_id: string; error: string }> = [];
    const skipReasons: Record<string, number> = {};
    const noteSkip = (reason: string) => {
      skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
      emailsSkipped += 1;
    };

    const sitterIds = sitters.map((s) => s.sitter_id);

    // Comptes administrateurs : jamais de relance de nurturing.
    const { data: adminRows } = await service
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .in("user_id", sitterIds.length ? sitterIds : ["00000000-0000-0000-0000-000000000000"]);
    const adminIds = new Set((adminRows ?? []).map((r: { user_id: string }) => r.user_id));

    // Plafond de trois relances par gardien, tous envois confondus, et date du
    // dernier envoi effectif pour l'espacement de quatorze jours.
    const { data: pastSends } = await service
      .from("email_send_log")
      .select("message_id, created_at")
      .like("message_id", "dormant-sitter-%")
      .limit(5000);
    const sentCounts = new Map<string, number>();
    const lastSentAt = new Map<string, string>();
    for (const row of (pastSends ?? []) as Array<{ message_id: string | null; created_at: string | null }>) {
      const id = (row.message_id ?? "").slice("dormant-sitter-".length, "dormant-sitter-".length + 36);
      if (!id) continue;
      sentCounts.set(id, (sentCounts.get(id) ?? 0) + 1);
      const prev = lastSentAt.get(id);
      if (row.created_at && (!prev || row.created_at > prev)) lastSentAt.set(id, row.created_at);
    }

    // Coordonnées et dernière visite des gardiens, pour les cartes annonce et
    // pour l'ordre de passage.
    const { data: sitterGeo } = await service
      .from("profiles")
      .select("id, latitude, longitude, last_seen_at")
      .in("id", sitterIds.length ? sitterIds : ["00000000-0000-0000-0000-000000000000"]);
    const geoById = new Map<string, { latitude: number | null; longitude: number | null; lastSeenAt: string | null }>();
    for (const row of (sitterGeo ?? []) as any[]) {
      geoById.set(row.id, {
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        lastSeenAt: row.last_seen_at ?? null,
      });
    }

    const openSits = await fetchOpenSits(service);

    // Lissage : les gardiens éligibles sont ordonnés par annonce ouverte la
    // plus proche, puis par dernière visite, et 150 au plus partent par
    // passage. Le reste attend le passage suivant, ce report est normal.
    const nowMs = now.getTime();
    const dayMs = 86400_000;
    type Prepared = {
      sitter: DormantSitter;
      nearestSitKm: number | null;
      lastSeenAt: string | null;
      nearby: ReturnType<typeof selectNearbyOpenSits>;
    };
    const prepared: Prepared[] = [];

    for (const s of sitters) {
      if (adminIds.has(s.sitter_id)) { noteSkip("admin_account"); continue; }

      const last = lastSentAt.get(s.sitter_id);
      const decision = dormantSendDecision({
        daysSinceSignup: s.days_since_signup,
        alreadySentCount: sentCounts.get(s.sitter_id) ?? 0,
        isAdmin: false,
        daysSinceLastSend: last ? (nowMs - Date.parse(last)) / dayMs : null,
        nowMs,
      });
      if (!decision.send) { noteSkip(decision.reason ?? "not_eligible"); continue; }

      const geo = geoById.get(s.sitter_id) ?? { latitude: null, longitude: null, lastSeenAt: null };
      const nearby = selectNearbyOpenSits(openSits, geo, { limit: 3 });
      if (nearby.sits.length === 0) { noteSkip(nearby.reason ?? "no_open_sit"); continue; }

      prepared.push({ sitter: s, nearestSitKm: nearby.nearestKm, lastSeenAt: geo.lastSeenAt, nearby });
    }

    const { batch, deferred } = dormantRunBatch(prepared);
    const runDeferred = deferred.length;

    for (const item of batch) {
      const s = item.sitter;
      const nearby = item.nearby;


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

      // Envoi via send-transactional-email : cap, suppression, opt-out categorie,
      // en-tetes List-Unsubscribe et pied de page tokenise centralises.
      const result = await postWithBackoff(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          templateName: "dormant-sitter-nudge",
          recipientEmail: s.sitter_email,
          idempotencyKey: messageId,
          templateData: {
            firstName: s.sitter_first_name || "",
            days: s.days_since_signup,
            ...nearbySitsTemplateData(nearby.sits),
          },
          logMetadata: { sitter_id: s.sitter_id, days_since_signup: s.days_since_signup },
        }),
      });
      if (!("ok" in result)) {
        // La passerelle est saturee. Le destinataire courant et tous les
        // suivants restent eligibles a la prochaine execution hebdomadaire.
        emailsDeferred += batch.length - emailsSent - emailsSkipped - emailsDeferred;
        rateLimitRetryAfterMs = result.retryAfterMs;
        break;
      }
      const resp = result;
      if (!resp.ok) {
        const responseText = await resp.text();
        if (resp.status === 429 || (resp.status >= 500 && responseText.includes("Rate limit exceeded"))) {
          emailsDeferred += batch.length - emailsSent - emailsSkipped - emailsDeferred;
          rateLimitRetryAfterMs = Number(resp.headers.get("retry-after") ?? 0) * 1000;
          break;
        }
        console.error("[nudge-sitter-dormant] send failed", resp.status, responseText);
        emailsSkipped += 1;
        continue;
      }
      // Un HTTP 200 ne signifie pas envoye : le sender repond 200 avec
      // deferred:true quand il diffère et skipped:true quand il deduplique.
      const outcome = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
      if (outcome?.deferred) emailsDeferred += 1;
      else if (outcome?.skipped) emailsSkipped += 1;
      else emailsSent += 1;
    }

    await run.finish(errors.length > 0 ? "partial" : "success", {
      detected: sitters.length,
      eligible: prepared.length,
      run_batch: batch.length,
      run_deferred: runDeferred,
      signals_inserted: signalsInserted,
      signals_skipped: signalsSkipped,
      emails_sent: emailsSent,
      emails_deferred: emailsDeferred,
      emails_skipped: emailsSkipped,
      errors_count: errors.length,
      rate_limit_retry_after_ms: rateLimitRetryAfterMs,
      skip_reasons: skipReasons,
    });
    return new Response(
      JSON.stringify({
        detected: sitters.length,
        eligible: prepared.length,
        run_batch: batch.length,
        run_deferred: runDeferred,
        signals_inserted: signalsInserted,
        signals_skipped: signalsSkipped,
        emails_sent: emailsSent,
        emails_deferred: emailsDeferred,
        emails_skipped: emailsSkipped,
        rate_limit_retry_after_ms: rateLimitRetryAfterMs,
        errors,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("[nudge-sitter-dormant]", err);
    await run.fail(err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
