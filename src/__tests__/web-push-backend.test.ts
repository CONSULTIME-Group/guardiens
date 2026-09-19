import { describe, it, expect } from 'vitest';

import { extractBearer, isServiceRoleCaller } from '../../supabase/functions/_shared/web-push/auth';
import { buildConfigResponse, readVapidConfig } from '../../supabase/functions/_shared/web-push/config';
import { isAllowedPushHost, validatePushEndpoint } from '../../supabase/functions/_shared/web-push/endpoint';
import { decodeBase64Url, validateSubscriptionKeys } from '../../supabase/functions/_shared/web-push/keys';
import { buildPushPayload, isPushEventKind } from '../../supabase/functions/_shared/web-push/payload';
import {
  clampBatchSize,
  classifyNetworkFailure,
  classifyPushResponse,
  isJobStillFresh,
  PUSH_BATCH_LIMIT,
  PUSH_MAX_ATTEMPTS,
} from '../../supabase/functions/_shared/web-push/transport';
import {
  isBodySizeAcceptable,
  isPushAction,
  parsePreferencesInput,
  parseSubscribeInput,
  parseUnsubscribeInput,
  PUSH_MAX_ACTIVE_ENDPOINTS,
  sanitizeForLog,
} from '../../supabase/functions/_shared/web-push/request';

const b64url = (bytes: number[]) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const validAuth = b64url(Array.from({ length: 16 }, (_, i) => i + 1));
const validP256dh = b64url([4, ...Array.from({ length: 64 }, (_, i) => (i * 3) % 251)]);
const validEndpoint = 'https://fcm.googleapis.com/fcm/send/abc123';

describe('authentification', () => {
  it('refuse une requete sans en-tete Authorization', () => {
    expect(extractBearer(null)).toBeNull();
    expect(isServiceRoleCaller(null, 'service-key')).toBe(false);
  });

  it('refuse un schema autre que Bearer et un jeton vide', () => {
    expect(extractBearer('Basic abc')).toBeNull();
    expect(extractBearer('Bearer   ')).toBeNull();
  });

  it('refuse un jeton de membre pour le dispatcher', () => {
    expect(isServiceRoleCaller('Bearer jwt-de-membre', 'service-key')).toBe(false);
  });

  it("refuse quand la cle service_role n'est pas configuree", () => {
    expect(isServiceRoleCaller('Bearer nimporte', undefined)).toBe(false);
    expect(isServiceRoleCaller('Bearer ', '')).toBe(false);
  });

  it('accepte uniquement la cle service_role exacte', () => {
    expect(isServiceRoleCaller('Bearer service-key', 'service-key')).toBe(true);
    expect(isServiceRoleCaller('Bearer service-key ', 'service-key')).toBe(true);
    expect(isServiceRoleCaller('Bearer service-key-x', 'service-key')).toBe(false);
  });
});

describe('validation des endpoints, protection SSRF', () => {
  it('accepte les trois services autorises', () => {
    expect(validatePushEndpoint(validEndpoint)).toEqual({ ok: true, host: 'fcm.googleapis.com' });
    expect(validatePushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/xyz').ok).toBe(true);
    expect(validatePushEndpoint('https://api.push.apple.com/3/device/xyz').ok).toBe(true);
    expect(isAllowedPushHost('push.apple.com')).toBe(true);
  });

  it('refuse un suffixe Apple trompeur', () => {
    expect(isAllowedPushHost('evilpush.apple.com')).toBe(false);
    expect(isAllowedPushHost('push.apple.com.attaquant.net')).toBe(false);
    expect(validatePushEndpoint('https://fcm.googleapis.com.attaquant.net/x').ok).toBe(false);
  });

  it('refuse les cibles internes et les schemas non HTTPS', () => {
    for (const bad of [
      'http://fcm.googleapis.com/x',
      'https://169.254.169.254/latest/meta-data',
      'https://localhost/x',
      'file:///etc/passwd',
      'https://127.0.0.1/x',
    ]) {
      expect(validatePushEndpoint(bad).ok).toBe(false);
    }
  });

  it('refuse identifiants, port, requete et fragment', () => {
    expect(validatePushEndpoint('https://user:pass@fcm.googleapis.com/x')).toEqual({
      ok: false, reason: 'endpoint_has_credentials',
    });
    expect(validatePushEndpoint('https://fcm.googleapis.com:8443/x')).toEqual({
      ok: false, reason: 'endpoint_has_port',
    });
    expect(validatePushEndpoint('https://fcm.googleapis.com/x?a=1')).toEqual({
      ok: false, reason: 'endpoint_has_query',
    });
    expect(validatePushEndpoint('https://fcm.googleapis.com/x#f')).toEqual({
      ok: false, reason: 'endpoint_has_fragment',
    });
  });

  it('refuse une valeur absente, non textuelle ou trop longue', () => {
    expect(validatePushEndpoint(undefined).ok).toBe(false);
    expect(validatePushEndpoint(42).ok).toBe(false);
    expect(validatePushEndpoint(`https://fcm.googleapis.com/${'a'.repeat(600)}`)).toEqual({
      ok: false, reason: 'endpoint_too_long',
    });
  });
});

describe('validation des cles', () => {
  it('accepte une paire conforme', () => {
    expect(validateSubscriptionKeys({ auth: validAuth, p256dh: validP256dh })).toEqual({ ok: true });
  });

  it('refuse une cle auth de longueur incorrecte', () => {
    expect(validateSubscriptionKeys({ auth: b64url([1, 2, 3]), p256dh: validP256dh })).toEqual({
      ok: false, reason: 'auth_bad_length',
    });
  });

  it('refuse une cle publique qui ne fait pas 65 octets', () => {
    expect(validateSubscriptionKeys({ auth: validAuth, p256dh: b64url([4, 1, 2]) })).toEqual({
      ok: false, reason: 'p256dh_bad_length',
    });
  });

  it('refuse une cle publique dont le prefixe est different de 04', () => {
    const wrongPrefix = b64url([2, ...Array.from({ length: 64 }, () => 7)]);
    expect(validateSubscriptionKeys({ auth: validAuth, p256dh: wrongPrefix })).toEqual({
      ok: false, reason: 'p256dh_bad_prefix',
    });
  });

  it('refuse un encodage invalide et des cles absentes', () => {
    expect(validateSubscriptionKeys({ auth: '!!!!', p256dh: validP256dh }).ok).toBe(false);
    expect(validateSubscriptionKeys({}).ok).toBe(false);
    expect(validateSubscriptionKeys(null).ok).toBe(false);
    expect(decodeBase64Url('***')).toBeNull();
  });
});

describe('requetes de l abonnement', () => {
  it('reconnait exactement les cinq actions', () => {
    for (const a of ['config', 'status', 'subscribe', 'preferences', 'unsubscribe']) {
      expect(isPushAction(a)).toBe(true);
    }
    expect(isPushAction('delete_all')).toBe(false);
  });

  it('exige un opt-in explicite', () => {
    const base = { endpoint: validEndpoint, keys: { auth: validAuth, p256dh: validP256dh } };
    expect(parseSubscribeInput(base)).toEqual({ ok: false, reason: 'no_opt_in_selected' });
    expect(parseSubscribeInput({ ...base, opt_in_messages: 'oui' })).toEqual({
      ok: false, reason: 'no_opt_in_selected',
    });
    const ok = parseSubscribeInput({ ...base, opt_in_messages: true });
    expect(ok.ok && ok.value.optInMessages).toBe(true);
    expect(ok.ok && ok.value.optInApplications).toBe(false);
    expect(ok.ok && ok.value.endpointHost).toBe('fcm.googleapis.com');
  });

  it('ne lit jamais un proprietaire depuis le corps', () => {
    const parsed = parseSubscribeInput({
      endpoint: validEndpoint,
      keys: { auth: validAuth, p256dh: validP256dh },
      opt_in_messages: true,
      user_id: '11111111-1111-4111-8111-111111111111',
    });
    expect(parsed.ok).toBe(true);
    expect(Object.keys(parsed.ok ? parsed.value : {})).not.toContain('user_id');
  });

  it('valide les identifiants de preferences et de suppression', () => {
    const id = '22222222-2222-4222-8222-222222222222';
    expect(parsePreferencesInput({ subscription_id: 'abc' }).ok).toBe(false);
    expect(parseUnsubscribeInput({ subscription_id: id })).toEqual({
      ok: true, value: { subscriptionId: id },
    });
    const prefs = parsePreferencesInput({ subscription_id: id, opt_in_applications: true });
    expect(prefs.ok && prefs.value).toEqual({
      subscriptionId: id, optInMessages: false, optInApplications: true,
    });
  });

  it('borne la taille du corps et nettoie les journaux', () => {
    expect(isBodySizeAcceptable('x'.repeat(4096))).toBe(true);
    expect(isBodySizeAcceptable('x'.repeat(4097))).toBe(false);
    expect(sanitizeForLog('https://fcm.googleapis.com/abc')).not.toContain('googleapis.com/abc');
    expect(PUSH_MAX_ACTIVE_ENDPOINTS).toBe(5);
  });
});

describe('configuration VAPID, fail closed', () => {
  const full = {
    VAPID_PUBLIC_KEY: 'BPublicKey',
    VAPID_PRIVATE_KEY: 'privee',
    VAPID_SUBJECT: 'mailto:contact@guardiens.fr',
  } as Record<string, string>;
  const reader = (env: Record<string, string>) => (name: string) => env[name];

  it('desactive le push si une variable manque', () => {
    expect(buildConfigResponse(reader({}))).toEqual({ enabled: false });
    expect(buildConfigResponse(reader({ ...full, VAPID_PRIVATE_KEY: '' }))).toEqual({ enabled: false });
  });

  it('refuse un sujet non conforme', () => {
    expect(readVapidConfig(reader({ ...full, VAPID_SUBJECT: 'contact@guardiens.fr' }))).toBeNull();
  });

  it('ne renvoie que la cle publique quand tout est configure', () => {
    const res = buildConfigResponse(reader(full));
    expect(res).toEqual({ enabled: true, publicKey: 'BPublicKey' });
    expect(JSON.stringify(res)).not.toContain('privee');
  });
});

describe('contenu des notifications', () => {
  it('utilise un texte constant sans donnee personnelle', () => {
    const message = buildPushPayload('message', 'job-1');
    expect(message).toEqual({
      title: 'Guardiens',
      body: 'Vous avez un nouveau message.',
      url: '/messages',
      tag: 'guardiens-message-job-1',
    });
    const application = buildPushPayload('application', 'job-2');
    expect(application.body).toBe('Vous avez reçu une nouvelle candidature.');
    expect(application.url).toBe('/notifications');
  });

  it('ne cible que des liens internes', () => {
    for (const kind of ['message', 'application'] as const) {
      expect(buildPushPayload(kind, 'j').url.startsWith('/')).toBe(true);
    }
  });

  it('refuse un type d evenement inconnu', () => {
    expect(isPushEventKind('mission')).toBe(false);
    expect(isPushEventKind('message')).toBe(true);
  });
});

describe('transport, erreurs et reprises', () => {
  it('traite un succes comme accepte, jamais comme remis', () => {
    const d = classifyPushResponse(201, 1);
    expect(d.outcome).toBe('accepted');
    expect(d.disableSubscription).toBe(false);
    expect(JSON.stringify(d)).not.toContain('delivered');
  });

  it('desactive l abonnement sur 404 et 410', () => {
    for (const status of [404, 410]) {
      const d = classifyPushResponse(status, 1);
      expect(d.disableSubscription).toBe(true);
      expect(d.outcome).toBe('failed');
    }
  });

  it('rejoue de facon bornee sur 429 et 5xx', () => {
    expect(classifyPushResponse(429, 1).outcome).toBe('retry');
    expect(classifyPushResponse(503, 2).outcome).toBe('retry');
    expect(classifyPushResponse(503, PUSH_MAX_ATTEMPTS).outcome).toBe('failed');
    expect(classifyPushResponse(429, 1).disableSubscription).toBe(false);
  });

  it('ne rejoue pas les autres erreurs client', () => {
    expect(classifyPushResponse(400, 1).outcome).toBe('failed');
    expect(classifyPushResponse(403, 1).outcome).toBe('failed');
  });

  it('ne rejoue jamais une tentative reseau ambigue', () => {
    const d = classifyNetworkFailure();
    expect(d.outcome).toBe('failed');
    expect(d.errorCode).toBe('network_ambiguous');
  });

  it('abandonne un job au dela d une heure', () => {
    const now = Date.parse('2026-09-19T12:00:00Z');
    expect(isJobStillFresh('2026-09-19T11:30:00Z', now)).toBe(true);
    expect(isJobStillFresh('2026-09-19T10:30:00Z', now)).toBe(false);
    expect(isJobStillFresh('pas une date', now)).toBe(false);
  });

  it('borne la taille des lots a vingt', () => {
    expect(clampBatchSize(500)).toBe(PUSH_BATCH_LIMIT);
    expect(clampBatchSize(0)).toBe(1);
    expect(clampBatchSize('cinq')).toBe(PUSH_BATCH_LIMIT);
    expect(clampBatchSize(7)).toBe(7);
  });

  it('ne produit que des codes d erreur generiques', () => {
    const codes = [404, 410, 429, 500, 400].map((s) => classifyPushResponse(s, 1).errorCode);
    for (const code of codes) expect(code).toMatch(/^http_\d{3}$/);
  });
});
