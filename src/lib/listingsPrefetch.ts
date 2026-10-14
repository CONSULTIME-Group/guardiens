/**
 * Lot perf 3 : lectures de /annonces lancées par le HTML pour un visiteur
 * (scripts/vite-plugin-listings-prefetch.mjs), reprises une seule fois par la
 * recherche. Toute absence, erreur ou réponse trop ancienne rend null : la
 * recherche lit alors comme avant.
 */
export interface ListingsPrefetch {
  open: any[];
  closed: any[];
  owners: any[];
  gallery: any[];
  pets: any[];
  reviews: any[];
  badges: any[];
  ownerProfs: any[];
}

const GLOBAL = "__GUARDIENS_LISTINGS__";
/** Au-delà, la réponse est jugée trop ancienne (onglet resté ouvert, retour arrière). */
export const PREFETCH_MAX_AGE_MS = 60_000;

const KEYS: (keyof ListingsPrefetch)[] = ["open", "closed", "owners", "gallery", "pets", "reviews", "badges", "ownerProfs"];

export function isListingsPrefetch(v: unknown): v is ListingsPrefetch {
  if (!v || typeof v !== "object") return false;
  return KEYS.every((k) => Array.isArray((v as any)[k]));
}

/**
 * Reprend les lectures lancées par le HTML, une seule fois. `eligible` dit si
 * la recherche courante est celle que le HTML a lue (visiteur, mode public,
 * sans dates).
 */
export async function takeListingsPrefetch(eligible: boolean): Promise<ListingsPrefetch | null> {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const slot = w[GLOBAL];
  if (!slot) return null;
  w[GLOBAL] = null;
  if (!eligible || typeof slot.at !== "number" || Date.now() - slot.at > PREFETCH_MAX_AGE_MS) return null;
  try {
    const v = await slot.p;
    return isListingsPrefetch(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Lot perf 4 : retire le premier affichage de /annonces posé avant le code
 * (src/boot/bootListingsEntry.ts). Sans effet s'il n'existe pas.
 */
export function endBootListings(): void {
  if (typeof window === "undefined") return;
  try { (window as any).__guardiensBootListingsDone?.(); } catch { /* accessoire */ }
}

/** Compteurs du haut de /annonces calculés par le premier affichage (lot perf 4). */
export interface BootListingsCounts { openCount: number; citiesCount: number; intlCount: number }

/**
 * Lot perf 4 : compteurs posés par le premier affichage, repris par
 * PublicListings pour que la vraie page s'ouvre avec les mêmes lignes (aucun
 * saut au relais). null si absents ou anciens.
 */
export function takeBootListingsCounts(): BootListingsCounts | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  // Laissés en place (double rendu du mode strict, retour sur la page) : les
  // lectures de PublicListings les remplacent de toute façon.
  const c = w.__GUARDIENS_LISTINGS_COUNTS__;
  if (!c || typeof c.at !== "number" || Date.now() - c.at > PREFETCH_MAX_AGE_MS) return null;
  const ok = ["openCount", "citiesCount", "intlCount"].every((k) => Number.isInteger(c[k]) && c[k] >= 0);
  return ok ? { openCount: c.openCount, citiesCount: c.citiesCount, intlCount: c.intlCount } : null;
}
