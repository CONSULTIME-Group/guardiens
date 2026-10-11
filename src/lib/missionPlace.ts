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
  postalLookup?: (postalCode: string, city: string) => Promise<Coords | null>,
): Promise<Coords | null> {
  if (place.fieldCoords) return place.fieldCoords;
  const postal = place.postalCode.trim();
  if (/^\d{5}$/.test(postal)) {
    // Annuaire officiel des communes (outre-mer compris), puis le géocodeur.
    const official = postalLookup ? await postalLookup(postal, place.city.trim()).catch(() => null) : null;
    if (official) return official;
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
  "Saisissez à nouveau le code postal de votre commune, puis choisissez-la si une liste s'affiche : votre besoin part alors vers les personnes disponibles les plus proches.";

/** Centre d'une commune par l'annuaire officiel (geo.api.gouv.fr), la commune nommée de préférence. */
export async function officialPostalCentre(postalCode: string, city: string): Promise<Coords | null> {
  const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(postalCode)}&fields=nom,centre&limit=20`);
  if (!res.ok) return null;
  const rows = (await res.json()) as { nom: string; centre?: { coordinates: [number, number] } }[];
  const fold = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const match = rows.find((row) => fold(row.nom) === fold(city)) ?? rows[0];
  if (!match?.centre?.coordinates) return null;
  const [lng, lat] = match.centre.coordinates;
  return { lat, lng };
}
