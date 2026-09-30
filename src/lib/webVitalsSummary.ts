/**
 * Lot P2b : agrégat de la carte admin « Vitesse ressentie ».
 * Entrée : lignes analytics_events de type web_vital (metadata envoyée par
 * src/lib/webVitals.ts). Sortie : 75e centile de LCP, INP et plus longue
 * tâche par type d'appareil, pour les chemins les plus mesurés.
 */
export type SummaryDevice = "mobile" | "tablet" | "desktop";
export const SUMMARY_METRICS = ["LCP", "INP", "LONG_TASK"] as const;
export type SummaryMetric = (typeof SUMMARY_METRICS)[number];

export interface VitalRow { metadata: unknown }

export interface VitalCell { p75: number | null; count: number }
export interface PathSummary {
  path: string;
  total: number;
  byDevice: Record<SummaryDevice, Record<SummaryMetric, VitalCell>>;
}

/** 75e centile, méthode du rang le plus proche (valeur réellement observée). */
export function p75(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil(0.75 * s.length) - 1)];
}

const DEVICES: SummaryDevice[] = ["mobile", "tablet", "desktop"];

export function summarizeVitals(rows: VitalRow[], topN = 10): { paths: PathSummary[]; measures: number } {
  const acc = new Map<string, { total: number; v: Record<string, number[]> }>();
  let measures = 0;
  for (const r of rows) {
    const m = r.metadata as { path?: unknown; device?: unknown; metrics?: Record<string, { value?: unknown }> } | null;
    if (!m || typeof m.path !== "string" || !DEVICES.includes(m.device as SummaryDevice) || !m.metrics) continue;
    measures++;
    const e = acc.get(m.path) ?? { total: 0, v: {} };
    e.total++;
    for (const k of SUMMARY_METRICS) {
      const val = m.metrics[k]?.value;
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
      return { path, total: e.total, byDevice };
    });
  return { paths, measures };
}
