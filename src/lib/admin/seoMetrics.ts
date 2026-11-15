/**
 * Lot A10 : définitions uniques des chiffres de l'onglet Trafic.
 */

/** Slug d'article depuis une URL Google (articles publiés sous /actualites/, ancien chemin /articles/). */
export function articleSlugFromUrl(url: string): string {
  return pagePath(url).replace(/^\/(articles|actualites)\//, "");
}

/**
 * Lot SEO-A : chemin d'une page Google sans domaine, sans ancre (#prix) ni
 * paramètre (?lang=en), sans barre finale. Search Console compte séparément
 * les liens d'ancre et les anciennes variantes ?lang= (redirigées depuis) :
 * on les regroupe sur la page réelle.
 */
export function pagePath(url: string): string {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    path = url.replace(/^https?:\/\/[^/]+/, "").replace(/[#?].*$/, "");
  }
  if (path.length > 1) path = path.replace(/\/$/, "");
  return path || "/";
}

export interface PageTotals { clicks: number; impressions: number }

/** Lot SEO-A : clics et impressions par chemin réel (ancres et paramètres regroupés). */
export function aggregatePages(pages: { page: string; impressions: number; clicks?: number }[]): Map<string, PageTotals> {
  const out = new Map<string, PageTotals>();
  for (const p of pages) {
    const key = pagePath(p.page);
    const cur = out.get(key) ?? { clicks: 0, impressions: 0 };
    cur.clicks += p.clicks ?? 0;
    cur.impressions += p.impressions;
    out.set(key, cur);
  }
  return out;
}

/** Nombre de pages distinctes affichées au moins une fois par Google. */
export function pagesWithImpressions(pages: { page: string; impressions: number; clicks?: number }[]): number {
  let n = 0;
  for (const t of aggregatePages(pages).values()) if (t.impressions > 0) n++;
  return n;
}

export type ArticleIndexStatus = "indexable" | "redirige" | "noindex" | "canonique_ailleurs";

export const ARTICLE_INDEX_STATUS_LABELS: Record<ArticleIndexStatus, string> = {
  indexable: "indexable",
  redirige: "redirigé",
  noindex: "noindex",
  canonique_ailleurs: "canonique vers une autre page",
};

/**
 * Lot SEO-A : statut d'un article publié tel que Google le voit, avec les
 * mêmes règles que le sitemap : redirection en base (table redirects),
 * noindex, ou canonique qui pointe vers une autre adresse. Seuls les articles
 * « indexable » ont vocation à apparaître dans Google.
 */
export function articleIndexStatus(
  a: { slug: string; noindex?: boolean | null; canonical_url?: string | null },
  redirectedSlugs: Set<string>,
): ArticleIndexStatus {
  if (redirectedSlugs.has(a.slug)) return "redirige";
  if (a.noindex === true) return "noindex";
  const canon = (a.canonical_url ?? "").trim();
  if (canon && pagePath(canon) !== `/actualites/${a.slug}`) return "canonique_ailleurs";
  return "indexable";
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

export interface SeoArticle {
  slug: string;
  title: string;
  category: string;
  published_at: string | null;
  created_at: string;
  status: ArticleIndexStatus;
}

export interface PagePosition { position: number; ctr: number }

/** Positions connues (Search Console ne les renvoie que pour les 25 premières pages en cache). */
export function positionsFromTopPages(rows: { keys?: string[]; position: number; ctr: number }[] | undefined): Map<string, PagePosition> {
  const out = new Map<string, PagePosition>();
  for (const r of rows ?? []) {
    const key = pagePath(r.keys?.[0] ?? "");
    if (!out.has(key)) out.set(key, { position: r.position, ctr: r.ctr });
  }
  return out;
}

export type SeoActionKind = "loin" | "titre";

export interface SeoAction {
  article: SeoArticle;
  kind: SeoActionKind;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number | null;
}

/** Seuils des actions prioritaires : assez d'impressions pour juger, taux de clic faible. */
export const SEO_ACTION_MIN_IMPRESSIONS = 100;
export const SEO_ACTION_MAX_CTR = 0.01;

/**
 * Lot SEO-A : actions prioritaires sur les articles indexables, une seule par
 * article, triées par impressions. « loin » : position connue au-delà de 20 ;
 * « titre » : Google montre l'article mais on clique peu, le titre et la
 * description sont le levier. Les articles sans impression ont leur propre bloc.
 */
export function priorityActions(
  articles: SeoArticle[],
  totals: Map<string, PageTotals>,
  positions: Map<string, PagePosition>,
  limit = 8,
): SeoAction[] {
  const out: SeoAction[] = [];
  for (const a of articles) {
    if (a.status !== "indexable") continue;
    const path = `/actualites/${a.slug}`;
    const t = totals.get(path);
    if (!t || t.impressions < SEO_ACTION_MIN_IMPRESSIONS) continue;
    const ctr = t.clicks / t.impressions;
    if (ctr >= SEO_ACTION_MAX_CTR) continue;
    const position = positions.get(path)?.position ?? null;
    out.push({ article: a, kind: position !== null && position > 20 ? "loin" : "titre", impressions: t.impressions, clicks: t.clicks, ctr, position });
  }
  return out.sort((x, y) => y.impressions - x.impressions).slice(0, limit);
}

export interface TopArticleRow { article: SeoArticle; clicks: number; impressions: number; ctr: number; position: number | null }

/** Lot SEO-A : dix articles les plus cliqués, sur la liste complète des pages Google. */
export function topArticles(
  articles: SeoArticle[],
  totals: Map<string, PageTotals>,
  positions: Map<string, PagePosition>,
  limit = 10,
): TopArticleRow[] {
  const rows: TopArticleRow[] = [];
  for (const a of articles) {
    const path = `/actualites/${a.slug}`;
    const t = totals.get(path);
    if (!t || t.impressions === 0) continue;
    rows.push({ article: a, clicks: t.clicks, impressions: t.impressions, ctr: t.clicks / t.impressions, position: positions.get(path)?.position ?? null });
  }
  return rows.sort((x, y) => y.clicks - x.clicks || y.impressions - x.impressions).slice(0, limit);
}

/** Lot SEO-A : répartition des articles publiés par statut Google. */
export function countByStatus(articles: { status: ArticleIndexStatus }[]): Record<ArticleIndexStatus, number> {
  const out: Record<ArticleIndexStatus, number> = { indexable: 0, redirige: 0, noindex: 0, canonique_ailleurs: 0 };
  for (const a of articles) out[a.status]++;
  return out;
}
