/**
 * Mesure réelle de la vitesse chez les visiteurs (lot P2b).
 *
 * LCP, INP, CLS, FCP, TTFB et la plus longue tâche des 10 premières secondes
 * sont envoyés dans analytics_events (événement web_vital) par le même
 * circuit que les autres événements (trackEventBeacon), sans identifiant de
 * membre : chemin normalisé, type d'appareil, connecté ou visiteur, type de
 * connexion, identifiant du build. Aucune donnée personnelle.
 *
 * Règles :
 *  - échantillonnage par page vue : 100 % mobile et tablette, 25 % ordinateur ;
 *  - chaque métrique n'est envoyée qu'une fois par page vue, quand elle est
 *    finale (page masquée ou quittée). Les métriques prêtes au même moment
 *    partent dans une seule ligne, pour ménager le plafond d'insertions
 *    anonymes (120 par minute) partagé avec page_view et l'inscription ;
 *  - consentement : mêmes règles que page_view (mesure d'audience interne,
 *    sans cookie ni traceur tiers, exemptée). GA4 n'est jamais appelé ici ;
 *  - robots exclus.
 *
 * Lot P2c : envoi seulement depuis guardiens.fr (jamais la version d'essai,
 * lovable.app, lovableproject.com, localhost ni les tests), jamais pour une
 * page masquée au chargement ou de largeur illisible, jamais pour un robot
 * ou Prerender. La propriété host permet à la carte admin d'ignorer les
 * mesures anciennes ou parasites.
 *
 * Lot perf 1 (14/10/2026) : chemin regroupé par gabarit (/annonces/:id pour
 * une fiche lue par slug), chemin exact dans path_full, vue « hard » ou
 * « soft » (navigation interne) et identifiant de vue pv ; attribution du LCP
 * (élément, phases) et du CLS (plus grand décalage) ; jalons métier
 * FIRST_CARD, FIRST_CARD_PHOTO et SIT_HERO (perfMarks.ts), mesurés aussi en
 * navigation interne, avec « abandoned » quand la vue se termine avant le
 * jalon ; robots, navigateurs pilotés et ?perf_lab=1 exclus (labTraffic.ts).
 */
import { onCLS, onINP, onFCP, onLCP, onTTFB, type MetricWithAttribution } from "web-vitals/attribution";
import { currentPerfView, subscribePerfMarks, type Milestone, type PerfView } from "@/lib/perfMarks";
import { trackEventBeacon } from "@/lib/analytics";
import { BUILD_ID } from "@/lib/buildInfo";
import { isBotUserAgent } from "@/lib/cookieConsent";
import { isAutomatedBrowser, isPerfLabSession } from "@/lib/labTraffic";

/** Part des pages vues mesurées, par type d'appareil. */
export const WEB_VITAL_SAMPLE_RATE: Record<DeviceKind, number> = {
  mobile: 1,
  tablet: 1,
  desktop: 0.25,
};
/** Fenêtre d'observation de la plus longue tâche. */
export const LONG_TASK_WINDOW_MS = 10_000;

export type DeviceKind = "mobile" | "tablet" | "desktop";
export type VitalName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB" | "LONG_TASK";
export type MilestoneMetric = "FIRST_CARD" | "FIRST_CARD_PHOTO" | "SIT_HERO";

export function deviceKind(width: number): DeviceKind {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Gabarits dont le dernier segment est un identifiant ou un slug (lot perf 1) :
 * une fiche lue par slug compte avec les autres fiches. Les pages de liste
 * (/annonces/international, /petites-missions/creer) gardent leur nom.
 */
const TEMPLATE_PREFIXES = ["annonces", "sits", "gardiens", "house-sitting", "guides", "actualites", "petites-missions", "projets"];
const TEMPLATE_KEEP = new Set(["international", "demo", "creer", "nouvelle", "carte", "create", "new", "publier"]);

/** Pages dont le second segment est un jeton personnel, jamais recopié. */
const TOKEN_PREFIXES = new Set(["annonce-noel", "ma-ligne", "ma-periode", "unsubscribe", "desinscription", "reset-password", "invitation"]);

/** Chemin exact sans requête ni jeton, borné (champ path_full). */
export function exactVitalPath(pathname: string): string {
  const clean = ((pathname || "/").split(/[?#]/)[0] || "/");
  const segs = clean.split("/");
  const out = segs.map((seg, i) => {
    if (!seg) return seg;
    if (i === 2 && TOKEN_PREFIXES.has(segs[1])) return ":token";
    if (UUID.test(seg) || /^[0-9a-f]{16,}$/i.test(seg) || /^[A-Za-z0-9_-]{32,}$/.test(seg)) return ":id";
    return seg;
  });
  return out.join("/").slice(0, 160);
}

/** Chemin sans requête, identifiants (uuid, nombres, jetons, slugs de fiche) remplacés par :id. */
export function normalizeVitalPath(pathname: string): string {
  const clean = (pathname || "/").split(/[?#]/)[0];
  const segs = clean.split("/");
  if (segs.length === 3 && TEMPLATE_PREFIXES.includes(segs[1]) && segs[2] && !TEMPLATE_KEEP.has(segs[2])) {
    return `/${segs[1]}/:id`;
  }
  const parts = clean.split("/").map((seg) => {
    if (!seg) return seg;
    if (UUID.test(seg)) return ":id";
    if (/^\d+$/.test(seg)) return ":id";
    if (/^[0-9a-f]{16,}$/i.test(seg)) return ":id";
    return seg;
  });
  const out = parts.join("/").slice(0, 120);
  return out.length > 1 && out.endsWith("/") ? out.slice(0, -1) : out || "/";
}

export function roundVital(name: VitalName, value: number): number {
  return name === "CLS" ? Math.round(value * 1000) / 1000 : Math.round(value);
}

/** Seuils officiels pour la plus longue tâche (non fournie par web-vitals). */
export function longTaskRating(ms: number): "good" | "needs-improvement" | "poor" {
  if (ms <= 200) return "good";
  if (ms <= 500) return "needs-improvement";
  return "poor";
}

export interface VitalEntry { value: number; rating: string; attr?: Record<string, string | number> }

export interface CollectorEnv {
  width: number;
  pathname: string;
  /** window.location.hostname : rien n'est envoyé hors guardiens.fr. */
  host: string;
  connected: boolean;
  connection?: string | null;
  random?: () => number;
  send?: (metadata: Record<string, unknown>) => void;
  /** Identifiant de la vue d'arrivée, partagé avec les jalons. */
  pv?: string;
}

/**
 * Collecteur pur d'une page vue : échantillonnage décidé une fois,
 * `record` garde la dernière valeur, `flush` envoie ce qui ne l'a pas été.
 */
export function createVitalsCollector(env: CollectorEnv) {
  const device = deviceKind(env.width);
  const sampled = isPublicVitalHost(env.host) && env.width > 0
    && (env.random ?? Math.random)() < WEB_VITAL_SAMPLE_RATE[device];
  const pending = new Map<VitalName, VitalEntry>();
  const sent = new Set<VitalName>();
  const send = env.send ?? ((metadata) => { trackEventBeacon("web_vital", { source: "web_vitals", metadata, anonymous: true }); });
  const base = {
    host: WEB_VITAL_HOST,
    path: normalizeVitalPath(env.pathname),
    path_full: exactVitalPath(env.pathname),
    nav: "hard",
    pv: env.pv ?? null,
    device,
    auth: env.connected ? "member" : "visitor",
    connection: env.connection ?? null,
    build: BUILD_ID,
  };
  return {
    sampled,
    base,
    record(name: VitalName, value: number, rating: string, attr?: VitalEntry["attr"]) {
      if (!sampled || sent.has(name) || !Number.isFinite(value)) return;
      pending.set(name, attr ? { value: roundVital(name, value), rating, attr } : { value: roundVital(name, value), rating });
    },
    flush() {
      if (!sampled || pending.size === 0) return;
      const metrics: Record<string, VitalEntry> = {};
      for (const [k, v] of pending) { metrics[k] = v; sent.add(k); }
      pending.clear();
      send({ ...base, metrics });
    },
  };
}

/** Gabarit suivi par les jalons : liste d'annonces ou fiche d'annonce. */
export function milestoneTemplate(pathname: string): "list" | "fiche" | null {
  const path = exactVitalPath(pathname).replace(/\/$/, "") || "/";
  // /search sert aussi la recherche de gardiens (SearchOwner) : jalons envoyés
  // s'ils existent, jamais d'abandon compté.
  if (path === "/annonces") return "list";
  const segs = path.split("/");
  if (segs.length === 3 && segs[1] === "sits" && segs[2] && !TEMPLATE_KEEP.has(segs[2])) return "fiche";
  if (segs.length === 3 && segs[1] === "annonces" && segs[2] && !TEMPLATE_KEEP.has(segs[2])) return "fiche";
  return null;
}

/** Seuils des jalons, alignés sur ceux du LCP (2,5 s et 4 s). */
export function milestoneRating(ms: number): "good" | "needs-improvement" | "poor" {
  if (ms <= 2500) return "good";
  if (ms <= 4000) return "needs-improvement";
  return "poor";
}

const PRIMARY: Record<"list" | "fiche", MilestoneMetric> = { list: "FIRST_CARD", fiche: "SIT_HERO" };
const EXPECTED: Record<"list" | "fiche", MilestoneMetric[]> = { list: ["FIRST_CARD", "FIRST_CARD_PHOTO"], fiche: ["SIT_HERO"] };

export interface MilestoneReporterEnv {
  sampled: boolean;
  /** Champs communs de la ligne (host, device, auth, connection, build). */
  base: Record<string, unknown>;
  send: (metadata: Record<string, unknown>) => void;
  /** Identifiant de la vue d'arrivée (celui de la ligne LCP). */
  hardPv: string;
  newPv?: () => string;
}

/**
 * Une ligne par vue d'un gabarit suivi : jalons atteints, ou jalon principal
 * marqué « abandoned » avec le temps écoulé quand la vue se termine avant.
 * Pure, testée (src/__tests__/perf1/).
 */
export function createMilestoneReporter(env: MilestoneReporterEnv) {
  type State = { view: PerfView; pv: string; metrics: Record<string, VitalEntry>; extra: Record<string, unknown>; sent: boolean; skip?: string };
  const views = new Map<number, State>();
  const done = new Set<number>();
  let current: PerfView | null = null;
  const newPv = env.newPv ?? randomPv;
  const stateOf = (view: PerfView): State => {
    let st = views.get(view.seq);
    if (!st) {
      st = { view, pv: view.seq === 0 ? env.hardPv : newPv(), metrics: {}, extra: {}, sent: done.has(view.seq) };
      views.set(view.seq, st);
    }
    // Une redirection prolonge la vue sous une nouvelle adresse.
    if (view.path !== st.view.path) st.view = view;
    if (!current || view.seq >= current.seq) current = view;
    return st;
  };
  const close = (st: State) => {
    st.sent = true;
    done.add(st.view.seq);
    views.delete(st.view.seq);
  };
  const flushState = (st: State, endedAt: number | null) => {
    if (st.sent || !env.sampled) return;
    const template = milestoneTemplate(st.view.path);
    if (!template && Object.keys(st.metrics).length === 0) { if (endedAt !== null) close(st); return; }
    if (st.skip && Object.keys(st.metrics).length === 0) { if (endedAt !== null) close(st); return; }
    let abandoned = false;
    if (template && endedAt !== null && !st.skip && !st.metrics[PRIMARY[template]]) {
      st.metrics[PRIMARY[template]] = { value: Math.max(0, Math.round(endedAt - st.view.start)), rating: "abandoned" };
      abandoned = true;
    }
    if (Object.keys(st.metrics).length === 0) return;
    close(st);
    env.send({
      ...env.base,
      ...st.extra,
      path: normalizeVitalPath(st.view.path),
      path_full: exactVitalPath(st.view.path),
      nav: st.view.nav,
      pv: st.pv,
      ...(abandoned ? { abandoned: true } : {}),
      metrics: st.metrics,
    });
  };
  return {
    onMilestone(m: Milestone) {
      const st = stateOf(m.view);
      if (st.sent) return;
      const value = Math.round(m.value);
      st.metrics[m.name] = { value, rating: milestoneRating(value) };
      if (m.extra) Object.assign(st.extra, m.extra);
      const template = milestoneTemplate(m.view.path);
      if (template && EXPECTED[template].every((k) => st.metrics[k])) flushState(st, null);
    },
    onViewEnd(view: PerfView, endedAt: number) {
      flushState(stateOf(view), endedAt);
    },
    onSkip(view: PerfView, reason: string) {
      const st = stateOf(view);
      if (!st.sent) st.skip = reason;
    },
    /**
     * Page masquée (final faux) : la vue part seulement si son jalon principal
     * est là, sinon elle attend (le visiteur peut revenir). Page quittée
     * (final vrai) : la vue part, abandonnée si besoin.
     */
    flushCurrent(endedAt: number, view?: PerfView, final = true) {
      const v = view ?? current;
      if (!v) return;
      const st = stateOf(v);
      const template = milestoneTemplate(st.view.path);
      if (!final && template && !st.metrics[PRIMARY[template]]) return;
      flushState(st, final ? endedAt : null);
    },
  };
}

function randomPv(): string {
  try {
    const b = new Uint8Array(8);
    crypto.getRandomValues(b);
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(16).slice(2, 18);
  }
}

const shortSelector = (s: unknown) => (typeof s === "string" ? s.slice(0, 120) : undefined);

/** Attribution réduite : élément et phases du LCP, cible du plus grand décalage. Sans URL ni jeton. */
export function vitalAttribution(m: MetricWithAttribution): VitalEntry["attr"] | undefined {
  const a = (m as unknown as { attribution?: Record<string, unknown> }).attribution;
  if (!a) return undefined;
  if (m.name === "LCP") {
    const out: Record<string, string | number> = {};
    const target = shortSelector(a.target);
    if (target) out.target = target;
    for (const [k, key] of [["timeToFirstByte", "ttfb"], ["resourceLoadDelay", "load_delay"], ["resourceLoadDuration", "load_time"], ["elementRenderDelay", "render_delay"]] as const) {
      const v = a[k];
      if (typeof v === "number" && Number.isFinite(v)) out[key] = Math.round(v);
    }
    return out;
  }
  if (m.name === "CLS") {
    const target = shortSelector(a.largestShiftTarget);
    return target ? { target } : undefined;
  }
  if (m.name === "INP") {
    const target = shortSelector(a.interactionTarget);
    return target ? { target } : undefined;
  }
  return undefined;
}

function connectionType(): string | null {
  const c = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return c?.effectiveType ?? null;
}

function hasSessionToken(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) return true;
    }
  } catch { /* stockage indisponible */ }
  return false;
}

/** Seuls domaines autorisés à envoyer une mesure (lot P2c). */
export const WEB_VITAL_HOSTS = ["guardiens.fr", "www.guardiens.fr"] as const;
/** Valeur de host écrite dans les mesures, lue par la carte admin. */
export const WEB_VITAL_HOST = "guardiens.fr";

export function isPublicVitalHost(hostname: string | null | undefined): boolean {
  return (WEB_VITAL_HOSTS as readonly string[]).includes((hostname ?? "").toLowerCase());
}

const VITAL_BOT_UA = /prerender|bot|crawler|spider|headlesschrome/i;

export interface VitalGateInput {
  hostname: string;
  userAgent: string;
  width: number;
  visibility: string;
  painted: boolean;
  mode: string;
  /** Navigateur piloté (navigator.webdriver) ou mesure marquée ?perf_lab=1. */
  lab?: boolean;
}

/** Décide si cette page vue peut envoyer des mesures. Pure, testée. */
export function shouldReportVitals(g: VitalGateInput): boolean {
  if (g.mode === "test") return false;
  if (g.lab) return false;
  if (!isPublicVitalHost(g.hostname)) return false;
  if (VITAL_BOT_UA.test(g.userAgent || "")) return false;
  if (!Number.isFinite(g.width) || g.width <= 0) return false;
  if (g.visibility !== "visible") return false;
  if (!g.painted) return false;
  return true;
}

/** Vrai si la page a déjà peint (une page restée masquée ne peint pas). */
function hasPainted(): boolean {
  try {
    const p = performance.getEntriesByType("paint");
    return p.length > 0;
  } catch { return false; }
}

let started = false;

/** Démarre la mesure une fois par document. `onPerfEntry` : rappel de test ou de débogage. */
const reportWebVitals = (onPerfEntry?: (metric: MetricWithAttribution) => void) => {
  if (typeof window === "undefined" || started) return;
  started = true;
  if (isBotUserAgent()) return;
  if (!shouldReportVitals({
    hostname: window.location.hostname,
    userAgent: navigator.userAgent,
    width: window.innerWidth,
    visibility: document.visibilityState,
    painted: hasPainted(),
    mode: import.meta.env.MODE,
    lab: isAutomatedBrowser() || isPerfLabSession(),
  })) return;

  const hardPv = randomPv();
  const collector = createVitalsCollector({
    width: window.innerWidth,
    pathname: window.location.pathname,
    host: window.location.hostname,
    connected: hasSessionToken(),
    connection: connectionType(),
    pv: hardPv,
  });
  if (!collector.sampled && !onPerfEntry) return;

  // Lot perf 1 : jalons métier, page d'arrivée et navigations internes.
  const { path: _p, path_full: _pf, nav: _n, pv: _pv, ...milestoneBase } = collector.base;
  const milestones = createMilestoneReporter({
    sampled: collector.sampled,
    base: milestoneBase,
    hardPv,
    send: (metadata) => { trackEventBeacon("web_vital", { source: "web_vitals", metadata, anonymous: true }); },
  });
  subscribePerfMarks({
    onMilestone: (m) => milestones.onMilestone(m),
    onViewEnd: (v, at) => milestones.onViewEnd(v, at),
    onSkip: (v, reason) => milestones.onSkip(v, reason),
  });

  // Plus longue tâche des 10 premières secondes (entrées tamponnées depuis le début).
  try {
    let longest = 0;
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.startTime <= LONG_TASK_WINDOW_MS && e.duration > longest) longest = e.duration;
      }
      if (longest > 0) collector.record("LONG_TASK", longest, longTaskRating(longest));
    });
    po.observe({ type: "longtask", buffered: true });
    window.setTimeout(() => po.disconnect(), LONG_TASK_WINDOW_MS);
  } catch { /* longtask non pris en charge (Safari, Firefox) */ }

  const flush = (final: boolean) => {
    collector.flush();
    milestones.flushCurrent(performance.now(), currentPerfView(), final);
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(false); });
  window.addEventListener("pagehide", () => flush(true));

  const handler = (m: MetricWithAttribution) => {
    collector.record(m.name as VitalName, m.value, m.rating, vitalAttribution(m));
    onPerfEntry?.(m);
  };
  try {
    onCLS(handler);
    onINP(handler);
    onFCP(handler);
    onLCP(handler);
    onTTFB(handler);
  } catch { /* navigateur sans API de performance */ }
};

export default reportWebVitals;
