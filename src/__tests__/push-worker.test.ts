import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi } from 'vitest';

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const self = {
    location: { origin: 'https://guardiens.fr' },
    addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; },
    registration: { showNotification: vi.fn().mockResolvedValue(undefined), getNotifications: vi.fn().mockResolvedValue([]) },
    clients: { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn().mockResolvedValue(null) },
  };
  runInNewContext(readFileSync('public/push-sw.js', 'utf8'), { self, URL });
  async function emit(name: string, data: any) {
    let pending: Promise<unknown> | undefined;
    handlers[name]({ ...data, waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
  }
  return { self, handlers, emit };
}

describe('Push service worker', () => {
  it('discards arbitrary private text, names, URLs and unsafe tags', async () => {
    const w = worker();
    await w.emit('push', { data: { json: () => ({ title: 'Private name', body: 'Private message', url: 'https://evil.example', tag: 'private@example.test' }) } });
    expect(w.self.registration.showNotification).toHaveBeenCalledWith('Guardiens', expect.objectContaining({ body: 'Vous avez un nouveau message.', tag: 'guardiens-activity', data: { url: '/messages' } }));
    expect(JSON.stringify(w.self.registration.showNotification.mock.calls)).not.toContain('Private');
  });
  it('shows a generic application alert', async () => {
    const w = worker();
    await w.emit('push', { data: { json: () => ({ body: 'Vous avez reçu une nouvelle candidature.' }) } });
    expect(w.self.registration.showNotification).toHaveBeenCalledWith('Guardiens', expect.objectContaining({ data: { url: '/notifications' } }));
  });
  it('handles malformed payloads without losing the visible notification', async () => {
    const w = worker();
    await w.emit('push', { data: { json: () => { throw new Error('bad json'); } } });
    expect(w.self.registration.showNotification).toHaveBeenCalledOnce();
  });
  it('never opens an external URL or an arbitrary internal route', async () => {
    const w = worker();
    const close = vi.fn();
    await w.emit('notificationclick', { notification: { close, data: { url: 'https://evil.example' } } });
    expect(w.self.clients.openWindow).toHaveBeenCalledWith('https://guardiens.fr/messages');
    expect(close).toHaveBeenCalledOnce();
  });
  it('focuses an existing same-origin tab on the allowed page', async () => {
    const w = worker(); const focus = vi.fn(); const navigate = vi.fn().mockResolvedValue({ focus });
    w.self.clients.matchAll.mockResolvedValue([{ url: 'https://guardiens.fr/parametres', navigate }]);
    await w.emit('notificationclick', { notification: { close: vi.fn(), data: { url: '/notifications' } } });
    expect(navigate).toHaveBeenCalledWith('https://guardiens.fr/notifications');
    expect(focus).toHaveBeenCalledOnce(); expect(w.self.clients.openWindow).not.toHaveBeenCalled();
  });
  it('closes pending notices on logout and does not cache pages', async () => {
    const w = worker(); const close = vi.fn();
    w.self.registration.getNotifications.mockResolvedValue([{ close }]);
    await w.emit('message', { data: { type: 'GUARDIENS_CLEAR_PUSH' } });
    expect(close).toHaveBeenCalledOnce(); expect(w.handlers.fetch).toBeUndefined();
  });
});
