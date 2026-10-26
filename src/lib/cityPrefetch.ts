/**
 * Lot perf 14 (26/10/2026) : ligne seo_city_pages d'une page ville lue dès le
 * HTML (scripts/vite-plugin-listings-prefetch.mjs, cityPrefetchScript),
 * reprise une seule fois par CityPage. undefined = rien d'utilisable (absente,
 * autre adresse, trop ancienne, erreur) : la page lit alors comme avant ;
 * { row: null } = aucune page publiée pour ce slug, comme un maybeSingle vide.
 */
const GLOBAL = "__GUARDIENS_CITY__";
export const CITY_PREFETCH_MAX_AGE_MS = 60_000;

export async function takeCityPrefetch(slug: string | undefined): Promise<{ row: unknown } | undefined> {
  if (typeof window === "undefined" || !slug) return undefined;
  const w = window as unknown as Record<string, unknown>;
  const slot = w[GLOBAL] as { slug?: unknown; at?: unknown; p?: Promise<unknown> } | null | undefined;
  if (!slot) return undefined;
  w[GLOBAL] = null;
  if (slot.slug !== slug || typeof slot.at !== "number" || Date.now() - slot.at > CITY_PREFETCH_MAX_AGE_MS) return undefined;
  try {
    const v = (await slot.p) as { row?: unknown } | null;
    if (!v || typeof v !== "object" || !("row" in v)) return undefined;
    const row = v.row;
    if (row !== null && (typeof row !== "object" || Array.isArray(row))) return undefined;
    return { row };
  } catch {
    return undefined;
  }
}
