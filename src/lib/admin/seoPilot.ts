/**
 * Lot SEO-B : règles de l'onglet SEO et IA de /admin/traffic, pures et testées.
 * Le type de page suit la même règle que public.seob_page_template
 * (drizzle/migrations/0172_seob_arrivees.sql).
 */
import { pagePath, type PageTotals } from "@/lib/admin/seoMetrics";

export type PageTemplate =
  | "accueil" | "articles" | "villes" | "departements" | "races" | "guides"
  | "associations" | "fiches_gardien" | "annonces" | "entraide" | "autres";

export const PAGE_TEMPLATE_LABELS: Record<PageTemplate, string> = {
  accueil: "Accueil",
  articles: "Articles",
  villes: "Villes",
  departements: "Départements",
  races: "Races",
  guides: "Guides",
  associations: "Associations",
  fiches_gardien: "Fiches gardien",
  annonces: "Annonces",
  entraide: "Entraide",
  autres: "Autres pages",
};

const PREFIXES: [string, PageTemplate][] = [
  ["/actualites/", "articles"],
  ["/articles/", "articles"],
  ["/house-sitting/", "villes"],
  ["/departement/", "departements"],
  ["/races/", "races"],
  ["/guides/", "guides"],
  ["/associations/", "associations"],
  ["/gardiens/", "fiches_gardien"],
  ["/annonces/", "annonces"],
  ["/sits/", "annonces"],
  ["/petites-missions/", "entraide"],
];

/** Type d'une page du site. Une page d'index (/house-sitting) compte en « autres ». */
export function pageTemplate(urlOrPath: string): PageTemplate {
  const p = pagePath(urlOrPath);
  if (p === "/" || p === "") return "accueil";
  for (const [prefix, t] of PREFIXES) if (p.startsWith(prefix) && p.length > prefix.length) return t;
  return "autres";
}

/** Chemins des adresses d'un sitemap XML (balises loc). */
export function sitemapPaths(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(pagePath(m[1]));
  return out;
}

export interface TemplateRow {
  template: PageTemplate;
  inSitemap: number;
  /** Pages distinctes affichées au moins une fois par Google (sitemap ou non). */
  seen: number;
  impressions: number;
  clicks: number;
  ctr: number;
  /** Pages du sitemap sans aucune impression sur la période. */
  unseen: string[];
}

/** Ordre d'affichage fixe : ce qui compte pour la garde d'abord. */
export const TEMPLATE_ORDER: PageTemplate[] = [
  "accueil", "villes", "departements", "articles", "guides", "races",
  "fiches_gardien", "annonces", "associations", "entraide", "autres",
];

/** Lot SEO-B : où Google nous voit, par type de page. */
export function templateTable(sitemap: string[], totals: Map<string, PageTotals>): TemplateRow[] {
  const rows = new Map<PageTemplate, TemplateRow>();
  const get = (t: PageTemplate) => {
    let r = rows.get(t);
    if (!r) { r = { template: t, inSitemap: 0, seen: 0, impressions: 0, clicks: 0, ctr: 0, unseen: [] }; rows.set(t, r); }
    return r;
  };
  const inSitemap = new Set(sitemap);
  for (const path of inSitemap) {
    const r = get(pageTemplate(path));
    r.inSitemap++;
    if (!((totals.get(path)?.impressions ?? 0) > 0)) r.unseen.push(path);
  }
  for (const [path, t] of totals) {
    if (t.impressions <= 0) continue;
    const r = get(pageTemplate(path));
    r.seen++;
    r.impressions += t.impressions;
    r.clicks += t.clicks;
  }
  for (const r of rows.values()) {
    r.ctr = r.impressions > 0 ? r.clicks / r.impressions : 0;
    r.unseen.sort();
  }
  return TEMPLATE_ORDER.filter((t) => rows.has(t)).map((t) => rows.get(t)!);
}

export interface QueryRow { query: string; clicks: number; impressions: number; position: number }

/** Requêtes de marque : le nom du site, avec ou sans fautes courantes. */
export const BRAND_QUERY = /guard(?:i|ia)?ens?\b|guardien\.fr|guardiens\.fr/i;

export function isBrandQuery(q: string): boolean {
  return BRAND_QUERY.test(q);
}

/**
 * Lot SEO-B : clics hors marque = clics totaux moins clics des requêtes de
 * marque (les requêtes anonymisées par Google restent dans le hors marque).
 */
export function nonBrandClicks(totalClicks: number, queries: QueryRow[]): number {
  const brand = queries.filter((q) => isBrandQuery(q.query)).reduce((s, q) => s + q.clicks, 0);
  return Math.max(0, totalClicks - brand);
}

export interface StrikingQuery extends QueryRow { page: string | null }

export const STRIKING_MIN_IMPRESSIONS = 100;
export const STRIKING_MIN_POSITION = 5;
export const STRIKING_MAX_POSITION = 20;

/**
 * Lot SEO-B : requêtes à portée de la première page (position 5 à 20,
 * 100 impressions au moins), hors marque, des plus vues aux moins vues,
 * avec la page qui ressort quand elle est connue.
 */
export function strikingQueries(
  queries: QueryRow[],
  topPages: Record<string, string> | null | undefined,
  limit = 8,
): StrikingQuery[] {
  return queries
    .filter((q) => !isBrandQuery(q.query)
      && q.impressions >= STRIKING_MIN_IMPRESSIONS
      && q.position >= STRIKING_MIN_POSITION
      && q.position <= STRIKING_MAX_POSITION)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit)
    .map((q) => ({ ...q, page: topPages?.[q.query] ? pagePath(topPages[q.query]) : null }));
}

export interface LandingOutcomeRow { template: PageTemplate; visits: number; signups: number; published_members: number }
export interface LandingPageRow { path: string; visits: number; signups: number; published_members: number }
export interface LandingOutcomes { templates: LandingOutcomeRow[]; pages: LandingPageRow[] }

/** Lecture tolérante de admin_landing_outcomes : tout champ manquant vaut 0. */
export function readLandingOutcomes(raw: unknown): LandingOutcomes {
  const obj = (raw ?? {}) as { templates?: unknown[]; pages?: unknown[] };
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);
  const templates = (obj.templates ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    const t = String(x.template ?? "autres") as PageTemplate;
    return { template: t in PAGE_TEMPLATE_LABELS ? t : "autres", visits: num(x.visits), signups: num(x.signups), published_members: num(x.published_members) };
  });
  const pages = (obj.pages ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return { path: String(x.path ?? "") || "/", visits: num(x.visits), signups: num(x.signups), published_members: num(x.published_members) };
  });
  return { templates, pages };
}

/** Position moyenne : écart en places entre deux périodes (positif = recul). */
export function positionDelta(current: number, previous: number): number | null {
  if (!previous || !current) return null;
  return Math.round((current - previous) * 10) / 10;
}
