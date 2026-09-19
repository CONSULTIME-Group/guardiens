// Analyse et validation des requetes entrantes de push-subscription.
// Helpers purs : le proprietaire vient toujours du JWT, jamais du corps.

import { validatePushEndpoint } from './endpoint.ts';
import { validateSubscriptionKeys } from './keys.ts';

export const PUSH_MAX_BODY_BYTES = 4096;
export const PUSH_MAX_ACTIVE_ENDPOINTS = 5;

export type PushAction = 'config' | 'status' | 'subscribe' | 'preferences' | 'unsubscribe';

const ACTIONS: PushAction[] = ['config', 'status', 'subscribe', 'preferences', 'unsubscribe'];

export function isPushAction(value: unknown): value is PushAction {
  return typeof value === 'string' && (ACTIONS as string[]).includes(value);
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

export interface SubscribeInput {
  endpoint: string;
  endpointHost: string;
  auth: string;
  p256dh: string;
  optInMessages: boolean;
  optInApplications: boolean;
}

export function parseSubscribeInput(body: unknown): ParseResult<SubscribeInput> {
  if (!body || typeof body !== 'object') return { ok: false, reason: 'invalid_body' };
  const b = body as Record<string, unknown>;

  const endpointCheck = validatePushEndpoint(b.endpoint);
  if (!endpointCheck.ok) {
    return { ok: false, reason: 'reason' in endpointCheck ? endpointCheck.reason : 'invalid_endpoint' };
  }

  const keysCheck = validateSubscriptionKeys(b.keys);
  if (!keysCheck.ok) {
    return { ok: false, reason: 'reason' in keysCheck ? keysCheck.reason : 'invalid_keys' };
  }

  const keys = b.keys as { auth: string; p256dh: string };
  // Un opt-in n'est jamais implicite : il faut une valeur vraie explicite.
  const optInMessages = b.opt_in_messages === true;
  const optInApplications = b.opt_in_applications === true;
  if (!optInMessages && !optInApplications) {
    return { ok: false, reason: 'no_opt_in_selected' };
  }

  return {
    ok: true,
    value: {
      endpoint: b.endpoint as string,
      endpointHost: endpointCheck.host,
      auth: keys.auth,
      p256dh: keys.p256dh,
      optInMessages,
      optInApplications,
    },
  };
}

export interface PreferencesInput {
  subscriptionId: string;
  optInMessages: boolean;
  optInApplications: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parsePreferencesInput(body: unknown): ParseResult<PreferencesInput> {
  if (!body || typeof body !== 'object') return { ok: false, reason: 'invalid_body' };
  const b = body as Record<string, unknown>;
  if (typeof b.subscription_id !== 'string' || !UUID_RE.test(b.subscription_id)) {
    return { ok: false, reason: 'invalid_subscription_id' };
  }
  return {
    ok: true,
    value: {
      subscriptionId: b.subscription_id,
      optInMessages: b.opt_in_messages === true,
      optInApplications: b.opt_in_applications === true,
    },
  };
}

export function parseUnsubscribeInput(body: unknown): ParseResult<{ subscriptionId: string }> {
  if (!body || typeof body !== 'object') return { ok: false, reason: 'invalid_body' };
  const b = body as Record<string, unknown>;
  if (typeof b.subscription_id !== 'string' || !UUID_RE.test(b.subscription_id)) {
    return { ok: false, reason: 'invalid_subscription_id' };
  }
  return { ok: true, value: { subscriptionId: b.subscription_id } };
}

/** Corps borne en taille avant toute analyse. */
export function isBodySizeAcceptable(raw: string): boolean {
  return new TextEncoder().encode(raw).length <= PUSH_MAX_BODY_BYTES;
}

/** Aucun endpoint, aucune cle, aucun identifiant de membre en sortie. */
export function sanitizeForLog(reason: string): string {
  return reason.replace(/[^a-z0-9_]/gi, '_').slice(0, 40);
}
