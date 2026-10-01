import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
import { handleSelfTest, type SelfTestDependencies } from '../../supabase/functions/_shared/web-push/self-test-handler';
import { buildNearbySitPayload, buildTestPayload, NEARBY_SIT_BODY } from '../../supabase/functions/_shared/web-push/payload';
import { parsePreferencesInput, parseSubscribeInput } from '../../supabase/functions/_shared/web-push/request';

const SUB_ID = '33333333-3333-4333-8333-333333333333';
const REQ_ID = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const SIT = '44444444-4444-4444-8444-444444444444';
const key = (bytes: number[]) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/fixture', auth_key: key(Array(16).fill(1)), p256dh_key: key([4, ...Array(64).fill(1)]) };
// Aucun envoi réel : send est toujours un double.
const deps = () => ({
  configured: true as boolean,
  authenticate: vi.fn().mockResolvedValue(USER as string | null),
  claim: vi.fn().mockResolvedValue(true), subscription: vi.fn().mockResolvedValue(sub),
  send: vi.fn().mockResolvedValue(201), finish: vi.fn().mockResolvedValue(true),
} satisfies SelfTestDependencies);
const req = (body: unknown = { request_id: REQ_ID, subscription_id: SUB_ID }, token = 'member-jwt') =>
  new Request('https://x.test', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) });

describe('Test membre sur son appareil', () => {
  it('refuse sans jeton ou jeton invalide, avant toute réservation', async () => {
    const d = deps(); expect((await handleSelfTest(req(undefined, ''), d)).status).toBe(401);
    d.authenticate.mockResolvedValue(null); expect((await handleSelfTest(req(), d)).status).toBe(401);
    expect(d.claim).not.toHaveBeenCalled(); expect(d.send).not.toHaveBeenCalled();
  });
  it.each([
    { request_id: REQ_ID, subscription_id: SUB_ID, user_id: '55555555-5555-4555-8555-555555555555' },
    { request_id: REQ_ID, subscription_id: SUB_ID, endpoint: 'https://evil.test' },
    { request_id: 'x', subscription_id: SUB_ID },
  ])('refuse un user_id, un endpoint ou un champ arbitraire', async (body) => {
    const d = deps(); expect((await handleSelfTest(req(body), d)).status).toBe(400); expect(d.claim).not.toHaveBeenCalled();
  });
  it('identité issue du jeton, réservation avant lecture, un seul envoi, texte de test identifiable', async () => {
    const d = deps(); const r = await handleSelfTest(req(), d); const body = await r.json();
    expect(body).toEqual({ ok: true, sent_attempts: 1, accepted: true, uncertain: false, outcome: 'accepted' });
    expect(d.claim).toHaveBeenCalledWith({ request_id: REQ_ID, user_id: USER, subscription_id: SUB_ID });
    expect(d.claim.mock.invocationCallOrder[0]).toBeLessThan(d.subscription.mock.invocationCallOrder[0]);
    expect(JSON.parse(d.send.mock.calls[0][1])).toEqual(buildTestPayload(REQ_ID));
    expect(JSON.stringify(body)).not.toContain(sub.endpoint); expect(JSON.stringify(body)).not.toContain(USER);
  });
  it('réservation refusée (rejeu, 5 min, abonnement d’un autre) : 429 et aucun envoi', async () => {
    const d = deps(); d.claim.mockResolvedValue(false);
    expect((await handleSelfTest(req(), d)).status).toBe(429); expect(d.send).not.toHaveBeenCalled();
  });
  it('erreur réseau : incertain, sans nouvel essai', async () => {
    const d = deps(); d.send.mockRejectedValue(new Error(sub.endpoint));
    const body = await (await handleSelfTest(req(), d)).json();
    expect(body.uncertain).toBe(true); expect(body.accepted).toBe(false); expect(d.send).toHaveBeenCalledOnce();
  });
});

describe('Charge utile annonces proches', () => {
  it('texte générique, aucune donnée de l’annonce', () => {
    const p = buildNearbySitPayload(REQ_ID, SIT)!;
    expect(p).toEqual({ title: 'Guardiens', body: NEARBY_SIT_BODY, url: `/sits/${SIT}`, tag: `guardiens-nearby-${SIT}`, kind: 'nearby_sit' });
    expect(buildNearbySitPayload(REQ_ID, '../admin')).toBeNull();
  });
  it('préférence annonces proches : jamais implicite, laissée intacte si absente', () => {
    expect(parsePreferencesInput({ subscription_id: SUB_ID, opt_in_messages: true }).ok && (parsePreferencesInput({ subscription_id: SUB_ID }) as { value: { optInNearbySits?: boolean } }).value.optInNearbySits).toBeUndefined();
    const s = parseSubscribeInput({ endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh_key }, opt_in_messages: true, opt_in_nearby_sits: 'yes' });
    expect(s.ok && s.value.optInNearbySits).toBe(false);
  });
});

function worker() {
  const handlers: Record<string, (e: any) => void> = {};
  const self = {
    location: { origin: 'https://guardiens.fr' },
    addEventListener: (n: string, h: (e: any) => void) => { handlers[n] = h; },
    registration: { showNotification: vi.fn().mockResolvedValue(undefined), getNotifications: vi.fn().mockResolvedValue([]) },
    clients: { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn().mockResolvedValue(null) },
  };
  runInNewContext(readFileSync('public/push-sw.js', 'utf8'), { self, URL, RegExp });
  const emit = async (n: string, data: any) => { let p: Promise<unknown> | undefined; handlers[n]({ ...data, waitUntil: (x: Promise<unknown>) => { p = x; } }); await p; };
  return { self, emit };
}

describe('Service worker : nouveaux types', () => {
  it('annonce proche : texte fixe, clic vers la bonne annonce', async () => {
    const w = worker();
    await w.emit('push', { data: { json: () => ({ kind: 'nearby_sit', body: 'Garde à Pusignan chez Marie', url: `/sits/${SIT}`, tag: `guardiens-nearby-${SIT}` }) } });
    expect(w.self.registration.showNotification).toHaveBeenCalledWith('Guardiens', expect.objectContaining({ body: NEARBY_SIT_BODY, data: { url: `/sits/${SIT}` } }));
    expect(JSON.stringify(w.self.registration.showNotification.mock.calls)).not.toContain('Pusignan');
    await w.emit('notificationclick', { notification: { close: vi.fn(), data: { url: `/sits/${SIT}` } } });
    expect(w.self.clients.openWindow).toHaveBeenCalledWith(`https://guardiens.fr/sits/${SIT}`);
  });
  it('annonce proche avec route invalide : retombe sur le message générique', async () => {
    const w = worker();
    await w.emit('push', { data: { json: () => ({ kind: 'nearby_sit', url: '/admin' }) } });
    expect(w.self.registration.showNotification).toHaveBeenCalledWith('Guardiens', expect.objectContaining({ data: { url: '/messages' } }));
  });
  it('test : notification identifiable, clic vers les réglages', async () => {
    const w = worker();
    await w.emit('push', { data: { json: () => buildTestPayload(REQ_ID) } });
    expect(w.self.registration.showNotification).toHaveBeenCalledWith('Guardiens', expect.objectContaining({ body: expect.stringContaining('test'), data: { url: '/settings?section=notifications' } }));
  });
});
