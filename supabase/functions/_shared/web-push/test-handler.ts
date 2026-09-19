import { isServiceRoleCaller } from './auth.ts';
import { validatePushEndpoint } from './endpoint.ts';
import { validateSubscriptionKeys } from './keys.ts';
import { buildPushPayload } from './payload.ts';

export interface TestTarget { request_id: string; user_id: string; subscription_id: string }
export interface TestSubscription { endpoint: string; auth_key: string; p256dh_key: string }
export type TestOutcome = 'accepted' | 'rejected' | 'unknown' | 'skipped';
export interface TestDependencies {
  serviceKey?: string;
  configured: boolean;
  claim(target: TestTarget): Promise<boolean>;
  subscription(target: TestTarget): Promise<TestSubscription | null>;
  send(subscription: TestSubscription, payload: string): Promise<number>;
  finish(requestId: string, outcome: TestOutcome, status: number | null): Promise<boolean>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {
  status, headers: {'Content-Type':'application/json','Cache-Control':'no-store'},
});

// Separate from the production dispatcher. One target, one attempt, no retry.
export async function handlePushTest(req: Request, deps: TestDependencies): Promise<Response> {
  if (!isServiceRoleCaller(req.headers.get('Authorization'),deps.serviceKey)) return json({error:'unauthorized'},401);
  if (req.method !== 'POST') return json({error:'method_not_allowed'},405);
  if (!deps.configured) return json({error:'push_not_configured'},503);
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length>2048) return json({error:'payload_too_large'},413);
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch { return json({error:'invalid_request'},400); }
  if (Object.keys(body).length !== 3 || !['request_id','user_id','subscription_id'].every(key => typeof body[key]==='string' && uuid.test(body[key] as string))) {
    return json({error:'invalid_request'},400);
  }
  const target = body as unknown as TestTarget;
  try {
    if (!await deps.claim(target)) return json({error:'test_not_claimed',sent_attempts:0},409);
  } catch { return json({error:'claim_failed',sent_attempts:0},500); }
  let attempts=0, outcome: TestOutcome='skipped', status: number | null=null;
  try {
    // Recheck owner, opt-in and enabled after the durable claim.
    const sub = await deps.subscription(target);
    if (sub && validatePushEndpoint(sub.endpoint).ok && validateSubscriptionKeys({auth:sub.auth_key,p256dh:sub.p256dh_key}).ok) {
      attempts=1;
      try {
        const code = await deps.send(sub,JSON.stringify(buildPushPayload('message',target.request_id)));
        status = Number.isInteger(code) && code>=100 && code<=599 ? code : null;
        outcome = status === null ? 'unknown' : status>=200 && status<300 ? 'accepted' : 'rejected';
      } catch (error) {
        // Never return provider error bodies, URLs, keys or identifiers.
        const code = (error as {statusCode?: unknown})?.statusCode;
        status = typeof code==='number' && Number.isInteger(code) && code>=100 && code<=599 ? code : null;
        outcome = status === null ? 'unknown' : 'rejected';
      }
    }
  } catch { outcome='skipped'; }
  let persisted=false;
  try { persisted=await deps.finish(target.request_id,outcome,status); } catch { /* Request remains consumed. */ }
  return json({ok:persisted,sent_attempts:attempts,accepted:outcome==='accepted',uncertain:outcome==='unknown',provider_status:status,outcome,persisted},persisted?200:500);
}
