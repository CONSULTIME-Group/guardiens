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
/** Adresse enregistrée pour cet appareil : un écart signale une adresse renouvelée par le navigateur. */
export const PUSH_ENDPOINT_KEY = 'guardiens_push_endpoint';
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
  if (error || !data || data.error) throw Object.assign(new Error('push_request_failed'), { code: await refusalCode(error, data) });
  const current = await bounded(supabase.auth.getSession());
  if (current.data.session?.user.id !== userId) throw new Error('push_session_changed');
  return data as T;
}

/** Code de refus renvoyé par push-subscription (ex. endpoint_unavailable, max_active_endpoints). */
async function refusalCode(error: unknown, data: unknown): Promise<string | undefined> {
  const fromData = (data as { code?: unknown } | null)?.code;
  if (typeof fromData === 'string') return fromData;
  try {
    const context = (error as { context?: Response } | null)?.context;
    const body = context && typeof context.clone === 'function' ? await context.clone().json() : null;
    return typeof body?.code === 'string' ? body.code : undefined;
  } catch { return undefined; }
}
const codeOf = (error: unknown) => (error as { code?: string } | null)?.code;

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
  const owner = localStorage.getItem(PUSH_OWNER_KEY);
  // Lot N1 : sans propriétaire mémorisé (stockage effacé), l'abonnement est
  // gardé ; repairPushDevice le rattache. Seul un autre compte le retire.
  if (!owner) return off;
  if (owner !== userId) {
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
  // Lot N1 : une activation repart toujours d'une adresse neuve. Une adresse
  // déjà présente peut être morte (410) ou liée à une autre clé : la réutiliser
  // la ferait désactiver au premier envoi.
  const previousId = localStorage.getItem(PUSH_OWNER_KEY) === userId ? localStorage.getItem(PUSH_ID_KEY) : null;
  const existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe().catch(() => false);
  const sub = await bounded(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }));
  try {
    // L'ancienne ligne de cet appareil part d'abord : elle compte dans le plafond de 5 appareils actifs.
    if (previousId) await api(userId, { action: 'unsubscribe', subscription_id: previousId }).catch(() => undefined);
    const result = await api<{ subscription_id: string; nearby_requested?: boolean; nearby_saved?: boolean }>(userId, {
      action: 'subscribe', ...sub.toJSON(), opt_in_messages: prefs.messages, opt_in_applications: prefs.applications,
      opt_in_nearby_sits: prefs.nearbySits === true,
    });
    localStorage.setItem(PUSH_OWNER_KEY, userId);
    localStorage.setItem(PUSH_ID_KEY, result.subscription_id);
    localStorage.setItem(PUSH_ENDPOINT_KEY, sub.endpoint);
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
    localStorage.removeItem(PUSH_ENDPOINT_KEY);
  }
}

// Called before explicit logout while the session is still valid. A broken push
// service must not trap the member in a signed-in session.
export async function cleanupPushOnLogout(userId?: string): Promise<void> {
  try { await bounded(disablePush(userId)); } catch { /* Browser revocation remains available. */ }
}

/**
 * Lot N1 : seul un changement de compte nettoie l'appareil. Sans compte
 * (session perdue), l'abonnement reste intact et sera retrouvé à la
 * reconnexion ; la déconnexion volontaire passe par cleanupPushOnLogout.
 */
export function reconcilePushSession(userId?: string): void {
  try {
    const owner = localStorage.getItem(PUSH_OWNER_KEY);
    if (userId && owner && owner !== userId) setTimeout(() => { void cleanupPushOnLogout(); }, 0);
  } catch { /* Unavailable storage means no persisted device owner. */ }
}

type StatusRow = { id: string; enabled: boolean; opt_in_messages: boolean; opt_in_applications: boolean; opt_in_nearby_sits?: boolean };

function permissionState(): NotificationPermission | 'unsupported' {
  try { return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission; } catch { return 'unsupported'; }
}

const DEFAULT_PREFS: PushPreferences = { messages: true, applications: true, nearbySits: false };
const prefsOf = (row: StatusRow): PushPreferences => ({
  messages: row.opt_in_messages ?? true,
  applications: row.opt_in_applications ?? true,
  nearbySits: row.opt_in_nearby_sits === true,
});

function readLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function rememberDevice(userId: string, subscriptionId: string, endpoint: string): void {
  try {
    localStorage.setItem(PUSH_OWNER_KEY, userId);
    localStorage.setItem(PUSH_ID_KEY, subscriptionId);
    localStorage.setItem(PUSH_ENDPOINT_KEY, endpoint);
  } catch { /* stockage indisponible : l'appareil sera réparé à la prochaine visite */ }
}

function safeKey(publicKey: string | undefined): Uint8Array<ArrayBuffer> | null {
  if (!publicKey) return null;
  try { return decodePublicKey(publicKey); } catch { return null; }
}

/** Faux seulement quand la clé de l'abonnement est connue et diffère de celle du serveur. */
export function subscriptionMatchesKey(sub: PushSubscription, key: Uint8Array): boolean {
  const raw = (sub as PushSubscription & { options?: { applicationServerKey?: ArrayBuffer | null } }).options?.applicationServerKey;
  if (!raw) return true;
  const bytes = new Uint8Array(raw);
  return bytes.length === key.length && bytes.every((value, index) => value === key[index]);
}

export type PushRepair =
  | { kind: 'none' }
  | { kind: 'ok' }
  | { kind: 'repaired' }
  | { kind: 'failed' }
  | { kind: 'needs_gesture'; prefs: PushPreferences };

export const PUSH_REPAIR_SESSION_KEY = 'guardiens_push_repair';

/**
 * Lot N1 : remet en état l'abonnement de cet appareil, sans rien demander
 * quand l'autorisation est accordée. Couvre les quatre pannes constatées le
 * 11/10/2026 :
 * - stockage local effacé : l'abonnement du navigateur est rattaché au
 *   membre connecté (jamais après une désactivation volontaire) ;
 * - adresse morte (désactivée en 404, 410 ou 403) ou disparue du navigateur :
 *   nouvelle adresse créée, ancienne ligne supprimée ;
 * - nouvelle adresse donnée par le navigateur (pushsubscriptionchange) :
 *   transmise au serveur ;
 * - clé du serveur différente de celle de l'abonnement : nouvel abonnement.
 * needs_gesture : autorisation retirée ou jamais donnée, seul un geste du
 * membre peut la rétablir.
 */
export function repairPushDevice(userId: string): Promise<PushRepair> {
  // Une seule réparation à la fois (onglets, message du worker, nouvel essai) :
  // deux réparations simultanées s'annuleraient leurs adresses.
  const pending = repairInFlight.get(userId);
  if (pending) return pending;
  const run = (async () => {
    const locks = typeof navigator !== 'undefined'
      ? (navigator as Navigator & { locks?: { request: <T>(name: string, cb: () => Promise<T>) => Promise<T> } }).locks
      : undefined;
    return locks?.request ? locks.request('guardiens-push-repair', () => repairOnce(userId)) : repairOnce(userId);
  })().catch((): PushRepair => ({ kind: 'failed' })).finally(() => repairInFlight.delete(userId));
  repairInFlight.set(userId, run);
  return run;
}
const repairInFlight = new Map<string, Promise<PushRepair>>();

async function repairOnce(userId: string): Promise<PushRepair> {
  const owner = readLocal(PUSH_OWNER_KEY);
  if (owner && owner !== userId) return { kind: 'none' };
  // Sans aucun abonnement connu, rien à réparer : aucun appel réseau.
  if (!owner && pushSupport() !== 'supported') return { kind: 'none' };
  let reg = await registration().catch(() => undefined);
  const sub: PushSubscription | null = reg
    ? await bounded<PushSubscription | null>(reg.pushManager.getSubscription()).catch((): null => null)
    : null;
  const granted = permissionState() === 'granted';

  if (!owner) {
    if (!reg || !sub || !granted || readMap(OPT_OUT_KEY)[userId]) return { kind: 'none' };
    return attachDevice(userId, sub, DEFAULT_PREFS, null);
  }

  const localId = readLocal(PUSH_ID_KEY);
  const storedEndpoint = readLocal(PUSH_ENDPOINT_KEY);
  let rows: StatusRow[];
  try { rows = (await api<{ subscriptions: StatusRow[] }>(userId, { action: 'status' })).subscriptions ?? []; }
  catch { return { kind: 'none' }; }
  const row = rows.find((item) => item.id === localId);
  const prefs = row ? prefsOf(row) : DEFAULT_PREFS;
  let key: Uint8Array<ArrayBuffer> | null = null;
  try {
    const config = await getPushConfig(userId);
    key = config.enabled ? safeKey(config.publicKey) : null;
  } catch { key = null; }

  const keyOk = Boolean(sub && (!key || subscriptionMatchesKey(sub, key)));
  if (row?.enabled && sub && keyOk) {
    if (storedEndpoint === sub.endpoint) return { kind: 'ok' };
    // Appareil inscrit avant N1 (adresse non mémorisée) ou adresse renouvelée
    // par le navigateur : l'adresse actuelle est transmise, sans réabonnement.
    return attachDevice(userId, sub, prefs, row.id);
  }
  if (!granted) return row ? { kind: 'needs_gesture', prefs } : { kind: 'none' };
  if (!key || pushSupport() !== 'supported') return { kind: 'failed' };
  try {
    if (!reg) {
      // Worker perdu alors que l'autorisation reste accordée : réinstallé.
      reg = await bounded(navigator.serviceWorker.register('/push-sw.js', { scope: '/' }));
      await bounded(navigator.serviceWorker.ready);
    }
    // Worker confirmé avant de toucher à l'abonnement existant.
    await ensurePushWorkerCurrent(reg);
    if (sub) await bounded(sub.unsubscribe()).catch(() => false);
    const fresh = await bounded(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
    return attachDevice(userId, fresh, prefs, row?.id ?? localId);
  } catch { return { kind: 'failed' }; }
}

/**
 * Enregistre l'adresse pour le membre. L'ancienne ligne de cet appareil est
 * retirée d'abord quand l'adresse change : elle compte dans le plafond de
 * 5 appareils actifs.
 */
async function attachDevice(userId: string, sub: PushSubscription, prefs: PushPreferences, previousId: string | null): Promise<PushRepair> {
  // Adresse connue et différente : l'ancienne ligne est obsolète. Adresse
  // inconnue (appareil inscrit avant N1) : rien n'est retiré avant la réponse.
  const stored = readLocal(PUSH_ENDPOINT_KEY);
  const changed = Boolean(previousId && stored && stored !== sub.endpoint);
  if (changed && previousId) await api(userId, { action: 'unsubscribe', subscription_id: previousId }).catch(() => undefined);
  try {
    const result = await api<{ subscription_id: string }>(userId, {
      action: 'subscribe', ...sub.toJSON(), opt_in_messages: prefs.messages, opt_in_applications: prefs.applications,
      opt_in_nearby_sits: prefs.nearbySits === true,
    });
    if (!result.subscription_id) return { kind: 'failed' };
    const wasKnown = readLocal(PUSH_ID_KEY) === result.subscription_id && readLocal(PUSH_ENDPOINT_KEY) === sub.endpoint;
    rememberDevice(userId, result.subscription_id, sub.endpoint);
    if (previousId && previousId !== result.subscription_id && !changed) {
      await api(userId, { action: 'unsubscribe', subscription_id: previousId }).catch(() => undefined);
    }
    return { kind: wasKnown ? 'ok' : 'repaired' };
  } catch (error) {
    // Adresse rattachée à un autre compte : ce navigateur ne doit plus recevoir ses notifications.
    if (codeOf(error) === 'endpoint_unavailable') await bounded(sub.unsubscribe()).catch(() => false);
    return { kind: 'failed' };
  }
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
