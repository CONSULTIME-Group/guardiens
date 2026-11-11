// Lot LECT1 (11/11/2026) : lecture complète d'une table par pages.
// L'API de la base coupe chaque réponse à 1 000 lignes, et une limite plus
// haute ne dépasse pas cette borne : une lecture simple d'une population de
// plus de 1 000 lignes en perd la fin, sans erreur. Module pur, sans
// dépendance Deno, testé côté Vitest.
//
// `page(from, to)` doit porter un tri stable (.order sur une clé unique) et
// se terminer par .range(from, to).

export const READ_PAGE_SIZE = 1000;
export const READ_ROW_CAP = 50_000;

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

export async function readAllRows<T>(
  page: (from: number, to: number) => Page<T>,
  pageSize = READ_PAGE_SIZE,
  rowCap = READ_ROW_CAP,
): Promise<T[]> {
  const rows: T[] = [];
  while (rows.length < rowCap) {
    const from = rows.length;
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return rows;
}
