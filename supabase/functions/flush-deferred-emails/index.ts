// Drains email_deferred_queue: re-invokes send-transactional-email for entries whose
// scheduled_for is past. Caps + quiet-hours are re-evaluated by send-transactional-email,
// so messages may be re-deferred (their queue row is then marked sent if the call succeeded
// or the new deferred row supersedes; the re-defer logic in the sender uses the
// original idempotency_key to avoid duplicates).
//
// Designed to be triggered by pg_cron every minute.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BATCH = 50;
const MAX_ATTEMPTS = 6;
const TTL_HOURS = 36; // hard expire after 36h to avoid stale notifications

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth : accepte la clé service_role brute (comparaison directe avec l'env,
  // pattern éprouvé de send-transactional-email et evaluate-journeys). Le
  // décodage de claim JWT `role=service_role` échoue pour les clés du vault
  // qui ne portent pas ce claim, ce qui bloquait le drainage automatique.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let authorized = !!token && token === SERVICE_KEY;
  if (!authorized && token && token.split(".").length === 3) {
    try {
      const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
      const payload = JSON.parse(atob(b64 + pad)) as { role?: unknown };
      if (payload?.role === "service_role") authorized = true;
    } catch { /* ignore */ }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const nowIso = new Date().toISOString();

  // 0. Recupere les lignes coincees en traitement (worker mort en cours de route).
  const staleProcessing = new Date(Date.now() - 10 * 60_000).toISOString();
  await supabase
    .from("email_deferred_queue")
    .update({ status: "pending", last_error: "reclaimed from stale processing" })
    .eq("status", "processing")
    .lt("last_attempt_at", staleProcessing);

  // 1. Expire stale entries
  const ttlCutoff = new Date(Date.now() - TTL_HOURS * 3600_000).toISOString();
  await supabase
    .from("email_deferred_queue")
    .update({ status: "expired", last_error: "TTL exceeded" })
    .eq("status", "pending")
    .lt("first_enqueued_at", ttlCutoff);

  // 2. Pull due rows, plus anciennement enfilees d'abord (anti famine)
  const { data: due, error: fetchErr } = await supabase
    .from("email_deferred_queue")
    .select("id, template_name, recipient_email, template_data, idempotency_key, attempts")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("first_enqueued_at", { ascending: true })
    .limit(MAX_BATCH);


  if (fetchErr) {
    console.error("flush fetch error", fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0, failed = 0, redeferred = 0, abandoned = 0, closed = 0, skippedLocked = 0;

  for (const row of due ?? []) {
    // Verrou optimiste : deux executions concurrentes du cron peuvent selectionner
    // la meme ligne. Seule celle qui reussit la transition pending -> processing
    // la traite. Toutes les branches de sortie doivent reposer la ligne dans un
    // statut final ou 'pending'.
    const { data: claimed } = await supabase
      .from("email_deferred_queue")
      .update({ status: "processing", last_attempt_at: nowIso })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id");
    if (!claimed || claimed.length === 0) {
      skippedLocked++;
      continue;
    }

    // Defaut 2 : l'increment d'attempts appartient au sender (il met a jour la
    // ligne source lors d'un re-report).
    const newAttempts = (row.attempts ?? 0) + 1;


    try {
      const _steRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          templateName: row.template_name,
          recipientEmail: row.recipient_email,
          idempotencyKey: row.idempotency_key,
          templateData: row.template_data || {},
          // Fournit l'id de la ligne source pour que la garde anti-doublon
          // "already_queued" côté send-transactional-email l'exclue de sa
          // recherche : sinon elle se retrouve elle-même (encore 'pending' à
          // ce stade) et clôture silencieusement l'envoi sans le transmettre.
          sourceQueueId: row.id,
        }),
      });
      const _steTxt1 = _steRes.ok ? '' : await _steRes.text().catch(() => '');
      if (!_steRes.ok) console.error('send-transactional-email failed', _steRes.status, _steTxt1);
      const error = _steRes.ok ? null : new Error(`send-transactional-email ${_steRes.status}: ${_steTxt1}`);
      const data = _steRes.ok ? await _steRes.json().catch(() => null) : null;

      if (error) throw error;

      const result = data as Record<string, unknown> | null;
      const reason = typeof result?.reason === 'string' ? result.reason : null;

      // Defaut 5 : le sender a deja clos la ligne (abandon). On respecte son statut,
      // en filet de securite si la ligne est restee en traitement.
      if (result?.abandoned) {
        console.log("flush abandoned by sender", { id: row.id, reason });
        await supabase
          .from("email_deferred_queue")
          .update({ status: "abandoned", last_error: reason ?? "abandoned by sender" })
          .eq("id", row.id)
          .eq("status", "processing");
        abandoned++;
      } else if (reason === 'already_queued') {
        // Defaut 4 : une ligne doublonnee ne doit pas repasser chaque minute.
        await supabase
          .from("email_deferred_queue")
          .update({ status: "superseded", last_error: "already_queued: un autre envoi couvre cette cle" })
          .eq("id", row.id);
        closed++;
      } else if (reason === 'unsubscribed_category' || reason === 'email_suppressed') {
        // Defaut 4 : desinscription ou adresse supprimee, cloture definitive.
        await supabase
          .from("email_deferred_queue")
          .update({ status: "abandoned", last_error: reason })
          .eq("id", row.id);
        closed++;
      } else if (result?.deferred) {
        // Le sender a re-programme la ligne source elle-meme (attempts et
        // first_enqueued_at conserves), et l'a remise en 'pending'.
        // Defaut 3 : MAX_ATTEMPTS s'applique aussi sur le chemin de re-report.
        if (newAttempts >= MAX_ATTEMPTS) {
          await supabase
            .from("email_deferred_queue")
            .update({
              status: "failed",
              last_error: `MAX_ATTEMPTS atteint sur chaine de re-report (${newAttempts}), dernier motif: ${reason ?? 'inconnu'}`,
            })
            .eq("id", row.id);
          failed++;
        } else {
          console.log("flush redeferred", { id: row.id, reason });
          // Filet de securite : si le sender n'a pas repose la ligne, on la rend
          // a la file au lieu de la laisser coincee en traitement.
          await supabase
            .from("email_deferred_queue")
            .update({ status: "pending" })
            .eq("id", row.id)
            .eq("status", "processing");
          redeferred++;
        }
      } else if (result?.sent || result?.skipped || result?.success) {

        await supabase.from("email_deferred_queue").update({ status: "sent" }).eq("id", row.id);
        sent++;
      } else {
        // Reponse de forme inattendue : meme traitement que l'erreur reseau,
        // sinon la ligne reste 'pending' avec attempts fige et repasse chaque minute.
        const unexpected = `Unexpected response: ${JSON.stringify(result)}`;
        if (newAttempts >= MAX_ATTEMPTS) {
          await supabase
            .from("email_deferred_queue")
            .update({ status: "failed", last_error: unexpected })
            .eq("id", row.id);
        } else {
          const backoffMin = [5, 15, 30, 60, 120][Math.min(newAttempts - 1, 4)];
          await supabase
            .from("email_deferred_queue")
            .update({
              status: "pending",
              scheduled_for: new Date(Date.now() + backoffMin * 60_000).toISOString(),
              attempts: newAttempts,
              last_error: unexpected,
            })
            .eq("id", row.id);
        }
        failed++;
      }

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("flush invoke error", { id: row.id, err: msg });
      if (newAttempts >= MAX_ATTEMPTS) {
        await supabase.from("email_deferred_queue").update({ status: "failed", last_error: msg }).eq("id", row.id);
      } else {
        // Backoff: push scheduled_for forward (5min, 15, 30, 60, 120).
        // Sur ce chemin le sender n'a rien incremente : on le fait ici.
        const backoffMin = [5, 15, 30, 60, 120][Math.min(newAttempts - 1, 4)];
        await supabase
          .from("email_deferred_queue")
          .update({
            status: "pending",
            scheduled_for: new Date(Date.now() + backoffMin * 60_000).toISOString(),
            attempts: newAttempts,
            last_error: msg,
          })
          .eq("id", row.id);
      }

      failed++;
    }

  }

  // Lot 9 : alerte si la file accumule des echecs. Seuil volontairement bas,
  // la file normale doit rester vide d'echecs.
  const FAILED_ALERT_THRESHOLD = 50
  let failedRecent = 0
  try {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const { count } = await supabase
      .from("email_deferred_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", since)
    failedRecent = count ?? 0
    if (failedRecent > FAILED_ALERT_THRESHOLD) {
      const { data: existing } = await supabase
        .from("admin_signals")
        .select("id")
        .eq("signal_type", "email_queue_failures")
        .is("resolved_at", null)
        .gte("detected_at", since)
        .limit(1)
      if (!existing || existing.length === 0) {
        await supabase.from("admin_signals").insert({
          signal_type: "email_queue_failures",
          severity: "critical",
          entity_type: "cron_run",
          entity_id: "00000000-0000-0000-0000-000000000000",
          metadata: {
            title: `File email differee, ${failedRecent} echecs sur 24h`,
            failed_24h: failedRecent,
            threshold: FAILED_ALERT_THRESHOLD,
          },
        })
      }
    }
  } catch (alertErr) {
    console.warn("failed-queue alert check failed", alertErr)
  }

  return new Response(
    JSON.stringify({ ok: true, processed: (due ?? []).length, sent, failed, redeferred, abandoned, closed, skipped_locked: skippedLocked, failed_24h: failedRecent }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
