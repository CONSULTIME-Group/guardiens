/**
 * Logique pure de la page Entraide : distance depuis l'origine, tri des
 * besoins et des personnes, seuil du secteur, sélection paginée.
 * Aucune dépendance React, aucune requête : tout est testable directement.
 */
import { haversineDistance } from "@/lib/geocode";
import { missionCategoryLabel } from "@/lib/missionCategories";

/** Au-delà de cette distance, le secteur du membre est considéré comme calme. */
export const NEARBY_THRESHOLD_KM = 30;
/** Nombre de personnes disponibles affichées par palier. */
export const HELPERS_PAGE_SIZE = 12;

export type Origin = [number, number] | null;

export const distanceFrom = (origin: Origin, lat: number | null, lng: number | null): number | null =>
  origin && lat !== null && lng !== null ? haversineDistance(origin[0], origin[1], lat, lng) : null;

const byDistance = <T>(items: T[], distance: (item: T) => number | null): T[] =>
  [...items].sort((a, b) => {
    const aDistance = distance(a);
    const bDistance = distance(b);
    if (aDistance === null) return bDistance === null ? 0 : 1;
    if (bDistance === null) return -1;
    return aDistance - bDistance;
  });

export const sortByDistance = byDistance;

/** Distance du besoin le plus proche, ou null si aucune distance connue. */
export const nearestDistanceKm = (distances: (number | null)[]): number | null => {
  const known = distances.filter((value): value is number => value !== null);
  return known.length > 0 ? Math.min(...known) : null;
};

/**
 * Le secteur est calme quand une origine est connue et que le besoin le plus
 * proche dépasse le seuil, ou qu'aucun besoin situé n'existe.
 */
export const isSectorQuiet = (origin: Origin, nearest: number | null, needCount: number): boolean => {
  if (!origin) return false;
  if (needCount === 0) return true;
  return nearest === null ? false : nearest > NEARBY_THRESHOLD_KM;
};

/** Initiale de la catégorie, pour la pastille de vignette. */
export const categoryInitial = (category: string | null | undefined): string =>
  missionCategoryLabel(category).charAt(0).toLocaleUpperCase("fr");

/** Sous-titre du membre connecté, ville du profil et distance la plus proche. */
export const memberSubtitle = (city: string | null, nearest: number | null): string | null => {
  if (!city) return null;
  if (nearest === null) return `Autour de ${city}.`;
  return `Autour de ${city}. Le plus proche est à ${Math.round(nearest)} km.`;
};
