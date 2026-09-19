import { supabase } from '@/integrations/supabase/client';

export interface PushPreferences { messages: boolean; applications: boolean }
export interface PushConfig { enabled: boolean; publicKey?: string }
export const PUSH_OWNER_KEY = 'guardiens_push_device_owner';
export const PUSH_ID_KEY = 'guardiens_push_subscription_id';
const TIMEOUT_MS = 10000;

export function pushSupport(): 'supported' | 'ios-install' | 'unsupported' {
  if (typeof window === 'undefined' || !window.isSecureContext) return 'unsupported';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  if (ios && !standalone) return 'ios-install';
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    ? 'supported' : 'unsupported';
}

async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('push_timeout')), TIMEOUT_MS);
    })]);
  } finally { clearTimeout(timer); }
}

async function api<T>(userId: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== userId) throw new Error('push_session_changed');
  const { data, error } = await bounded(supabase.functions.invoke('push-subscription', {
    body, headers: { Authorization: `Bearer ${session.access_token}` },
  }));
  if (error || !data || data.error) throw new Error('push_request_failed');
  const current = await supabase.auth.getSession();
  if (current.data.session?.user.id !== userId) throw new Error('push_session_changed');
  return data as T;
}

export const getPushConfig = (userId: string) => api<PushConfig>(userId, { action: 'config' });

export function decodePublicKey(key: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]{87}$/.test(key)) throw new Error('push_invalid_key');
  const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/') + '=');
  const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
  if (bytes.length !== 65 || bytes[0] !== 4) throw new Error('push_invalid_key');
  return bytes;
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;
  const reg = await bounded(navigator.serviceWorker.getRegistration('/'));
  const script = reg?.active?.scriptURL ?? reg?.waiting?.scriptURL ?? reg?.installing?.scriptURL;
  return script && new URL(script).pathname === '/push-sw.js' ? reg : undefined;
}

export async function getPushState(userId: string): Promise<{ subscribed: boolean } & PushPreferences> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return { subscribed: false, messages: true, applications: true };
  if (localStorage.getItem(PUSH_OWNER_KEY) !== userId) {
    await sub.unsubscribe();
    for (const item of await reg!.getNotifications()) item.close();
    localStorage.removeItem(PUSH_OWNER_KEY);
    return { subscribed: false, messages: true, applications: true };
  }
  let result: { subscriptions: Array<{ id: string; enabled: boolean; opt_in_messages: boolean; opt_in_applications: boolean }> };
  try { result = await api(userId, { action: 'status' }); }
  catch { return { subscribed: true, messages: true, applications: true }; }
  const row = result.subscriptions.find((item) => item.id === localStorage.getItem(PUSH_ID_KEY));
  return { subscribed: Boolean(row?.enabled), messages: row?.opt_in_messages ?? true, applications: row?.opt_in_applications ?? true };
}

// Permission is requested synchronously in the click handler, before any network await.
export async function enablePush(userId: string, config: PushConfig, prefs: PushPreferences): Promise<void> {
  if (!config.enabled || !config.publicKey || pushSupport() !== 'supported') throw new Error('push_unavailable');
  const applicationServerKey = decodePublicKey(config.publicKey);
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('push_permission_denied');
  const reg = await bounded(navigator.serviceWorker.register('/push-sw.js', { scope: '/' }));
  await bounded(navigator.serviceWorker.ready);
  let sub = await reg.pushManager.getSubscription();
  if (sub && localStorage.getItem(PUSH_OWNER_KEY) !== userId) { await sub.unsubscribe(); sub = null; }
  sub ??= await bounded(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }));
  try {
    const result = await api<{ subscription_id: string }>(userId, {
      action: 'subscribe', ...sub.toJSON(), opt_in_messages: prefs.messages, opt_in_applications: prefs.applications,
    });
    localStorage.setItem(PUSH_OWNER_KEY, userId);
    localStorage.setItem(PUSH_ID_KEY, result.subscription_id);
  } catch (error) {
    await sub.unsubscribe().catch(() => false);
    throw error;
  }
}

export async function updatePushPreferences(userId: string, prefs: PushPreferences): Promise<void> {
  const sub = await (await registration())?.pushManager.getSubscription();
  if (!sub || localStorage.getItem(PUSH_OWNER_KEY) !== userId) throw new Error('push_not_subscribed');
  const result = await api<{ updated: boolean }>(userId, {
    action: 'preferences', subscription_id: localStorage.getItem(PUSH_ID_KEY),
    opt_in_messages: prefs.messages, opt_in_applications: prefs.applications,
  });
  if (!result.updated) throw new Error('push_not_updated');
}

export async function disablePush(userId?: string): Promise<void> {
  const owner = localStorage.getItem(PUSH_OWNER_KEY);
  const subscriptionId = localStorage.getItem(PUSH_ID_KEY);
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (reg) for (const item of await reg.getNotifications()) item.close();
  if (sub) {
    const results = await Promise.allSettled([
      userId && owner === userId
        ? api<{ deleted: boolean }>(userId, { action: 'unsubscribe', subscription_id: subscriptionId })
            .then((result) => { if (!result.deleted) throw new Error('push_not_deleted'); })
        : Promise.reject(),
      bounded(sub.unsubscribe()).then((ok) => { if (!ok) throw new Error('push_unsubscribe_failed'); }),
    ]);
    if (results.every((result) => result.status === 'rejected')) throw new Error('push_disable_failed');
  }
  if (localStorage.getItem(PUSH_OWNER_KEY) === owner && localStorage.getItem(PUSH_ID_KEY) === subscriptionId) {
    localStorage.removeItem(PUSH_OWNER_KEY);
    localStorage.removeItem(PUSH_ID_KEY);
  }
}

// Called before explicit logout while the session is still valid. A broken push
// service must not trap the member in a signed-in session.
export async function cleanupPushOnLogout(userId?: string): Promise<void> {
  try { await bounded(disablePush(userId)); } catch { /* Browser revocation remains available. */ }
}

export function reconcilePushSession(userId?: string): void {
  try {
    const owner = localStorage.getItem(PUSH_OWNER_KEY);
    if (owner && owner !== userId) setTimeout(() => { void cleanupPushOnLogout(); }, 0);
  } catch { /* Unavailable storage means no persisted device owner. */ }
}
