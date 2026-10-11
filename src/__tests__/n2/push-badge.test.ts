/**
 * Lot N2 (11/10/2026) : pastille de l'icône et notification plus rapide.
 */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPushPayload, sanitizeBadge } from '../../../supabase/functions/_shared/web-push/payload';
import { resetAppBadgeMemo, syncAppBadge } from '@/lib/appBadge';

function worker(navigator?: Record<string, unknown>) {
  const handlers: Record<string, (event: any) => void> = {};
  const self = {
    location: { origin: 'https://guardiens.fr' },
    navigator,
    addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; },
    registration: { showNotification: vi.fn().mockResolvedValue(undefined), getNotifications: vi.fn().mockResolvedValue([]) },
    clients: { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn().mockResolvedValue(null) },
  };
  runInNewContext(readFileSync('public/push-sw.js', 'utf8'), { self, URL });
  async function push(payload: unknown) {
    let pending: Promise<unknown> | undefined;
    handlers.push({ data: { json: () => payload }, waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
  }
  return { self, push };
}

describe('N2, contenu de la notification', () => {
  it('le nombre de non-lus accompagne le texte constant, borné à 99', () => {
    expect(buildPushPayload('message', 'j', 3)).toMatchObject({ body: 'Vous avez un nouveau message.', badge: 3 });
    expect(buildPushPayload('message', 'j', 250).badge).toBe(99);
  });
  it('valeur douteuse : aucune pastille', () => {
    for (const value of [-1, 1.5, '3', null, undefined, Number.NaN]) expect(sanitizeBadge(value)).toBeUndefined();
    expect(buildPushPayload('message', 'j', 'x')).not.toHaveProperty('badge');
  });
});

describe('N2, service worker', () => {
  it('pose la pastille et l icône monochrome de la barre d état', async () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    const w = worker({ setAppBadge });
    await w.push({ body: 'Vous avez un nouveau message.', badge: 4 });
    expect(setAppBadge).toHaveBeenCalledWith(4);
    expect(w.self.registration.showNotification).toHaveBeenCalledWith('Guardiens', expect.objectContaining({ badge: '/icons/badge-96.png' }));
  });
  it('sans API de pastille ou pastille refusée : la notification part quand même', async () => {
    const w = worker(undefined);
    await w.push({ badge: 2 });
    expect(w.self.registration.showNotification).toHaveBeenCalledOnce();
    const refused = worker({ setAppBadge: vi.fn().mockRejectedValue(new Error('denied')) });
    await refused.push({ badge: 2 });
    expect(refused.self.registration.showNotification).toHaveBeenCalledOnce();
  });
  it('sans nombre dans l envoi (annonce proche, test) : pastille inchangée', async () => {
    const setAppBadge = vi.fn();
    const w = worker({ setAppBadge });
    await w.push({ kind: 'test', tag: 'guardiens-test' });
    expect(setAppBadge).not.toHaveBeenCalled();
  });
});

describe('N2, pastille tenue à jour par le site', () => {
  afterEach(() => { resetAppBadgeMemo(); vi.unstubAllGlobals(); });
  it('pose le total puis l efface quand tout est lu, sans appel répété', () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { setAppBadge, clearAppBadge });
    syncAppBadge(2); syncAppBadge(2);
    expect(setAppBadge).toHaveBeenCalledTimes(1);
    expect(setAppBadge).toHaveBeenCalledWith(2);
    syncAppBadge(0);
    expect(clearAppBadge).toHaveBeenCalledOnce();
    delete (navigator as any).setAppBadge; delete (navigator as any).clearAppBadge;
  });
  it('navigateur sans API : aucune erreur', () => {
    expect(() => syncAppBadge(5)).not.toThrow();
  });
});
