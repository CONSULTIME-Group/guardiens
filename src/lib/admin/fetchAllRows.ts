/**
 * Lecture paginée exhaustive pour les écrans admin.
 *
 * L'API coupe chaque réponse à 1 000 lignes, `.limit(10000)` ne dépasse pas
 * cette limite. On lit donc par pages de `pageSize` avec `.range()` jusqu'à
 * une page incomplète. La requête fournie DOIT porter un ordre stable
 * (colonne unique en dernier critère), sinon des lignes peuvent être lues
 * deux fois ou sautées d'une page à l'autre.
 *
 * Plafond de sécurité : au-delà de `cap` lignes on s'arrête et `truncated`
 * vaut true, l'écran affiche alors « données partielles ».
 */
export const ADMIN_PAGE_SIZE = 1000;
export const ADMIN_ROW_CAP = 50_000;

export interface FetchAllResult<T> {
  rows: T[];
  truncated: boolean;
  pages: number;
}

type PageResult<T> = { data: T[] | null; error: unknown };

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  opts: { pageSize?: number; cap?: number } = {},
): Promise<FetchAllResult<T>> {
  const pageSize = opts.pageSize ?? ADMIN_PAGE_SIZE;
  const cap = opts.cap ?? ADMIN_ROW_CAP;
  const rows: T[] = [];
  let pages = 0;
  while (rows.length < cap) {
    const from = rows.length;
    const to = Math.min(from + pageSize, cap) - 1;
    const { data, error } = await page(from, to);
    if (error) throw error;
    pages++;
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < to - from + 1) {
      return { rows, truncated: false, pages };
    }
  }
  return { rows, truncated: true, pages };
}
