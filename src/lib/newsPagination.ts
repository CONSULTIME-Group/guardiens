/**
 * Pagination du journal (/actualites) par chemin et non par paramètre.
 *
 * Pourquoi un chemin : le miroir du Worker de prérendu retire toute query
 * string avant le rendu robot (liste PRERENDER_KEEP_PARAMS vide). Avec
 * `?page=2`, un robot recevait la première page. `/actualites/page/2` garde
 * son identité sans dépendre du Worker.
 *
 * Page 1 : toujours `/actualites`, jamais `/actualites/page/1`.
 */

export const NEWS_BASE_PATH = "/actualites";

/** Borne haute absolue : au-delà, aucune lecture n'est tentée (404). */
export const NEWS_MAX_PAGE = 10000;

/**
 * Lit le segment `:page`. Renvoie un entier dans [1, NEWS_MAX_PAGE], ou null
 * si la valeur n'est pas un entier décimal positif ("1.5", "-1", "abc", "",
 * "0", "1e3" sont refusés). Les zéros initiaux ("02") sont acceptés ici et
 * normalisés par une redirection côté page. Absent = page 1.
 */
export function parseNewsPageParam(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return 1;
  if (!/^\d{1,12}$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1 || n > NEWS_MAX_PAGE) return null;
  return n;
}

/** Vrai si le segment doit être réécrit vers sa forme canonique ("02", "1"). */
export function needsNewsPageNormalization(raw: string | undefined, page: number | null): boolean {
  if (raw === undefined || page === null) return false;
  return page === 1 || raw !== String(page);
}

/** Chemin d'une page, filtres conservés en query (catégorie, recherche, langue). */
export function newsPageHref(page: number, search: URLSearchParams | string = ""): string {
  const params = new URLSearchParams(search);
  params.delete("page");
  const qs = params.toString();
  const path = page <= 1 ? NEWS_BASE_PATH : `${NEWS_BASE_PATH}/page/${page}`;
  return qs ? `${path}?${qs}` : path;
}

/**
 * Chemin canonique. Une vue filtrée (catégorie ou recherche) garde le
 * canonique historique `/actualites` : seule la liste complète se pagine
 * en pages indexables distinctes.
 */
export function newsCanonicalPath(page: number, filtered: boolean): string {
  if (filtered || page <= 1) return NEWS_BASE_PATH;
  return `${NEWS_BASE_PATH}/page/${page}`;
}

/** Vrai si la page demandée dépasse la dernière page connue. */
export function isNewsPageOutOfRange(page: number, totalCount: number, pageSize: number): boolean {
  if (page <= 1) return false;
  const totalPages = Math.ceil(Math.max(0, totalCount) / pageSize);
  return page > totalPages;
}

/** Chemins de la liste des actualités (verrou de prérendu posé au démarrage). */
export function isNewsListPath(pathname: string): boolean {
  return pathname === NEWS_BASE_PATH || pathname === `${NEWS_BASE_PATH}/` || pathname.startsWith(`${NEWS_BASE_PATH}/page/`);
}
