/**
 * Lot P4 : sélections pures du vivier de gardiens de l'espace propriétaire.
 *
 * Extraites de useOwnerTopAffinitySitters (« Pour vous ») et de
 * useNearbyOwnerSitters (« Près de chez vous »), à l'identique : la
 * lecture groupée de dashboardShared (fetchOwnerSpaceSitterReads) calcule
 * les MÊMES identifiants que les deux blocs, avant eux, pour tout lire en
 * une salve. Aucune logique de tri ni de filtre n'est modifiée.
 */
import { haversineDistance } from "@/utils/geo";

/**
 * Plafond de scoring : au-delà, les gardiens les plus éloignés ne sont pas
 * scorés (coût de calcul). Tri par distance AVANT plafonnement, nombre
 * écarté tracé, jamais silencieux.
 */
export const POOL_SCORING_CAP = 600;

type Coords = { latitude?: number | null; longitude?: number | null } | null | undefined;

/** « Pour vous » : distances, tri par distance puis identité, plafond. */
export function scopeOwnerPoolByDistance(pool: any[], me: Coords) {
  const meLat = (me?.latitude as number | null) ?? null;
  const meLng = (me?.longitude as number | null) ?? null;
  const hasGeo = meLat !== null && meLng !== null;
  const withDistance = pool.map((p: any) => {
    let distance_km: number | null = null;
    if (hasGeo && p.latitude_approx != null && p.longitude_approx != null) {
      distance_km = haversineDistance(
        { lat: meLat!, lng: meLng! },
        { lat: p.latitude_approx, lng: p.longitude_approx },
      );
    }
    return { ...p, distance_km };
  });
  const byDistance = [...withDistance].sort((a, b) => {
    const da = a.distance_km ?? Number.POSITIVE_INFINITY;
    const db = b.distance_km ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    // Sans coordonnées à départager, l'identité vérifiée d'abord.
    return Number(b.identity_verified === true) - Number(a.identity_verified === true);
  });
  const scoped = byDistance.slice(0, POOL_SCORING_CAP);
  return { hasGeo, byDistance, scoped, excludedByCap: byDistance.length - scoped.length };
}

const RADIUS_STEPS = [30, 50, 100];
/**
 * Nombre de candidats enrichis (notes, compétences, affinité) après tri.
 * Quatre fois le Top 6 : marge pour que le départage par note, dernier
 * critère de la chaîne, ne puisse pas changer le Top 6.
 */
export const NEARBY_ENRICH_CAP = 24;

export type NearbyBase = {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  identity_verified: boolean;
  completed_sits_count: number;
  skill_categories: string[];
  custom_skills: string[];
  distance_km: number | null;
  is_beyond: boolean;
  avg_rating: number | null;
  affinity_input: any;
};

export function normalizeCustomSkills(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const obj = item as { status?: string; label?: string };
          const status = typeof obj.status === "string" ? obj.status : "approved";
          const label = typeof obj.label === "string" ? obj.label : "";
          return status === "approved" ? label.trim() : "";
        }
        return "";
      })
      .filter((s) => s.length > 0);
  }
  return [];
}

export function sortNearbyByDistance<T extends NearbyBase>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const da = a.distance_km ?? Infinity;
    const db = b.distance_km ?? Infinity;
    if (da !== db) return da - db;
    if (a.identity_verified !== b.identity_verified) return a.identity_verified ? -1 : 1;
    if (a.completed_sits_count !== b.completed_sits_count) return b.completed_sits_count - a.completed_sits_count;
    return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
  });
}

/** « Près de chez vous » : paliers de rayon, filet `is_beyond`, candidats enrichis. */
export function selectNearbyCandidates(pool: any[], me: Coords) {
  const meLat: number | null = (me?.latitude as number | null) ?? null;
  const meLng: number | null = (me?.longitude as number | null) ?? null;
  const hasGeo = meLat !== null && meLng !== null;

  const enriched: NearbyBase[] = pool.map((p: any) => {
    const distance_km =
      hasGeo && p.latitude_approx != null && p.longitude_approx != null
        ? haversineDistance({ lat: meLat!, lng: meLng! }, { lat: p.latitude_approx, lng: p.longitude_approx })
        : null;
    return {
      id: p.id,
      first_name: p.first_name,
      avatar_url: p.avatar_url,
      city: p.city,
      identity_verified: !!p.identity_verified,
      completed_sits_count: p.completed_sits_count || 0,
      skill_categories: p.skill_categories || [],
      custom_skills: normalizeCustomSkills(p.custom_skills),
      distance_km,
      is_beyond: false,
      avg_rating: null,
      affinity_input: null,
    };
  });

  let selection: NearbyBase[];
  let radiusUsed: number | null = null;
  let totalCount: number;
  let beyond = false;
  if (!hasGeo) {
    selection = sortNearbyByDistance(enriched);
    totalCount = enriched.length;
  } else {
    const withDistance = enriched.filter((h) => h.distance_km !== null);
    const step = RADIUS_STEPS.map((radius) => ({
      radius,
      inRange: withDistance.filter((h) => h.distance_km! <= radius),
    })).find((s) => s.inRange.length >= 3);
    if (step) {
      selection = sortNearbyByDistance(step.inRange);
      radiusUsed = step.radius;
      totalCount = step.inRange.length;
    } else {
      selection = sortNearbyByDistance(withDistance);
      totalCount = withDistance.length;
      beyond = true;
    }
  }
  return { hasGeo, radiusUsed, totalCount, beyond, candidates: selection.slice(0, NEARBY_ENRICH_CAP) };
}
