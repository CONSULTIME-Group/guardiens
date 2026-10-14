/**
 * Lot perf 1 (14/10/2026) : jalons métier de vitesse, mesurés chez les vrais
 * visiteurs (audit de performance en arène du 14/10/2026).
 *
 * Le LCP retient le titre ou un squelette peint avant les annonces et ne voit
 * que la page d'arrivée. Ces jalons mesurent ce que le visiteur attend :
 *  - FIRST_CARD : première carte d'annonce affichée (liste /annonces, /search) ;
 *  - FIRST_CARD_PHOTO : photo de la première carte chargée ;
 *  - SIT_HERO : contenu d'une fiche d'annonce affiché.
 * Le chrono part de la navigation du document (vue « hard ») ou du changement
 * de route (vue « soft », navigation interne).
 *
 * Module minuscule et sans dépendance : il peut être appelé par une carte
 * avant que le collecteur (webVitals.ts, monté après le premier affichage)
 * soit prêt ; les jalons sont gardés puis rejoués à l'abonnement.
 */
export type MilestoneName = "FIRST_CARD" | "FIRST_CARD_PHOTO" | "SIT_HERO";
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
}

type Listener = {
  onMilestone: (m: Milestone) => void;
  onViewEnd: (view: PerfView, endedAt: number) => void;
};

const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
const initialPath = () => (typeof window !== "undefined" ? window.location.pathname : "/");

let view: PerfView = { seq: 0, nav: "hard", path: initialPath(), start: 0 };
let marked = new Set<MilestoneName>();
const buffer: Milestone[] = [];
let listener: Listener | null = null;

/** Vue courante (copie). */
export function currentPerfView(): PerfView {
  return { ...view };
}

/**
 * Changement de route. Même chemin : rien. Sinon la vue courante se termine
 * et une vue « soft » commence maintenant.
 */
export function markNavigation(path: string, at: number = now()): void {
  if (!path || path === view.path) return;
  listener?.onViewEnd({ ...view }, at);
  view = { seq: view.seq + 1, nav: "soft", path, start: at };
  marked = new Set();
}

/** Jalon atteint dans la vue courante ; le premier de chaque nom compte seul. */
export function markMilestone(
  name: MilestoneName,
  extra?: Milestone["extra"],
  at: number = now(),
): void {
  if (marked.has(name)) return;
  marked.add(name);
  const m: Milestone = { name, value: Math.max(0, at - view.start), view: { ...view }, extra };
  if (listener) listener.onMilestone(m);
  else if (buffer.length < 20) buffer.push(m);
}

/** Abonnement du collecteur : rejoue les jalons déjà atteints. */
export function subscribePerfMarks(l: Listener): () => void {
  listener = l;
  while (buffer.length) l.onMilestone(buffer.shift()!);
  return () => { if (listener === l) listener = null; };
}

/** Réservé aux tests. */
export function __resetPerfMarks(path = "/"): void {
  view = { seq: 0, nav: "hard", path, start: 0 };
  marked = new Set();
  buffer.length = 0;
  listener = null;
}
