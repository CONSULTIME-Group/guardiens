/**
 * Lot NUR1 (08/11/2026) : lecture paginée des préférences du récapitulatif
 * quotidien. Une lecture simple s'arrête à 1 000 lignes (plafond de l'API).
 * Module pur, sans dépendance Deno, testé côté Vitest.
 */
export const PREFERENCE_PAGE_SIZE = 1000
export const PREFERENCE_ROW_CAP = 20_000

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>

export async function fetchAllPreferenceRows<T>(
  page: (from: number, to: number) => Page<T>,
  pageSize = PREFERENCE_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = []
  while (rows.length < PREFERENCE_ROW_CAP) {
    const from = rows.length
    const { data, error } = await page(from, from + pageSize - 1)
    if (error) throw error
    const chunk = data ?? []
    rows.push(...chunk)
    if (chunk.length < pageSize) break
  }
  return rows
}
