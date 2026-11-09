/**
 * Lot perf 19c (09/11/2026, décision de Jérémie) : sous un rayon qui compte
 * moins de 3 gardes ouvertes, la recherche montre les gardes ouvertes les plus
 * proches hors du rayon, dans une section à part. Ce n'est pas un
 * élargissement de zone : zone, rayon, adresse, compteurs et alertes restent
 * ceux du membre.
 *
 * Module pur : calcul sur les annonces et coordonnées déjà en mémoire, sans
 * lecture ni géocodage. Une garde sans coordonnées situées est écartée.
 */
import { haversineDistance } from "@/lib/geocode";
import { getRegionCode } from "@/lib/regions";

export type NearestTier = "dept" | "region" | "france";

export const NEAREST_TIER_LABELS: Record<NearestTier, string> = {
  dept: "Dans votre département",
  region: "Dans la même région",
  france: "Ailleurs en France",
};

/** Moins de gardes ouvertes que ce seuil dans le rayon : la section s'affiche. */
export const NEAREST_OUTSIDE_THRESHOLD = 3;
/** Cartes affichées au plus. */
export const NEAREST_OUTSIDE_SHOWN = 6;

export interface NearestOutside<T> {
  sit: T;
  tier: NearestTier;
  distanceKm: number;
}

export function pickNearestOutside<T>(
  open: readonly T[],
  coordsOf: (s: T) => { lat: number; lng: number } | null,
  deptOf: (s: T) => string | null | undefined,
  point: { lat: number; lng: number },
  radiusKm: number,
  refDept: string | null,
  limit = NEAREST_OUTSIDE_SHOWN,
): NearestOutside<T>[] {
  // Outre-mer : la table des régions regroupe tous les 97x sous « DOM », qui
  // n'est pas une région de voisinage (La Réunion et la Guadeloupe).
  const refRegion = refDept && refDept.startsWith("97") ? null : getRegionCode(refDept);
  const out: (NearestOutside<T> & { raw: number })[] = [];
  for (const s of open) {
    const co = coordsOf(s);
    if (!co) continue;
    const d = haversineDistance(point.lat, point.lng, co.lat, co.lng);
    if (!Number.isFinite(d) || d <= radiusKm) continue;
    const dept = deptOf(s) ?? null;
    const tier: NearestTier = refDept && dept === refDept
      ? "dept"
      : refRegion && dept && getRegionCode(dept) === refRegion ? "region" : "france";
    out.push({ sit: s, tier, distanceKm: Math.round(d), raw: d });
  }
  out.sort((a, b) => a.raw - b.raw);
  return out.slice(0, Math.max(0, limit)).map(({ raw: _raw, ...rest }) => rest);
}
