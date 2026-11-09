/**
 * Lot P2b : agrégat de la carte admin « Vitesse ressentie ».
 * Entrée : lignes analytics_events de type web_vital (metadata envoyée par
 * src/lib/webVitals.ts). Sortie : 75e centile de LCP, INP et plus longue
 * tâche par type d'appareil, pour les chemins les plus mesurés.
 */
/** Seules les mesures du site public comptent (lot P2c). */
export const SUMMARY_HOST = "guardiens.fr";

export type SummaryDevice = "mobile" | "tablet" | "desktop";
export const SUMMARY_METRICS = ["LCP", "INP", "LONG_TASK", "CONTENT", "GESTURE"] as const;
/**
 * Lot perf 1 : CONTENT = première annonce affichée (FIRST_CARD sur une liste,
 * SIT_HERO sur une fiche), vues abandonnées exclues du centile.
 * Lot perf 19 : GESTURE = carte après un geste du membre (GESTURE_CARD) ;
 * emptyFirst = vues dont la première recherche n'a rendu aucune carte.
 */
export type SummaryMetric = (typeof SUMMARY_METRICS)[number];

export interface VitalRow { metadata: unknown }

export interface VitalCell { p75: number | null; count: number }
export interface PathSummary {
  path: string;
  total: number;
  byDevice: Record<SummaryDevice, Record<SummaryMetric, VitalCell>>;
  /** Lot perf 19 : vues à première issue vide (FIRST_RESULT outcome empty), par appareil. */
  emptyFirst: Record<SummaryDevice, number>;
}

/** 75e centile, méthode du rang le plus proche (valeur réellement observée). */
export function p75(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil(0.75 * s.length) - 1)];
}

const DEVICES: SummaryDevice[] = ["mobile", "tablet", "desktop"];

export function summarizeVitals(rows: VitalRow[], topN = 10): { paths: PathSummary[]; measures: number } {
  const acc = new Map<string, { total: number; v: Record<string, number[]>; empty: Record<SummaryDevice, number> }>();
  let measures = 0;
  for (const r of rows) {
    const m = r.metadata as { host?: unknown; path?: unknown; device?: unknown; metrics?: Record<string, { value?: unknown; rating?: unknown; attr?: { outcome?: unknown } }> } | null;
    if (!m || m.host !== SUMMARY_HOST || typeof m.path !== "string" || !DEVICES.includes(m.device as SummaryDevice) || !m.metrics) continue;
    measures++;
    const e = acc.get(m.path) ?? { total: 0, v: {}, empty: { mobile: 0, tablet: 0, desktop: 0 } };
    e.total++;
    if (m.metrics.FIRST_RESULT?.attr?.outcome === "empty") e.empty[m.device as SummaryDevice]++;
    for (const k of SUMMARY_METRICS) {
      const entry = k === "CONTENT"
        ? (m.metrics.FIRST_CARD ?? m.metrics.SIT_HERO) as { value?: unknown; rating?: unknown } | undefined
        : k === "GESTURE" ? m.metrics.GESTURE_CARD
        : m.metrics[k];
      if (k === "CONTENT" && entry?.rating === "abandoned") continue;
      const val = entry?.value;
      if (typeof val === "number" && Number.isFinite(val)) (e.v[`${m.device}:${k}`] ??= []).push(val);
    }
    acc.set(m.path, e);
  }
  const paths = [...acc.entries()]
    .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([path, e]) => {
      const byDevice = {} as PathSummary["byDevice"];
      for (const d of DEVICES) {
        byDevice[d] = {} as Record<SummaryMetric, VitalCell>;
        for (const k of SUMMARY_METRICS) {
          const vals = e.v[`${d}:${k}`] ?? [];
          byDevice[d][k] = { p75: p75(vals), count: vals.length };
        }
      }
      return { path, total: e.total, byDevice, emptyFirst: e.empty };
    });
  return { paths, measures };
}
