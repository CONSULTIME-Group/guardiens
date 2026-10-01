// Test lancé par le membre depuis Paramètres. Identité issue du seul JWT
// vérifié ; le corps ne contient que l'abonnement courant et une clé
// d'idempotence. Aucun endpoint ni user_id accepté du client.
import { extractBearer } from './auth.ts';
import { validatePushEndpoint } from './endpoint.ts';
import { validateSubscriptionKeys } from './keys.ts';
import { buildTestPayload } from './payload.ts';
import type { TestOutcome, TestSubscription, TestTarget } from './test-handler.ts';

export interface SelfTestDependencies {
  configured: boolean;
  /** Renvoie l'identifiant du membre si le jeton est valide, sinon null. */
  authenticate(token: string): Promise<string | null>;
  /** Motif renvoyé par push_claim_self_test. */
  claim(target: TestTarget): Promise<SelfTestClaim>;
  subscription(target: TestTarget): Promise<TestSubscription | null>;
  send(subscription: TestSubscription, payload: string): Promise<number>;
  finish(requestId: string, outcome: TestOutcome, status: number | null): Promise<boolean>;
  headers?: Record<string, string>;
  /** Journal agrégé, sans identifiant. */
  log?(event: string): void;
}

export type SelfTestClaim = 'ok' | 'duplicate' | 'rate_limited' | 'subscription_unavailable' | 'invalid';
const REFUSALS: Record<Exclude<SelfTestClaim, 'ok'>, number> = {
  duplicate: 409, rate_limited: 429, subscription_unavailable: 409, invalid: 400,
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleSelfTest(req: Request, deps: SelfTestDependencies): Promise<Response> {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...(deps.headers ?? {}), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const token = extractBearer(req.headers.get('Authorization'));
  if (!token) return json({ error: 'unauthorized' }, 401);
  let userId: string | null = null;
  try { userId = await deps.authenticate(token); } catch { userId = null; }
  if (!userId) return json({ error: 'unauthorized' }, 401);
  if (!deps.configured) return json({ error: 'push_not_configured' }, 503);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 1024) return json({ error: 'payload_too_large' }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch { return json({ error: 'invalid_request' }, 400); }
  const keys = Object.keys(body).sort().join(',');
  if (keys !== 'request_id,subscription_id'
    || typeof body.request_id !== 'string' || !uuid.test(body.request_id)
    || typeof body.subscription_id !== 'string' || !uuid.test(body.subscription_id)) {
    return json({ error: 'invalid_request' }, 400);
  }
  const target: TestTarget = { request_id: body.request_id, user_id: userId, subscription_id: body.subscription_id };

  try {
    // Appartenance, appareil actif, idempotence et 1 test / 5 min, en une réservation.
    const claim = await deps.claim(target);
    if (claim !== 'ok') {
      // Rien n'a été envoyé ; le motif exact évite de confondre limite et appareil indisponible.
      const reason = claim in REFUSALS ? claim : 'invalid';
      return json({ error: reason, sent_attempts: 0 }, REFUSALS[reason as keyof typeof REFUSALS]);
    }
  } catch { return json({ error: 'claim_failed', sent_attempts: 0 }, 500); }

  let attempts = 0, outcome: TestOutcome = 'skipped', status: number | null = null;
  try {
    const sub = await deps.subscription(target);
    if (sub && validatePushEndpoint(sub.endpoint).ok
      && validateSubscriptionKeys({ auth: sub.auth_key, p256dh: sub.p256dh_key }).ok) {
      attempts = 1;
      try {
        const code = await deps.send(sub, JSON.stringify(buildTestPayload(target.request_id)));
        status = Number.isInteger(code) && code >= 100 && code <= 599 ? code : null;
        outcome = status === null ? 'unknown' : status >= 200 && status < 300 ? 'accepted' : 'rejected';
      } catch (error) {
        const code = (error as { statusCode?: unknown })?.statusCode;
        status = typeof code === 'number' && Number.isInteger(code) && code >= 100 && code <= 599 ? code : null;
        outcome = status === null ? 'unknown' : 'rejected';
      }
    }
  } catch { outcome = 'skipped'; }
  // Journal en échec : rendu visible (réponse + journal serveur), sans jamais
  // réémettre. La demande reste consommée, le rate limit tient toujours.
  let journalOk = false;
  try { journalOk = await deps.finish(target.request_id, outcome, status) === true; } catch { journalOk = false; }
  if (!journalOk) (deps.log ?? console.error)('push-self-test journal_failed');
  // « accepted » = pris en charge par le fournisseur, pas reçu sur le téléphone.
  return json({ ok: true, sent_attempts: attempts, accepted: outcome === 'accepted', uncertain: outcome === 'unknown', outcome, journal_ok: journalOk });
}
