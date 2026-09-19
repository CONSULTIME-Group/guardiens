// Edge dispatch-web-push : envoi des notifications en attente.
// Appelable uniquement avec la cle service_role, jamais par un client.
// Aucun cron n'est installe a cette etape.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import webpush from 'npm:web-push@3.6.7';

import { isServiceRoleCaller } from '../_shared/web-push/auth.ts';
import { readVapidConfig } from '../_shared/web-push/config.ts';
import { validatePushEndpoint } from '../_shared/web-push/endpoint.ts';
import { buildPushPayload, isPushEventKind } from '../_shared/web-push/payload.ts';
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

  const { data: jobs, error } = await admin.rpc('push_claim_jobs', { p_limit: limit });
  if (error) {
    console.error('dispatch-web-push claim erreur');
    return json({ error: 'claim_failed' }, 500);
  }

  const counters = { claimed: 0, accepted: 0, failed: 0, retry: 0, skipped: 0, disabled: 0 };

  for (const job of (jobs ?? []) as Array<Record<string, unknown>>) {
    counters.claimed += 1;

    const kind = job.event_kind;
    if (!isPushEventKind(kind)) {
      await admin.rpc('push_close_job', {
        p_job_id: job.job_id, p_outcome: 'skipped', p_error_code: 'bad_kind',
      });
      counters.skipped += 1;
      continue;
    }

    // Deuxieme controle de l'endpoint, au moment meme de l'envoi.
    const endpointCheck = validatePushEndpoint(job.endpoint);
    if (!endpointCheck.ok) {
      await admin.rpc('push_disable_subscription', {
        p_subscription_id: job.subscription_id, p_reason: endpointCheck.reason,
      });
      await admin.rpc('push_close_job', {
        p_job_id: job.job_id, p_outcome: 'skipped', p_error_code: endpointCheck.reason,
      });
      counters.skipped += 1;
      counters.disabled += 1;
      continue;
    }

    const payload = JSON.stringify(buildPushPayload(kind, String(job.job_id)));
    const attempts = typeof job.attempts === 'number' ? job.attempts : 1;

    let decision;
    try {
      await webpush.sendNotification(
        {
          endpoint: job.endpoint as string,
          keys: { auth: job.auth_key as string, p256dh: job.p256dh_key as string },
        },
        payload,
        { TTL: 3600, timeout: PUSH_NETWORK_TIMEOUT_MS },
      );
      decision = classifyPushResponse(201, attempts);
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      decision = typeof status === 'number'
        ? classifyPushResponse(status, attempts)
        : classifyNetworkFailure();
    }

    if (decision.disableSubscription) {
      await admin.rpc('push_disable_subscription', {
        p_subscription_id: job.subscription_id, p_reason: decision.errorCode ?? 'gone',
      });
      counters.disabled += 1;
    }

    await admin.rpc('push_close_job', {
      p_job_id: job.job_id,
      p_outcome: decision.outcome,
      p_error_code: decision.errorCode,
    });

    // 'accepted' signifie pris en charge par le service de push, jamais remis.
    counters[decision.outcome] += 1;
  }

  // Journal agrege uniquement : aucun endpoint, aucune cle, aucun membre.
  console.log('dispatch-web-push', JSON.stringify(counters));
  return json({ ok: true, ...counters });
});
