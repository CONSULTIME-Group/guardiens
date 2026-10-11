/**
 * Lot E10 (11/10/2026) : un besoin n'est publié qu'avec un lieu situé.
 * Sans coordonnées, aucune vague ne part et personne n'est prévenu
 * (6 besoins sur 29 au 11/10/2026, base small_missions).
 * Ordre : centre de la commune choisie par le code postal (geo.api.gouv.fr),
 * puis le code postal seul, puis le nom de la commune, en France.
 */
export interface Coords { lat: number; lng: number }

export async function resolveMissionCoords(
  place: { fieldCoords: Coords | null; postalCode: string; city: string },
  geocode: (query: string, country: string) => Promise<Coords | null>,
): Promise<Coords | null> {
  if (place.fieldCoords) return place.fieldCoords;
  const postal = place.postalCode.trim();
  if (/^\d{5}$/.test(postal)) {
    const byPostal = await geocode(postal, "FR").catch(() => null);
    if (byPostal) return byPostal;
  }
  const city = place.city.trim();
  if (city.length >= 2) {
    const byCity = await geocode(city, "FR").catch(() => null);
    if (byCity) return byCity;
  }
  return null;
}

export const MISSION_PLACE_NOT_FOUND =
  "Indiquez le code postal à 5 chiffres de votre commune, puis choisissez-la dans la liste : votre besoin part alors vers les personnes disponibles les plus proches.";
