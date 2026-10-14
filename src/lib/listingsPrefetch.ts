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
