/**
 * Lot N1 (11/10/2026) : un abonnement push activé reste activé.
 * Verrouille les quatre pannes constatées en base sur le compte fondateur :
 * désabonnement à la perte de session, stockage local effacé, adresse morte
 * réutilisée, nouvelle adresse jamais transmise.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enablePush, getPushState, PUSH_ENDPOINT_KEY, PUSH_ID_KEY, PUSH_OWNER_KEY, reconcilePushSession,
  repairPushDevice, subscriptionMatchesKey, markPushOptOut,
} from '@/lib/web-push';
import { reconcilePushSessionLazy } from '@/lib/pushSession';

const mocks = vi.hoisted(() => ({ session: vi.fn(), invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: mocks.session }, functions: { invoke: mocks.invoke } } }));

const keyBytes = [4, ...Array(64).fill(1)];
const publicKey = btoa(String.fromCharCode(...keyBytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const otherKey = new Uint8Array([4, ...Array(64).fill(2)]).buffer;

function fakeSub(endpoint: string, key: ArrayBuffer | null = new Uint8Array(keyBytes).buffer) {
  return {
    endpoint,
    options: { applicationServerKey: key },
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: () => ({ endpoint, keys: { p256dh: publicKey, auth: 'fixture' } }),
  };
}
function worker() {
  return { scriptURL: 'https://guardiens.fr/push-sw.js', state: 'activated', addEventListener() {}, removeEventListener() {},
    postMessage: (msg: { type: string }, ports?: MessagePort[]) => { if (msg.type === 'GUARDIENS_PUSH_SW_VERSION' && ports?.[0]) ports[0].postMessage({ version: 'push-3' }); } };
}

let reg: any;
let rows: Array<Record<string, unknown>>;
let calls: Array<Record<string, unknown>>;
const fresh = fakeSub('https://fcm.googleapis.com/fcm/send/fresh');
const legacy = fakeSub('https://fcm.googleapis.com/fcm/send/legacy');
const taken = fakeSub('https://fcm.googleapis.com/fcm/send/taken');

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  rows = []; calls = [];
  mocks.session.mockResolvedValue({ data: { session: { user: { id: 'u1' }, access_token: 'fixture-token' } } });
  mocks.invoke.mockImplementation(async (_name: string, { body }: { body: Record<string, unknown> }) => {
    calls.push(body);
    if (body.action === 'config') return { data: { enabled: true, publicKey }, error: null };
    if (body.action === 'status') return { data: { subscriptions: rows }, error: null };
    if (body.action === 'subscribe') {
      if (body.endpoint === legacy.endpoint) return { data: { subscription_id: 'old-id' }, error: null };
      if (body.endpoint === taken.endpoint) return { data: null, error: { context: new Response(JSON.stringify({ error: 'subscribe_refused', code: 'endpoint_unavailable' }), { status: 400 }) } };
      return { data: { subscription_id: body.endpoint === fresh.endpoint ? 'new-id' : 'same-id' }, error: null };
    }
    if (body.action === 'unsubscribe') return { data: { deleted: true }, error: null };
    return { data: null, error: new Error('unexpected') };
  });
  reg = { active: worker(), update: vi.fn(), getNotifications: vi.fn().mockResolvedValue([]),
    pushManager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe: vi.fn().mockResolvedValue(fresh) } };
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn().mockResolvedValue('granted') });
  vi.stubGlobal('PushManager', function PushManager() {});
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
    register: vi.fn().mockResolvedValue(reg), ready: Promise.resolve(reg), getRegistration: vi.fn().mockResolvedValue(reg) } });
});

const device = (endpoint?: string) => {
  localStorage.setItem(PUSH_OWNER_KEY, 'u1'); localStorage.setItem(PUSH_ID_KEY, 'old-id');
  if (endpoint) localStorage.setItem(PUSH_ENDPOINT_KEY, endpoint);
};
const row = (enabled: boolean, extra: Record<string, unknown> = {}) =>
  ({ id: 'old-id', enabled, opt_in_messages: true, opt_in_applications: false, opt_in_nearby_sits: false, ...extra });
const actions = () => calls.map((c) => c.action);

describe('N1, session perdue', () => {
  it('sans compte, le navigateur reste abonné (web-push et garde légère)', async () => {
    vi.useFakeTimers();
    device();
    reconcilePushSession(); reconcilePushSessionLazy();
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    expect(localStorage.getItem(PUSH_OWNER_KEY)).toBe('u1');
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('sans propriétaire mémorisé, getPushState ne désabonne pas', async () => {
    const sub = fakeSub('https://fcm.googleapis.com/fcm/send/kept');
    reg.pushManager.getSubscription.mockResolvedValue(sub);
    expect((await getPushState('u1')).subscribed).toBe(false);
    expect(sub.unsubscribe).not.toHaveBeenCalled();
  });
});

describe('N1, réparation silencieuse', () => {
  it('stockage effacé : l abonnement du navigateur est rattaché au membre', async () => {
    const sub = fakeSub('https://fcm.googleapis.com/fcm/send/kept');
    reg.pushManager.getSubscription.mockResolvedValue(sub);
    expect(await repairPushDevice('u1')).toEqual({ kind: 'repaired' });
    expect(calls.find((c) => c.action === 'subscribe')).toMatchObject({ endpoint: sub.endpoint, opt_in_messages: true, opt_in_applications: true });
    expect(localStorage.getItem(PUSH_OWNER_KEY)).toBe('u1');
    expect(localStorage.getItem(PUSH_ID_KEY)).toBe('same-id');
    expect(localStorage.getItem(PUSH_ENDPOINT_KEY)).toBe(sub.endpoint);
    expect(sub.unsubscribe).not.toHaveBeenCalled();
  });

  it('après une désactivation volontaire, rien n est rattaché', async () => {
    reg.pushManager.getSubscription.mockResolvedValue(fakeSub('https://fcm.googleapis.com/fcm/send/kept'));
    markPushOptOut('u1');
    expect(await repairPushDevice('u1')).toEqual({ kind: 'none' });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('adresse morte (410) : nouvelle adresse, ancienne ligne supprimée, préférences gardées', async () => {
    const dead = fakeSub('https://fcm.googleapis.com/fcm/send/dead');
    device(dead.endpoint); rows = [row(false)];
    reg.pushManager.getSubscription.mockResolvedValue(dead);
    expect(await repairPushDevice('u1')).toEqual({ kind: 'repaired' });
    expect(dead.unsubscribe).toHaveBeenCalledOnce();
    expect(reg.pushManager.subscribe).toHaveBeenCalledOnce();
    expect(calls.find((c) => c.action === 'subscribe')).toMatchObject({ endpoint: fresh.endpoint, opt_in_messages: true, opt_in_applications: false });
    expect(calls.find((c) => c.action === 'unsubscribe')).toMatchObject({ subscription_id: 'old-id' });
    expect(localStorage.getItem(PUSH_ID_KEY)).toBe('new-id');
    expect(localStorage.getItem(PUSH_ENDPOINT_KEY)).toBe(fresh.endpoint);
  });

  it('ligne active mais navigateur sans abonnement : nouvelle adresse', async () => {
    device('https://fcm.googleapis.com/fcm/send/lost'); rows = [row(true)];
    expect(await repairPushDevice('u1')).toEqual({ kind: 'repaired' });
    expect(reg.pushManager.subscribe).toHaveBeenCalledOnce();
    expect(actions()).toContain('unsubscribe');
  });

  it('nouvelle adresse donnée par le navigateur : transmise sans réabonnement', async () => {
    const renewed = fakeSub('https://fcm.googleapis.com/fcm/send/fresh');
    device('https://fcm.googleapis.com/fcm/send/before'); rows = [row(true)];
    reg.pushManager.getSubscription.mockResolvedValue(renewed);
    expect(await repairPushDevice('u1')).toEqual({ kind: 'repaired' });
    expect(renewed.unsubscribe).not.toHaveBeenCalled();
    expect(reg.pushManager.subscribe).not.toHaveBeenCalled();
    expect(calls.find((c) => c.action === 'subscribe')).toMatchObject({ endpoint: renewed.endpoint });
    expect(localStorage.getItem(PUSH_ENDPOINT_KEY)).toBe(renewed.endpoint);
  });

  it('clé du serveur différente : nouvel abonnement', async () => {
    const wrongKey = fakeSub('https://fcm.googleapis.com/fcm/send/wrong-key', otherKey);
    device(wrongKey.endpoint); rows = [row(true)];
    reg.pushManager.getSubscription.mockResolvedValue(wrongKey);
    expect(await repairPushDevice('u1')).toEqual({ kind: 'repaired' });
    expect(wrongKey.unsubscribe).toHaveBeenCalledOnce();
    expect(reg.pushManager.subscribe).toHaveBeenCalledOnce();
  });

  it('appareil sain : aucune écriture', async () => {
    const sub = fakeSub('https://fcm.googleapis.com/fcm/send/ok');
    device(sub.endpoint); rows = [row(true)];
    reg.pushManager.getSubscription.mockResolvedValue(sub);
    expect(await repairPushDevice('u1')).toEqual({ kind: 'ok' });
    expect(actions()).not.toContain('subscribe');
    expect(actions()).not.toContain('unsubscribe');
  });

  it('autorisation retirée : geste du membre requis, préférences du serveur reprises', async () => {
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() });
    device('https://fcm.googleapis.com/fcm/send/dead'); rows = [row(false, { opt_in_nearby_sits: true })];
    expect(await repairPushDevice('u1')).toEqual({ kind: 'needs_gesture', prefs: { messages: true, applications: false, nearbySits: true } });
    expect(reg.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('appareil inscrit avant N1 (adresse non mémorisée) : adresse confirmée, aucune ligne retirée', async () => {
    device(); rows = [row(true)];
    reg.pushManager.getSubscription.mockResolvedValue(legacy);
    expect(await repairPushDevice('u1')).toEqual({ kind: 'repaired' });
    expect(legacy.unsubscribe).not.toHaveBeenCalled();
    expect(actions()).not.toContain('unsubscribe');
    expect(localStorage.getItem(PUSH_ENDPOINT_KEY)).toBe(legacy.endpoint);
    expect(localStorage.getItem(PUSH_ID_KEY)).toBe('old-id');
  });

  it('adresse rattachée à un autre compte : ce navigateur est désabonné', async () => {
    reg.pushManager.getSubscription.mockResolvedValue(taken);
    expect(await repairPushDevice('u1')).toEqual({ kind: 'failed' });
    expect(taken.unsubscribe).toHaveBeenCalledOnce();
  });

  it('réparations simultanées : une seule exécution', async () => {
    const sub = fakeSub('https://fcm.googleapis.com/fcm/send/kept');
    reg.pushManager.getSubscription.mockResolvedValue(sub);
    const [a, b] = await Promise.all([repairPushDevice('u1'), repairPushDevice('u1')]);
    expect(a).toEqual(b);
    expect(actions().filter((x) => x === 'subscribe')).toHaveLength(1);
  });

  it('worker perdu, autorisation accordée : réinstallé puis nouvelle adresse', async () => {
    device('https://fcm.googleapis.com/fcm/send/dead'); rows = [row(false)];
    (navigator.serviceWorker.getRegistration as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    expect(await repairPushDevice('u1')).toEqual({ kind: 'repaired' });
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/push-sw.js', { scope: '/' });
    expect(reg.pushManager.subscribe).toHaveBeenCalledOnce();
  });

  it('appareil d un autre compte : rien n est touché', async () => {
    localStorage.setItem(PUSH_OWNER_KEY, 'other');
    expect(await repairPushDevice('u1')).toEqual({ kind: 'none' });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});

describe('N1, activation', () => {
  it('repart toujours d une adresse neuve et retire l ancienne ligne de cet appareil', async () => {
    const dead = fakeSub('https://fcm.googleapis.com/fcm/send/dead');
    device(dead.endpoint);
    reg.pushManager.getSubscription.mockResolvedValue(dead);
    await enablePush('u1', { enabled: true, publicKey }, { messages: true, applications: true });
    expect(dead.unsubscribe).toHaveBeenCalledOnce();
    expect(calls.find((c) => c.action === 'subscribe')).toMatchObject({ endpoint: fresh.endpoint });
    expect(calls.find((c) => c.action === 'unsubscribe')).toMatchObject({ subscription_id: 'old-id' });
    expect(localStorage.getItem(PUSH_ENDPOINT_KEY)).toBe(fresh.endpoint);
  });
});

describe('N1, comparaison de clé', () => {
  it('clé inconnue : jamais considérée comme différente', () => {
    expect(subscriptionMatchesKey(fakeSub('x', null) as unknown as PushSubscription, new Uint8Array(keyBytes))).toBe(true);
    expect(subscriptionMatchesKey(fakeSub('x', otherKey) as unknown as PushSubscription, new Uint8Array(keyBytes))).toBe(false);
  });
});
