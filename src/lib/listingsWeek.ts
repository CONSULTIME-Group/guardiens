/**
 * Lot RCH7 (14/11/2026) : annonces ouvertes publiées depuis 7 jours, pour le
 * surtitre de /annonces (« 4 publiées cette semaine »). Même règle pour la vue
 * de démarrage et pour la page. published_at seul fait foi.
 */
export const WEEK_MS = 7 * 24 * 3_600_000;

export function publishedThisWeekCount(rows: Array<{ published_at?: string | null }>, nowMs: number = Date.now()): number {
  return rows.filter((r) => {
    if (!r?.published_at) return false;
    const t = new Date(r.published_at).getTime();
    return Number.isFinite(t) && t <= nowMs && nowMs - t < WEEK_MS;
  }).length;
}
