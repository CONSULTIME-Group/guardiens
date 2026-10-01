// Edge dispatch-web-push : envoi des notifications en attente.
// Appelable uniquement avec la cle service_role, jamais par un client.
// Cron installe : job 1224 dispatch-web-push, toutes les cinq minutes.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import webpush from 'npm:web-push@3.6.7';

import { digestRunStatus } from '../_shared/cron-trace.ts';
import { isServiceRoleCaller } from '../_shared/web-push/auth.ts';
import { readVapidConfig } from '../_shared/web-push/config.ts';
import { validatePushEndpoint } from '../_shared/web-push/endpoint.ts';
import { buildNearbySitPayload, buildPushPayload, isPushEventKind } from '../_shared/web-push/payload.ts';
import {
  clampBatchSize,
  classifyNetworkFailure,
  classifyPushResponse,
  PUSH_NETWORK_TIMEOUT_MS,
} from '../_shared/web-push/transport.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  if (!isServiceRoleCaller(req.headers.get('Authorization'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))) {
    return json({ error: 'unauthorized' }, 401);
  }

  const vapid = readVapidConfig((name) => Deno.env.get(name));
  if (!vapid) return json({ error: 'push_not_configured' }, 503);
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let limit = 20;
  try {
    const body = await req.json();
    limit = clampBatchSize(body?.limit);
  } catch {
    limit = 20;
  }

  // Une ligne de journal seulement quand il s'est passe quelque chose : la
  // file est vide la plupart du temps, inutile d'ecrire 288 lignes par jour.
  const startedAt = new Date().toISOString();
  const recordRun = async (
    status: 'success' | 'partial' | 'failed',
    metrics: Record<string, unknown>,
    errorMessage?: string,
  ) => {
    const row: Record<string, unknown> = {
      edge_name: 'dispatch-web-push',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status,
      metrics,
    };
    if (errorMessage) row.error_message = errorMessage.slice(0, 2000);
    const result = await admin.from('cron_run_log').insert(row);
    if (result?.error) console.error('dispatch-web-push journal indisponible');
  };

  const { data: jobs, error } = await admin.rpc('push_claim_jobs', { p_limit: limit });
  if (error) {
    console.error('dispatch-web-push claim erreur');
    await recordRun('failed', { claimed: 0 }, 'push_claim_jobs failed');
    return json({ error: 'claim_failed' }, 500);
  }

  const counters = { claimed: 0, accepted: 0, failed: 0, retry: 0, skipped: 0, disabled: 0, persistence_errors: 0, nearby_claimed: 0, nearby_unavailable: 0 };

  type Queue = { eligible: string; close: string; payload: (job: Record<string, unknown>) => string | null; ttl: number };
  const MAIN: Queue = {
    eligible: 'push_job_eligible', close: 'push_close_job', ttl: 3600,
    payload: (job) => isPushEventKind(job.event_kind) ? JSON.stringify(buildPushPayload(job.event_kind, String(job.job_id))) : null,
  };
  const NEARBY: Queue = {
    eligible: 'push_nearby_job_eligible', close: 'push_close_nearby_job', ttl: 6 * 3600,
    payload: (job) => { const p = buildNearbySitPayload(String(job.job_id), String(job.sit_id)); return p ? JSON.stringify(p) : null; },
  };

  const processJobs = async (list: Array<Record<string, unknown>>, queue: Queue) => {
    const finalize = async (id: unknown, outcome: string, code: string | null) => {
      const result = await admin.rpc(queue.close, { p_job_id: id, p_outcome: outcome, p_error_code: code });
      if (result.error || result.data !== true) counters.persistence_errors += 1;
    };
    for (const job of list) {
      counters.claimed += 1;
      // Recheck just before transmission, after any time spent on earlier jobs.
      const ready = await admin.rpc(queue.eligible, { p_job_id: job.job_id });
      if (ready.error || ready.data !== true) {
        await finalize(job.job_id, 'skipped', 'no_longer_eligible');
        counters.skipped += 1;
        continue;
      }
      const payload = queue.payload(job);
      if (!payload) {
        await finalize(job.job_id, 'skipped', 'bad_kind');
        counters.skipped += 1;
        continue;
      }
      // Deuxieme controle de l'endpoint, au moment meme de l'envoi.
      const endpointCheck = validatePushEndpoint(job.endpoint);
      if (!endpointCheck.ok) {
        const disabled = await admin.rpc('push_disable_subscription', {
          p_subscription_id: job.subscription_id, p_reason: endpointCheck.reason,
        });
        if (disabled.error || disabled.data !== true) counters.persistence_errors += 1;
        await finalize(job.job_id, 'skipped', endpointCheck.reason);
        counters.skipped += 1;
        counters.disabled += 1;
        continue;
      }
      const attempts = typeof job.attempts === 'number' ? job.attempts : 1;
      let decision;
      try {
        const response = await webpush.sendNotification(
          { endpoint: job.endpoint as string, keys: { auth: job.auth_key as string, p256dh: job.p256dh_key as string } },
          payload,
          { TTL: queue.ttl, timeout: PUSH_NETWORK_TIMEOUT_MS },
        );
        decision = classifyPushResponse(response.statusCode, attempts);
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        decision = typeof status === 'number' ? classifyPushResponse(status, attempts) : classifyNetworkFailure();
      }
      if (decision.disableSubscription) {
        const disabled = await admin.rpc('push_disable_subscription', {
          p_subscription_id: job.subscription_id, p_reason: decision.errorCode ?? 'gone',
        });
        if (disabled.error || disabled.data !== true) counters.persistence_errors += 1;
        counters.disabled += 1;
      }
      await finalize(job.job_id, decision.outcome, decision.errorCode);
      // 'accepted' signifie pris en charge par le service de push, jamais remis.
      counters[decision.outcome] += 1;
    }
  };

  await processJobs((jobs ?? []) as Array<Record<string, unknown>>, MAIN);

  // File annonces proches : independante. Si elle est absente (migration non
  // appliquee) ou en erreur, messages et candidatures ne sont pas affectes.
  const nearby = await admin.rpc('push_claim_nearby_jobs', { p_limit: limit });
  if (nearby.error) {
    counters.nearby_unavailable = 1;
  } else {
    const list = (nearby.data ?? []) as Array<Record<string, unknown>>;
    counters.nearby_claimed = list.length;
    await processJobs(list, NEARBY);
  }

  // Journal agrege uniquement : aucun endpoint, aucune cle, aucun membre.
  console.log('dispatch-web-push', JSON.stringify(counters));
  if (counters.claimed > 0 || counters.persistence_errors > 0) {
    await recordRun(digestRunStatus(counters.persistence_errors), counters);
  }
  return json({ ok: counters.persistence_errors === 0, ...counters }, counters.persistence_errors ? 500 : 200);
});
