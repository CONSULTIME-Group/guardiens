/**
 * Lot TRF-5 (15/11/2026) : journal des actions SEO (table seo_action_log,
 * migration 0174) lu par l'onglet SEO et IA. Règles pures.
 */
export type SeoActionKind = "titre_description" | "indexnow" | "redirection" | "noindex" | "fusion" | "traite" | "gabarit";

export interface SeoLogEntry {
  id: string;
  created_at: string;
  kind: SeoActionKind;
  path: string;
  note: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

/** Jours avant la relecture d'une action : quatre semaines, la fenêtre de Search Console. */
export const SEO_REVIEW_DAYS = 28;
/** Un article « gardé » sort de la liste des articles jamais vus pendant 90 jours. */
export const SEO_KEEP_DAYS = 90;

export const SEO_ACTION_LABELS: Record<SeoActionKind, string> = {
  titre_description: "Titre et description réécrits",
  indexnow: "Adresse poussée aux moteurs",
  redirection: "Redirection posée",
  noindex: "Sortie de l'index",
  fusion: "Fusion avec un autre article",
  traite: "Marqué traité",
  gabarit: "Gabarit de titres changé",
};

const dayMs = 86_400_000;

export function reviewDate(createdAt: string): Date {
  return new Date(Date.parse(createdAt) + SEO_REVIEW_DAYS * dayMs);
}

export const frDay = (d: Date | string): string =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }).format(typeof d === "string" ? new Date(d) : d);

/** Dernière action par chemin, parmi celles de moins de `days` jours. */
export function recentActionsByPath(log: SeoLogEntry[], days = SEO_REVIEW_DAYS, now = new Date()): Map<string, SeoLogEntry> {
  const out = new Map<string, SeoLogEntry>();
  const limit = now.getTime() - days * dayMs;
  for (const e of [...log].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
    if (Date.parse(e.created_at) < limit) continue;
    if (!out.has(e.path)) out.set(e.path, e);
  }
  return out;
}

/** Prochaine date de relecture parmi les actions en cours, null si aucune. */
export function nextReview(log: SeoLogEntry[], now = new Date()): Date | null {
  const dates = log.map((e) => reviewDate(e.created_at)).filter((d) => d.getTime() >= now.getTime()).sort((a, b) => a.getTime() - b.getTime());
  return dates[0] ?? null;
}

export interface SnapshotPoint { period_end: string; key: string; clicks: number; impressions: number }

/** Vrai quand la clé du relevé relève du chemin de l'action (« /house-sitting/* » couvre toutes les pages villes). */
export function pathCovers(actionPath: string, key: string): boolean {
  if (actionPath.endsWith("/*")) return key.startsWith(actionPath.slice(0, -1));
  return key === actionPath;
}

export interface BeforeAfter { before: number | null; beforeAt: string | null; after: number | null; afterAt: string | null }

/**
 * Clics avant et après une action : dernier relevé dont la période finit au
 * plus tard le jour de l'action, premier relevé dont la période finit quatre
 * semaines après ou plus tard.
 */
export function clicksBeforeAfter(entry: SeoLogEntry, points: SnapshotPoint[]): BeforeAfter {
  const actionDay = entry.created_at.slice(0, 10);
  const reviewDay = reviewDate(entry.created_at).toISOString().slice(0, 10);
  const mine = points.filter((p) => pathCovers(entry.path, p.key));
  const sumAt = (day: string) => mine.filter((p) => p.period_end === day).reduce((s, p) => s + p.clicks, 0);
  const days = [...new Set(mine.map((p) => p.period_end))].sort();
  const beforeAt = [...days].reverse().find((d) => d <= actionDay) ?? null;
  const afterAt = days.find((d) => d >= reviewDay) ?? null;
  return { before: beforeAt ? sumAt(beforeAt) : null, beforeAt, after: afterAt ? sumAt(afterAt) : null, afterAt };
}

/** Âge d'un article en jours, depuis sa publication. */
export function articleAgeDays(publishedAt: string | null, createdAt: string, now = new Date()): number {
  return Math.floor((now.getTime() - Date.parse(publishedAt ?? createdAt)) / dayMs);
}

/** Lien court d'une publication : guardiens.fr/fb?utm_campaign=nom-de-la-publication. */
export const SHORT_LINK_BY_CHANNEL: Record<string, string> = { facebook: "fb", instagram: "ig", youtube: "yt", tiktok: "tiktok" };

export function campaignSlug(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export function publicationShortLink(channel: string, name: string): string | null {
  const short = SHORT_LINK_BY_CHANNEL[channel];
  const slug = campaignSlug(name);
  if (!short || !slug) return null;
  return `https://guardiens.fr/${short}?utm_campaign=${slug}`;
}
