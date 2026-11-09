/**
 * Lot perf 1 (14/10/2026) : jalons métier de vitesse, mesurés chez les vrais
 * visiteurs (audit de performance en arène du 14/10/2026).
 *
 * Le LCP retient le titre ou un squelette peint avant les annonces et ne voit
 * que la page d'arrivée. Ces jalons mesurent ce que le visiteur attend :
 *  - FIRST_CARD : première carte d'annonce affichée (liste /annonces, /search) ;
 *  - FIRST_CARD_PHOTO : photo de la première carte chargée ;
 *  - SIT_HERO : contenu d'une fiche d'annonce affiché.
 * Lot perf 19 (09/11/2026) :
 *  - FIRST_RESULT : fin de la première recherche de la vue (attr outcome
 *    « cards » ou « empty ») ;
 *  - GESTURE_CARD : temps entre un geste du membre (élargir, changer de lieu,
 *    de rayon, de filtres) et la première carte de la recherche qu'il lance.
 * Après une première issue vide, FIRST_CARD et FIRST_CARD_PHOTO sont tenus
 * pour atteints : une carte arrivée après un geste n'est jamais comptée comme
 * première annonce (elle compterait le temps de réflexion du membre).
 * Le chrono part de la navigation du document (vue « hard ») ou du changement
 * de route (vue « soft », navigation interne).
 *
 * Module minuscule et sans dépendance : il peut être appelé par une carte
 * avant que le collecteur (webVitals.ts, monté après le premier affichage)
 * soit prêt ; les jalons sont gardés puis rejoués à l'abonnement.
 */
export type MilestoneName = "FIRST_CARD" | "FIRST_CARD_PHOTO" | "SIT_HERO" | "FIRST_RESULT" | "GESTURE_CARD";
export type NavKind = "hard" | "soft";

export interface PerfView {
  /** Numéro de vue dans le document, 0 pour la page d'arrivée. */
  seq: number;
  nav: NavKind;
  path: string;
  /** performance.now() au début de la vue (0 pour la page d'arrivée). */
  start: number;
}

export interface Milestone {
  name: MilestoneName;
  /** Millisecondes depuis le début de la vue. */
  value: number;
  view: PerfView;
  extra?: Record<string, string | number | boolean | null>;
  /** Lot perf 19 : détail propre au jalon (metrics.<nom>.attr). */
  attr?: Record<string, string | number>;
}

/** Lot perf 19 : champs de la ligne de la vue, tenus à jour jusqu'à l'envoi. */
export type ViewExtra = Record<string, string | number | boolean | null>;

type Listener = {
  onMilestone: (m: Milestone) => void;
  onViewEnd: (view: PerfView, endedAt: number) => void;
  onSkip?: (view: PerfView, reason: string) => void;
  onExtra?: (view: PerfView, extra: ViewExtra) => void;
};

const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
const currentPath = () => (typeof window !== "undefined" ? window.location.pathname : "/");

/** Chemin d'arrivée du document, même si ce module se charge après une navigation interne. */
const initialPath = () => {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav?.name) return new URL(nav.name).pathname;
  } catch { /* API absente */ }
  return currentPath();
};

/**
 * Moment réel d'un changement d'adresse : le routeur met l'écran à jour dans
 * une transition, après le chargement du fichier de la route ; l'adresse,
 * elle, change tout de suite (pushState, popstate). Gardé par chemin.
 */
const urlChangedAt = new Map<string, { at: number; replace: boolean }>();
function rememberUrlChange(url: string | URL | null | undefined, replace = false) {
  try {
    if (url == null) return;
    const path = new URL(String(url), window.location.href).pathname;
    urlChangedAt.set(path, { at: now(), replace });
    if (urlChangedAt.size > 20) urlChangedAt.delete(urlChangedAt.keys().next().value as string);
  } catch { /* adresse illisible */ }
}
if (typeof window !== "undefined" && typeof history !== "undefined") {
  try {
    const wrap = (name: "pushState" | "replaceState") => {
      const original = history[name].bind(history);
      history[name] = ((data: unknown, unused: string, url?: string | URL | null) => {
        rememberUrlChange(url, name === "replaceState");
        return original(data, unused, url);
      }) as History[typeof name];
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", () => rememberUrlChange(window.location.href));
  } catch { /* historique non modifiable */ }
}

let view: PerfView = { seq: 0, nav: "hard", path: initialPath(), start: 0 };
let marked = new Set<MilestoneName>();
const buffer: Milestone[] = [];
const skipped = new Map<number, string>();
const pendingExtra = new Map<number, ViewExtra>();
let listener: Listener | null = null;

/** Vue courante (copie). */
export function currentPerfView(): PerfView {
  return { ...view };
}

/**
 * Changement de route. Même chemin : rien. Une redirection (replaceState,
 * par exemple identifiant vers slug) prolonge la vue courante. Sinon la vue
 * courante se termine et une vue « soft » commence au changement d'adresse.
 */
export function markNavigation(path: string, at?: number): void {
  if (!path || path === view.path) return;
  const change = urlChangedAt.get(path);
  urlChangedAt.delete(path);
  const t = now();
  const fresh = change !== undefined && t - change.at < 30_000 && change.at >= view.start;
  if (at === undefined && fresh && change.replace) {
    view = { ...view, path };
    return;
  }
  const start = at ?? (fresh ? change.at : t);
  listener?.onViewEnd({ ...view }, start);
  view = { seq: view.seq + 1, nav: "soft", path, start };
  marked = new Set();
}

/** L'adresse a changé avant que le routeur l'annonce : on suit l'adresse. */
function syncWithUrl() {
  if (typeof window === "undefined") return;
  const cur = currentPath();
  if (cur !== view.path && urlChangedAt.has(cur)) markNavigation(cur);
}

/** Lot perf 15 : temps écoulé depuis le début de la vue, en ms entières. */
export function perfViewElapsed(): number {
  syncWithUrl();
  return Math.max(0, Math.round(now() - view.start));
}

/**
 * Jalon atteint dans la vue courante ; le premier de chaque nom compte seul.
 * `detail.since` (lot perf 19) : origine du chrono à la place du début de la
 * vue (moment du geste pour GESTURE_CARD) ; `detail.attr` : détail du jalon.
 */
export function markMilestone(
  name: MilestoneName,
  extra?: Milestone["extra"],
  at: number = now(),
  detail?: { since?: number; attr?: Milestone["attr"] },
): void {
  syncWithUrl();
  if (marked.has(name)) return;
  marked.add(name);
  const from = detail?.since ?? view.start;
  const m: Milestone = { name, value: Math.max(0, at - from), view: { ...view }, extra };
  if (detail?.attr) m.attr = detail.attr;
  if (listener) listener.onMilestone(m);
  else if (buffer.length < 20) buffer.push(m);
}

/**
 * La vue a répondu sans jalon à mesurer (liste vide, erreur, autre onglet,
 * recherche de gardiens) : elle ne compte pas comme un abandon.
 */
export function skipMilestones(reason: string): void {
  syncWithUrl();
  if (marked.has("FIRST_CARD") || marked.has("SIT_HERO")) return;
  // Lot perf 19 : la première issue de la vue est tombée sans carte ; une
  // carte tardive (après un geste) n'est plus une première annonce.
  marked.add("FIRST_CARD");
  marked.add("FIRST_CARD_PHOTO");
  const v = { ...view };
  if (listener) listener.onSkip?.(v, reason);
  else skipped.set(v.seq, reason);
}

/**
 * Lot perf 19 : champs de la ligne de la vue courante (motifs des recherches,
 * recherches évitées, geste), fusionnés jusqu'à l'envoi de la ligne.
 */
export function setViewExtra(extra: ViewExtra): void {
  syncWithUrl();
  if (listener?.onExtra) { listener.onExtra({ ...view }, extra); return; }
  pendingExtra.set(view.seq, { ...(pendingExtra.get(view.seq) ?? {}), ...extra });
}

/** Abonnement du collecteur : rejoue les jalons déjà atteints. */
export function subscribePerfMarks(l: Listener): () => void {
  listener = l;
  for (const [seq, extra] of pendingExtra) if (seq === view.seq) l.onExtra?.({ ...view }, extra);
  pendingExtra.clear();
  while (buffer.length) l.onMilestone(buffer.shift()!);
  for (const [seq, reason] of skipped) l.onSkip?.({ ...view, seq }, reason);
  skipped.clear();
  return () => { if (listener === l) listener = null; };
}

/** Réservé aux tests. */
export function __resetPerfMarks(path = "/"): void {
  view = { seq: 0, nav: "hard", path, start: 0 };
  marked = new Set();
  buffer.length = 0;
  skipped.clear();
  pendingExtra.clear();
  urlChangedAt.clear();
  listener = null;
}
