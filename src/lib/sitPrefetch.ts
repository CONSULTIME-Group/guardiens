/**
 * Lot perf 5 : lectures de la fiche publique d'une annonce lancées par le
 * HTML pour un visiteur (scripts/vite-plugin-listings-prefetch.mjs,
 * sitPrefetchScript), reprises une seule fois par PublicSitDetail. Toute
 * absence, erreur, autre adresse ou réponse trop ancienne rend null : la
 * fiche lit alors comme avant.
 */
export interface SitPrefetch {
  sit: any[];
  owner?: any[];
  property?: any[];
  reviews?: any[];
  badges?: any[];
  gallery?: any[];
  pets?: any[];
  ownerProfile?: any[];
  houseGuide?: any[];
}

const GLOBAL = "__GUARDIENS_SIT__";
export const SIT_PREFETCH_MAX_AGE_MS = 60_000;
const WAVE: (keyof SitPrefetch)[] = ["owner", "property", "reviews", "badges", "gallery", "pets", "ownerProfile", "houseGuide"];

export function isSitPrefetch(v: unknown): v is SitPrefetch {
  if (!v || typeof v !== "object" || !Array.isArray((v as any).sit)) return false;
  // Annonce introuvable : seule la liste vide est lue.
  if ((v as any).sit.length === 0) return true;
  return WAVE.every((k) => Array.isArray((v as any)[k]));
}

export async function takeSitPrefetch(param: string | undefined, eligible: boolean): Promise<SitPrefetch | null> {
  if (typeof window === "undefined" || !param) return null;
  const w = window as any;
  const slot = w[GLOBAL];
  if (!slot) return null;
  w[GLOBAL] = null;
  if (!eligible || slot.param !== param || typeof slot.at !== "number" || Date.now() - slot.at > SIT_PREFETCH_MAX_AGE_MS) return null;
  try {
    const v = await slot.p;
    return isSitPrefetch(v) ? v : null;
  } catch {
    return null;
  }
}
