import { supabase } from '@/integrations/supabase/client';

export interface PushPreferences { messages: boolean; applications: boolean; nearbySits?: boolean }
export interface PushState extends PushPreferences {
  subscribed: boolean;
  /** Le serveur n'a pas pu confirmer l'état : ne jamais l'afficher comme actif. */
  uncertain?: boolean;
  nearbyAvailable?: boolean;
}
export interface PushConfig { enabled: boolean; publicKey?: string }
import { PUSH_OWNER_KEY } from './pushSession';
export { PUSH_OWNER_KEY };
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
  const { data: { session } } = await bounded(supabase.auth.getSession());
  if (!session || session.user.id !== userId) throw new Error('push_session_changed');
  const { data, error } = await bounded(supabase.functions.invoke('push-subscription', {
    body, headers: { Authorization: `Bearer ${session.access_token}` },
  }));
  if (error || !data || data.error) throw new Error('push_request_failed');
  const current = await bounded(supabase.auth.getSession());
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

/** Doit correspondre à PUSH_SW_VERSION dans public/push-sw.js. */
export const PUSH_SW_VERSION = 'push-3';
const WORKER_WAIT_MS = 10000;

function askVersion(worker: ServiceWorker | null | undefined, ms = 2000): Promise<string | null> {
  if (!worker || typeof MessageChannel === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, ms);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer); channel.port1.close();
      resolve(typeof event.data?.version === 'string' ? event.data.version : null);
    };
    try { worker.postMessage({ type: 'GUARDIENS_PUSH_SW_VERSION' }, [channel.port2]); }
    catch { clearTimeout(timer); resolve(null); }
  });
}

function reachState(worker: ServiceWorker, states: ServiceWorkerState[], ms = WORKER_WAIT_MS): Promise<void> {
  if (states.includes(worker.state)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { worker.removeEventListener('statechange', check); reject(new Error('push_worker_timeout')); }, ms);
    function check() {
      if (worker.state === 'redundant') { clearTimeout(timer); worker.removeEventListener('statechange', check); reject(new Error('push_worker_redundant')); }
      else if (states.includes(worker.state)) { clearTimeout(timer); worker.removeEventListener('statechange', check); resolve(); }
    }
    worker.addEventListener('statechange', check);
  });
}

/**
 * Garantit que le worker push actif sait afficher les annonces proches et le
 * test (sinon un ancien worker les montrerait comme « nouveau message »).
 * Met à jour puis active le nouveau worker sur demande explicite ; échoue si
 * la version n'a pas pu être confirmée. Aucun cache, aucune session touchée.
 */
export async function ensurePushWorkerCurrent(reg: ServiceWorkerRegistration): Promise<void> {
  if (await askVersion(reg.active) === PUSH_SW_VERSION) return;
  await bounded(reg.update());
  const next = reg.installing ?? reg.waiting;
  if (next) {
    await reachState(next, ['installed', 'activating', 'activated']);
    if (next.state === 'installed') next.postMessage({ type: 'GUARDIENS_SKIP_WAITING' });
    await reachState(next, ['activated']);
  }
  if (await askVersion(reg.active) !== PUSH_SW_VERSION) throw new Error('push_worker_outdated');
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;
  const reg = await bounded(navigator.serviceWorker.getRegistration('/'));
  const script = reg?.active?.scriptURL ?? reg?.waiting?.scriptURL ?? reg?.installing?.scriptURL;
  return script && new URL(script).pathname === '/push-sw.js' ? reg : undefined;
}

export async function getPushState(userId: string): Promise<PushState> {
  const off: PushState = { subscribed: false, messages: true, applications: true, nearbySits: false };
  const reg = await registration();
  const sub = reg ? await bounded(reg.pushManager.getSubscription()) : null;
  if (!sub) return off;
  if (localStorage.getItem(PUSH_OWNER_KEY) !== userId) {
    await bounded(sub.unsubscribe());
    for (const item of await bounded(reg!.getNotifications())) item.close();
    localStorage.removeItem(PUSH_OWNER_KEY);
    return off;
  }
  let result: { nearby_available?: boolean; subscriptions: Array<{ id: string; enabled: boolean; opt_in_messages: boolean; opt_in_applications: boolean; opt_in_nearby_sits?: boolean }> };
  // Erreur serveur : état incertain, jamais présenté comme actif.
  try { result = await api(userId, { action: 'status' }); }
  catch { return { ...off, uncertain: true }; }
  const row = result.subscriptions.find((item) => item.id === localStorage.getItem(PUSH_ID_KEY));
  rememberNearby(userId, result.nearby_available === true, row?.opt_in_nearby_sits === true);
  return {
    subscribed: Boolean(row?.enabled),
    messages: row?.opt_in_messages ?? true,
    applications: row?.opt_in_applications ?? true,
    nearbySits: row?.opt_in_nearby_sits === true,
    nearbyAvailable: result.nearby_available === true,
  };
}

const NEARBY_KEY = 'guardiens_push_nearby';
/** Mémorise, sans donnée personnelle, si le réglage annonces proches existe et s'il est actif. */
function rememberNearby(userId: string, available: boolean, enabled: boolean) {
  try { localStorage.setItem(NEARBY_KEY, JSON.stringify({ user: userId, available, enabled })); } catch { /* facultatif */ }
}
/** Pour la carte du tableau de bord : réglage disponible mais pas encore activé sur cet appareil. */
export function nearbySettingToDiscover(userId: string): boolean {
  try {
    const v = JSON.parse(localStorage.getItem(NEARBY_KEY) ?? '{}');
    return v.user === userId && v.available === true && v.enabled !== true;
  } catch { return false; }
}

/** Abonnement local de ce membre, sans appel réseau (pour les cartes du tableau de bord). */
export function hasLocalPushSubscription(userId: string): boolean {
  try { return localStorage.getItem(PUSH_OWNER_KEY) === userId && !!localStorage.getItem(PUSH_ID_KEY); }
  catch { return false; }
}

/**
 * accepted / rejected : réponse du serveur après un envoi.
 * uncertain : un envoi a pu avoir lieu (pas de réponse, délai dépassé) ; ne jamais relancer automatiquement.
 * rate_limited : un test a déjà été demandé il y a moins de 5 minutes (rien envoyé maintenant).
 * unavailable : cet appareil n'est plus actif côté serveur (rien envoyé).
 * worker_outdated : le worker n'a pas pu être mis à jour (rien envoyé).
 * stale : le compte a changé pendant l'attente, résultat à ignorer.
 * error : rien n'a été envoyé.
 */
export type PushTestResult = 'accepted' | 'rejected' | 'uncertain' | 'rate_limited' | 'unavailable' | 'worker_outdated' | 'stale' | 'error';

async function sameUser(userId: string): Promise<boolean> {
  try { return (await bounded(supabase.auth.getSession())).data.session?.user.id === userId; }
  catch { return false; }
}

/** Test sur l'appareil courant. Le serveur dérive le membre du jeton ; seul l'identifiant d'abonnement local est transmis. */
export async function testPushOnDevice(userId: string, requestId = crypto.randomUUID()): Promise<PushTestResult> {
  const subscriptionId = localStorage.getItem(PUSH_ID_KEY);
  if (!subscriptionId || localStorage.getItem(PUSH_OWNER_KEY) !== userId) return 'error';
  const reg = await registration().catch(() => undefined);
  if (!reg) return 'error';
  // Pas d'envoi tant que le worker capable d'afficher le test n'est pas confirmé.
  try { await ensurePushWorkerCurrent(reg); } catch { return 'worker_outdated'; }
  const { data: { session } } = await bounded(supabase.auth.getSession());
  if (!session || session.user.id !== userId) return 'error';
  let response: { data: unknown; error: unknown };
  try {
    response = await bounded(supabase.functions.invoke('push-self-test', {
      body: { request_id: requestId, subscription_id: subscriptionId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    }));
  } catch {
    // Délai dépassé côté client : la demande a pu être traitée.
    return await sameUser(userId) ? 'uncertain' : 'stale';
  }
  // Identité revalidée après l'attente : un autre compte ne voit pas ce résultat.
  if (!await sameUser(userId)) return 'stale';
  const { data, error } = response as { data: Record<string, unknown> | null; error: { context?: { status?: number } } | null };
  if (error) {
    const status = error?.context?.status;
    if (typeof status !== 'number') return 'uncertain'; // réseau : envoi possible
    if (status === 429) return 'rate_limited';
    if (status === 409) {
      let reason: unknown;
      try { reason = (await (error.context as unknown as Response).clone().json())?.error; } catch { reason = undefined; }
      return reason === 'subscription_unavailable' ? 'unavailable' : 'rate_limited';
    }
    if (status > 500 && status !== 503) return 'uncertain'; // passerelle ou délai serveur : envoi possible
    return 'error'; // 400, 401, 503, 500 claim_failed : rien envoyé
  }
  if (data?.accepted === true) return 'accepted';
  if (data?.uncertain === true) return 'uncertain';
  return data?.sent_attempts === 0 ? 'unavailable' : 'rejected';
}

export interface EnableResult { nearbyRequested: boolean; nearbySaved: boolean }

// Permission is requested synchronously in the click handler, before any network await.
export async function enablePush(userId: string, config: PushConfig, prefs: PushPreferences): Promise<EnableResult> {
  if (!config.enabled || !config.publicKey || pushSupport() !== 'supported') throw new Error('push_unavailable');
  const applicationServerKey = decodePublicKey(config.publicKey);
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('push_permission_denied');
  const reg = await bounded(navigator.serviceWorker.register('/push-sw.js', { scope: '/' }));
  await bounded(navigator.serviceWorker.ready);
  // Un worker déjà installé n'est pas forcément à jour : version confirmée avant tout abonnement.
  await ensurePushWorkerCurrent(reg);
  let sub = await reg.pushManager.getSubscription();
  if (sub && localStorage.getItem(PUSH_OWNER_KEY) !== userId) { await sub.unsubscribe(); sub = null; }
  sub ??= await bounded(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }));
  try {
    const result = await api<{ subscription_id: string; nearby_requested?: boolean; nearby_saved?: boolean }>(userId, {
      action: 'subscribe', ...sub.toJSON(), opt_in_messages: prefs.messages, opt_in_applications: prefs.applications,
      opt_in_nearby_sits: prefs.nearbySits === true,
    });
    localStorage.setItem(PUSH_OWNER_KEY, userId);
    localStorage.setItem(PUSH_ID_KEY, result.subscription_id);
    const nearbyRequested = prefs.nearbySits === true;
    return { nearbyRequested, nearbySaved: nearbyRequested && result.nearby_saved === true };
  } catch (error) {
    await sub.unsubscribe().catch(() => false);
    throw error;
  }
}

export async function updatePushPreferences(userId: string, prefs: PushPreferences): Promise<void> {
  const sub = await (await registration())?.pushManager.getSubscription();
  if (!sub || localStorage.getItem(PUSH_OWNER_KEY) !== userId) throw new Error('push_not_subscribed');
  // Activer les annonces proches exige un worker capable de les afficher.
  if (prefs.nearbySits === true) {
    const reg = await registration();
    if (!reg) throw new Error('push_not_subscribed');
    await ensurePushWorkerCurrent(reg);
  }
  const result = await api<{ updated: boolean }>(userId, {
    action: 'preferences', subscription_id: localStorage.getItem(PUSH_ID_KEY),
    opt_in_messages: prefs.messages, opt_in_applications: prefs.applications,
    ...(typeof prefs.nearbySits === 'boolean' ? { opt_in_nearby_sits: prefs.nearbySits } : {}),
  });
  if (!result.updated) throw new Error('push_not_updated');
  if (typeof prefs.nearbySits === 'boolean') rememberNearby(userId, true, prefs.nearbySits);
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

type StatusRow = { id: string; enabled: boolean; opt_in_messages: boolean; opt_in_applications: boolean; opt_in_nearby_sits?: boolean };
export type PushDeviceStatus =
  | { kind: 'none' }
  | { kind: 'renewable'; subscriptionId: string }
  | { kind: 'needs_gesture'; prefs: PushPreferences };

function permissionState(): NotificationPermission | 'unsupported' {
  try { return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission; } catch { return 'unsupported'; }
}

/**
 * Lots 0 et 0b : état de l'abonnement de cet appareil. Sans identifiant
 * local du membre, aucun appel réseau.
 * - renewable : autorisation accordée, mais le serveur l'a désactivé ou le
 *   navigateur n'a plus d'abonnement ; se renouvelle sans rien demander.
 * - needs_gesture : même situation, autorisation retirée ou jamais donnée ;
 *   seul un geste du membre peut la rétablir.
 */
export async function pushDeviceStatus(userId: string): Promise<PushDeviceStatus> {
  let localId: string | null = null;
  try {
    localId = localStorage.getItem(PUSH_ID_KEY);
    if (!localId || localStorage.getItem(PUSH_OWNER_KEY) !== userId) return { kind: 'none' };
  } catch { return { kind: 'none' }; }
  let row: StatusRow | undefined;
  try {
    const result = await api<{ subscriptions: StatusRow[] }>(userId, { action: 'status' });
    row = result.subscriptions.find((item) => item.id === localId);
  } catch { return { kind: 'none' }; }
  if (!row) return { kind: 'none' };
  let browserHasSub = true;
  if (row.enabled) {
    try { browserHasSub = Boolean(await (await registration())?.pushManager.getSubscription()); } catch { browserHasSub = true; }
    if (browserHasSub) return { kind: 'none' };
  }
  if (permissionState() === 'granted') return { kind: 'renewable', subscriptionId: row.id };
  return { kind: 'needs_gesture', prefs: { messages: row.opt_in_messages ?? true, applications: row.opt_in_applications ?? true, nearbySits: row.opt_in_nearby_sits === true } };
}

export const SILENT_RENEW_SESSION_KEY = 'guardiens_push_silent_renew';

/**
 * Lot 0b : réabonnement silencieux, autorisation déjà accordée. Aucune
 * demande d'autorisation, aucun affichage. Préférences gardées côté serveur.
 */
export async function renewPushSilently(userId: string, subscriptionId: string): Promise<boolean> {
  if (permissionState() !== 'granted' || pushSupport() !== 'supported') return false;
  try {
    const config = await getPushConfig(userId);
    if (!config.enabled || !config.publicKey) return false;
    const reg = await bounded(navigator.serviceWorker.register('/push-sw.js', { scope: '/' }));
    await bounded(navigator.serviceWorker.ready);
    await ensurePushWorkerCurrent(reg);
    const sub = (await reg.pushManager.getSubscription())
      ?? await bounded(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodePublicKey(config.publicKey) }));
    const result = await api<{ renewed: boolean }>(userId, { action: 'renew', subscription_id: subscriptionId, ...sub.toJSON() });
    return result.renewed === true;
  } catch { return false; }
}

/**
 * Proposition d'activation du tableau de bord. Une désactivation explicite
 * (réglages) ou un « Plus tard » sont gardés par membre sur cet appareil :
 * la proposition ne revient jamais après une désactivation, et pas avant
 * 30 jours après un report.
 */
const OPT_OUT_KEY = 'guardiens_push_opted_out';
const OFFER_LATER_KEY = 'guardiens_push_offer_later';
export const PUSH_OFFER_LATER_MS = 30 * 24 * 60 * 60 * 1000;

function readMap(key: string): Record<string, number> {
  try { const v = JSON.parse(localStorage.getItem(key) ?? '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
function writeMap(key: string, userId: string, value: number | null): void {
  try {
    const map = readMap(key);
    if (value === null) delete map[userId]; else map[userId] = value;
    localStorage.setItem(key, JSON.stringify(map));
  } catch { /* stockage indisponible */ }
}
export const markPushOptOut = (userId: string) => writeMap(OPT_OUT_KEY, userId, Date.now());
export const clearPushOptOut = (userId: string) => { writeMap(OPT_OUT_KEY, userId, null); writeMap(OFFER_LATER_KEY, userId, null); };
export const postponePushOffer = (userId: string, now = Date.now()) => writeMap(OFFER_LATER_KEY, userId, now);

/** Proposition seulement si rien n'a jamais été décidé sur cet appareil. */
export function canOfferPush(userId: string, now = Date.now()): boolean {
  if (pushSupport() !== 'supported' || permissionState() !== 'default') return false;
  if (hasLocalPushSubscription(userId)) return false;
  if (readMap(OPT_OUT_KEY)[userId]) return false;
  const later = readMap(OFFER_LATER_KEY)[userId];
  return !(typeof later === 'number' && now - later < PUSH_OFFER_LATER_MS);
}
