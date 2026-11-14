// Lot ART0 (14/11/2026) : liens internes d'un article, saisis dans l'éditeur.
// Format enregistré dans articles.internal_links : [{ text, url }], lu par
// ArticleDetail (qui accepte aussi l'ancien format { anchor, slug }).

export interface ArticleLink {
  text: string;
  url: string;
}

export const ARTICLE_LINKS_MIN = 2;
export const ARTICLE_LINKS_MAX = 20;

const SITE_HOSTS = new Set(["guardiens.fr", "www.guardiens.fr"]);

/** Ramène une adresse du site à son chemin ; rend null pour une adresse extérieure. */
export function toSitePath(input: string): string | null {
  const v = (input ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      if (!SITE_HOSTS.has(u.hostname.toLowerCase())) return null;
      return `${u.pathname}${u.search}${u.hash}` || "/";
    } catch {
      return null;
    }
  }
  if (!v.startsWith("/") || v.startsWith("//")) return null;
  return v;
}

/** Lit la colonne telle qu'en base, ancien format compris. */
export function readArticleLinks(raw: unknown): ArticleLink[] {
  if (!Array.isArray(raw)) return [];
  const out: ArticleLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const text = typeof r.text === "string" ? r.text : typeof r.anchor === "string" ? r.anchor : "";
    let url = typeof r.url === "string" ? r.url : "";
    if (!url && typeof r.slug === "string" && r.slug.trim()) url = `/actualites/${r.slug.trim()}`;
    out.push({ text, url });
  }
  return out;
}

/** Une ligne saisie à corriger, ou null quand elle est prête (ligne vide comprise). */
export function articleLinkProblem(link: ArticleLink): string | null {
  const text = link.text.trim();
  const url = link.url.trim();
  if (!text && !url) return null;
  if (!text) return "Ajoutez le texte du lien.";
  if (!url) return "Ajoutez l'adresse de la page.";
  if (!toSitePath(url)) return "Indiquez une page de guardiens.fr, par exemple /actualites/mon-article.";
  return null;
}

/** Liens prêts à enregistrer : lignes complètes, chemins du site, sans doublon. */
export function cleanArticleLinks(links: ArticleLink[]): ArticleLink[] {
  const seen = new Set<string>();
  const out: ArticleLink[] = [];
  for (const link of links) {
    if (articleLinkProblem(link)) continue;
    const text = link.text.trim();
    const path = toSitePath(link.url);
    if (!text || !path || seen.has(path)) continue;
    seen.add(path);
    out.push({ text, url: path });
    if (out.length >= ARTICLE_LINKS_MAX) break;
  }
  return out;
}
