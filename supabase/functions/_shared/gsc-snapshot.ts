/**
 * Lot TRF-4 (15/11/2026) : relevé hebdomadaire Search Console, écrit par
 * fetch-seo-data dans seo_gsc_snapshots. Un seul instantané existait
 * (seo_cache) : l'effet d'un titre réécrit ou d'un gabarit changé restait
 * illisible d'une semaine à l'autre. Règles pures, testées par Vitest.
 */
export interface GscSnapshotRow {
  period_end: string;
  kind: "page" | "query";
  key: string;
  clicks: number;
  impressions: number;
  position: number | null;
  top_page: string | null;
  period_days: number;
}

export interface GscSnapshotSource {
  allPages?: { page: string; clicks: number; impressions: number; position: number }[] | null;
  allQueries?: { query: string; clicks: number; impressions: number; position: number }[] | null;
  queryTopPages?: Record<string, string> | null;
}

/** Jours entre deux relevés : un relevé par semaine. */
export const SNAPSHOT_MIN_GAP_DAYS = 7;
/** Requêtes gardées au relevé : vues au moins cinq fois sur la période. */
export const SNAPSHOT_MIN_QUERY_IMPRESSIONS = 5;

const dayMs = 86_400_000;

/** Vrai quand le dernier relevé date d'une semaine au moins (ou qu'aucun relevé n'existe). */
export function shouldSnapshot(lastPeriodEnd: string | null | undefined, periodEnd: string): boolean {
  if (!lastPeriodEnd) return true;
  const last = Date.parse(`${lastPeriodEnd}T00:00:00Z`);
  const next = Date.parse(`${periodEnd}T00:00:00Z`);
  if (!Number.isFinite(last) || !Number.isFinite(next)) return false;
  return next - last >= SNAPSHOT_MIN_GAP_DAYS * dayMs;
}

/** Chemin sans domaine, sans ancre, sans paramètre de langue, sans barre finale. */
export function snapshotPath(url: string): string {
  let p = url.replace(/^https?:\/\/[^/]+/i, "");
  p = p.split("#")[0].split("?")[0];
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildSnapshotRows(source: GscSnapshotSource, periodEnd: string, periodDays: number): GscSnapshotRow[] {
  const pages = new Map<string, { clicks: number; impressions: number; weighted: number }>();
  for (const p of source.allPages ?? []) {
    if (!p?.page || !(p.impressions > 0)) continue;
    const key = snapshotPath(p.page).slice(0, 400);
    const cur = pages.get(key) ?? { clicks: 0, impressions: 0, weighted: 0 };
    cur.clicks += p.clicks || 0;
    cur.impressions += p.impressions;
    cur.weighted += (p.position || 0) * p.impressions;
    pages.set(key, cur);
  }
  const rows: GscSnapshotRow[] = [];
  for (const [key, v] of pages) {
    rows.push({
      period_end: periodEnd, kind: "page", key,
      clicks: v.clicks, impressions: v.impressions,
      position: v.impressions > 0 ? round2(v.weighted / v.impressions) : null,
      top_page: null, period_days: periodDays,
    });
  }
  const seen = new Set<string>();
  for (const q of source.allQueries ?? []) {
    const key = (q?.query ?? "").trim().slice(0, 400);
    if (!key || seen.has(key) || !(q.impressions >= SNAPSHOT_MIN_QUERY_IMPRESSIONS)) continue;
    seen.add(key);
    const top = source.queryTopPages?.[q.query];
    rows.push({
      period_end: periodEnd, kind: "query", key,
      clicks: q.clicks || 0, impressions: q.impressions,
      position: q.position ? round2(q.position) : null,
      top_page: top ? snapshotPath(top).slice(0, 400) : null,
      period_days: periodDays,
    });
  }
  return rows;
}
