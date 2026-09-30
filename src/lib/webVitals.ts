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
 */
import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from "web-vitals";
import { trackEventBeacon } from "@/lib/analytics";
import { BUILD_ID } from "@/lib/buildInfo";
import { isBotUserAgent } from "@/lib/cookieConsent";

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

export function deviceKind(width: number): DeviceKind {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Chemin sans requête, identifiants (uuid, nombres, jetons) remplacés par :id. */
export function normalizeVitalPath(pathname: string): string {
  const clean = (pathname || "/").split(/[?#]/)[0];
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

export interface VitalEntry { value: number; rating: string }

export interface CollectorEnv {
  width: number;
  pathname: string;
  /** window.location.hostname : rien n'est envoyé hors guardiens.fr. */
  host: string;
  connected: boolean;
  connection?: string | null;
  random?: () => number;
  send?: (metadata: Record<string, unknown>) => void;
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
    device,
    auth: env.connected ? "member" : "visitor",
    connection: env.connection ?? null,
    build: BUILD_ID,
  };
  return {
    sampled,
    record(name: VitalName, value: number, rating: string) {
      if (!sampled || sent.has(name) || !Number.isFinite(value)) return;
      pending.set(name, { value: roundVital(name, value), rating });
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
}

/** Décide si cette page vue peut envoyer des mesures. Pure, testée. */
export function shouldReportVitals(g: VitalGateInput): boolean {
  if (g.mode === "test") return false;
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
const reportWebVitals = (onPerfEntry?: (metric: Metric) => void) => {
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
  })) return;

  const collector = createVitalsCollector({
    width: window.innerWidth,
    pathname: window.location.pathname,
    host: window.location.hostname,
    connected: hasSessionToken(),
    connection: connectionType(),
  });
  if (!collector.sampled && !onPerfEntry) return;

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

  const flush = () => collector.flush();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("pagehide", flush);

  const handler = (m: Metric) => {
    collector.record(m.name as VitalName, m.value, m.rating);
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
