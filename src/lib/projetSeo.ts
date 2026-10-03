/**
 * Règles SEO des projets participatifs (lot SEO-2), pures et testées.
 *
 * - Une fiche projet a une seule adresse de référence : /projets/{slug}
 *   quand le slug existe, sinon /projets/{id}.
 * - Une lecture qui échoue (réseau, base) n'est jamais une absence : elle
 *   répond 503 aux robots, que Prerender ne met pas en cache, au lieu d'un
 *   faux 404 qui ferait sortir une fiche réelle de l'index.
 */

export const SITE_ORIGIN = "https://guardiens.fr";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return !!value && UUID_RE.test(value);
}

export function projetPath(row: { id: string; slug?: string | null }): string {
  const slug = typeof row.slug === "string" ? row.slug.trim() : "";
  return `/projets/${slug || row.id}`;
}

export function projetCanonicalUrl(row: { id: string; slug?: string | null }): string {
  return `${SITE_ORIGIN}${projetPath(row)}`;
}

export type ProjetLookup =
  | { state: "loading" }
  | { state: "found"; row: any }
  | { state: "absent" }
  | { state: "error" };

/** Traduit le retour d'une lecture `maybeSingle()` en état de page. */
export function classifyProjetLookup(res: { data: unknown; error: unknown } | null | undefined): ProjetLookup {
  if (!res || res.error) return { state: "error" };
  if (!res.data) return { state: "absent" };
  return { state: "found", row: res.data };
}

/** Statut HTTP déclaré à Prerender pour chaque état terminal. */
export function projetStatusCode(state: ProjetLookup["state"]): number | undefined {
  if (state === "absent") return 404;
  if (state === "error") return 503;
  return undefined;
}

/**
 * Ancienne adresse /petites-missions/{slug|uuid} d'une annonce devenue projet :
 * cible permanente unique, sans paramètre de suivi.
 */
export function legacyProjetRedirectTarget(row: { id: string; slug?: string | null; category?: string | null }): string | null {
  if (row.category !== "projet") return null;
  return projetPath(row);
}

/**
 * Le hub /projets est indexable dès qu'un projet ouvert éligible est lu.
 * Pendant le chargement ou après une erreur, il ne se déclare pas.
 */
export function projetsHubSeo(p: {
  loading: boolean;
  error: boolean;
  eligibleCount: number;
}): { ready: boolean; noindex: boolean; statusCode?: number } {
  if (p.loading) return { ready: false, noindex: false };
  if (p.error) return { ready: true, noindex: true, statusCode: 503 };
  return { ready: true, noindex: p.eligibleCount === 0 };
}
