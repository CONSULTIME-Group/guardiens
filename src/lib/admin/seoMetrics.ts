/**
 * Lot A10 : définitions uniques des chiffres de l'onglet Trafic.
 */

/** Slug d'article depuis une URL Google (articles publiés sous /actualites/, ancien chemin /articles/). */
export function articleSlugFromUrl(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\/(articles|actualites)\//, "").replace(/\/$/, "");
  } catch {
    return url;
  }
}

export interface PageImpressions { page: string; impressions: number }

/** Articles publiés depuis plus de 7 jours, jamais affichés par Google, sur la liste complète des pages. */
export function articlesWithoutImpressions<T extends { slug: string; published_at: string | null }>(
  published: T[],
  pages: PageImpressions[],
  now: Date = new Date(),
): T[] {
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const seen = new Set(pages.filter((p) => p.impressions > 0).map((p) => articleSlugFromUrl(p.page)));
  return published
    .filter((a) => a.published_at && new Date(a.published_at) < sevenDaysAgo && !seen.has(a.slug))
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
}

/** Pages Google au format commun, liste complète si disponible, sinon top renvoyé par l'ancien cache. */
export function pagesFromSeo(gsc: { allPages?: PageImpressions[]; topPages?: { keys?: string[]; impressions: number }[] } | undefined): PageImpressions[] {
  if (!gsc) return [];
  if (gsc.allPages) return gsc.allPages;
  return (gsc.topPages ?? []).map((p) => ({ page: p.keys?.[0] ?? "", impressions: p.impressions }));
}

/** Durée lisible : « 2 min 05 s ». */
export function formatDurationFr(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} min ${s < 10 ? "0" : ""}${s} s`;
}

/** Nombre de jours inclusifs entre deux dates AAAA-MM-JJ. */
export function daysInclusive(start: string, end: string): number {
  const d = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;
  return Math.round(d) + 1;
}

export function periodLabel(start?: string, end?: string, fallback = "Période"): string {
  if (!start || !end) return fallback;
  const n = daysInclusive(start, end);
  const f = (x: string) => new Date(`${x}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", day: "numeric", month: "short" });
  return `${n} jours (${f(start)} au ${f(end)})`;
}

/** Sessions du seul canal Organic Search. null si le canal est absent de la réponse. */
export function organicSessions(channels: { channel: string; sessions: number }[] | undefined): number | null {
  if (!channels) return null;
  const row = channels.find((c) => c.channel === "Organic Search");
  return row ? row.sessions : 0;
}

export const fmtInt = (n: number) => n.toLocaleString("fr-FR");
