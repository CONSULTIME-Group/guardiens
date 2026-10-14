/**
 * Guides locaux : lieux affichés (lots GL2 et GL3, 13/10/2026).
 *
 * Règles :
 * - un guide sourcé (`places_sourced_at` renseigné) ou situé hors de France
 *   n'affiche que des lieux avec une source (`source_url`), plus, pour les
 *   guides refondus à la main (src/data/guideOverrides.ts), les lieux de leur
 *   sélection ; un lieu sourcé qui porte le nom d'un lieu de la sélection
 *   n'est pas répété ;
 * - un guide français pas encore sourcé garde son affichage jusqu'à son
 *   passage : aucun guide ne se vide pendant le rattrapage ;
 * - quand le centre du guide est connu, tout lieu situé au-delà du rayon
 *   maximal de sa catégorie (plus 2 km) est écarté, sourcé ou non : 52 km en
 *   général, 82 km pour un vétérinaire (zone rurale, décision du 14/10/2026).
 *
 * Les liens et distances viennent du module partagé avec les fonctions
 * serveur (supabase/functions/_shared/guide-places/source.ts).
 */
import { CATEGORY_RULES, haversineM, normName } from "../../supabase/functions/_shared/guide-places/source.ts";

export {
  directionsUrl,
  googlePlaceUrl,
  formatDistance,
  countryLabel,
} from "../../supabase/functions/_shared/guide-places/source.ts";

/** Rayon maximal d'un guide (50 km) et marge du centre d'une forêt ou d'un sentier. */
export const GUIDE_MAX_KM = 52;

/** Distance maximale affichée pour une catégorie : son rayon maximal plus 2 km, au moins 52 km. */
export function guideMaxKmFor(category: string): number {
  const rule = (CATEGORY_RULES as Record<string, { maxRadius: number }>)[category];
  return Math.max(GUIDE_MAX_KM, rule ? rule.maxRadius / 1000 + 2 : GUIDE_MAX_KM);
}

export interface VisiblePlaceInput {
  id: string;
  category: string;
  name: string;
  source_url?: string | null;
  distance_km?: number | string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface VisibleGuideInput {
  places_sourced_at?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function visibleGuidePlaces<T extends VisiblePlaceInput>(
  places: T[],
  guide: VisibleGuideInput | null | undefined,
  curatedIds?: Set<string> | null,
): T[] {
  const abroad = Boolean(guide?.country) && guide!.country!.toUpperCase() !== "FR";
  const sourcedMode = Boolean(guide?.places_sourced_at) || abroad;
  const isCurated = (p: T) => Boolean(curatedIds?.has(p.id));
  const curatedNames = new Set(places.filter(isCurated).map((p) => normName(p.name)));

  let kept = sourcedMode
    ? places.filter((p) => isCurated(p) || (Boolean(p.source_url) && !curatedNames.has(normName(p.name))))
    : curatedIds
      ? places.filter(isCurated)
      : places;

  const cLat = guide?.latitude;
  const cLon = guide?.longitude;
  if (cLat != null && cLon != null) {
    kept = kept.filter(
      (p) =>
        p.latitude == null ||
        p.longitude == null ||
        haversineM(cLat, cLon, p.latitude, p.longitude) <= guideMaxKmFor(p.category) * 1000,
    );
  }

  if (!sourcedMode) return kept;
  // Plus proche d'abord dans chaque catégorie, l'ordre des catégories reste celui de la base.
  const dist = (p: T) => {
    if (p.distance_km === null || p.distance_km === undefined || p.distance_km === "") return Number.POSITIVE_INFINITY;
    const d = Number(p.distance_km);
    return Number.isFinite(d) ? d : Number.POSITIVE_INFINITY;
  };
  const order = new Map<string, number>();
  for (const p of kept) if (!order.has(p.category)) order.set(p.category, order.size);
  return [...kept].sort(
    (a, b) =>
      order.get(a.category)! - order.get(b.category)! || dist(a) - dist(b) || a.name.localeCompare(b.name),
  );
}
