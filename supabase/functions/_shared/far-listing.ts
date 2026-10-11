// Lot Q1 (12/10/2026) : diffusion d'une garde lointaine.
//
// Constat : le 11/10/2026, la diffusion de l'annonce d'Andrée à Saint Ludger
// (Québec) était partie pour 538 gardiens en France avec l'objet « près de
// chez vous », « dans votre secteur » et « à environ 5 500 km de chez vous ».
//
// Règles :
// - Une garde est lointaine pour un gardien quand elle est à plus de
//   FAR_RECIPIENT_KM de chez lui, ou quand son lieu est inconnu et que le
//   propriétaire vit loin de la France métropolitaine.
// - Un rayon d'au moins NATIONWIDE_RADIUS_KM est une diffusion nationale :
//   tous les gardiens actifs sont visés, lieu renseigné ou non.
// - Une garde dont le propriétaire vit à plus de FAR_OWNER_FROM_FRANCE_KM
//   de Paris, diffusée à l'échelle nationale, lève la fenêtre de 7 jours des
//   diffusions de proximité : c'est une offre d'une autre nature, la
//   déduplication par annonce et le plafond du gabarit restent la garde.

export const FAR_RECIPIENT_KM = 200;
export const NATIONWIDE_RADIUS_KM = 1000;
export const FAR_OWNER_FROM_FRANCE_KM = 1500;

const PARIS = { lat: 48.8566, lon: 2.3522 };

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Le propriétaire vit loin de la France métropolitaine (Québec, outre-mer, Maroc…). */
export function isOwnerFarFromFrance(lat: number | null | undefined, lon: number | null | undefined): boolean {
  if (lat == null || lon == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return false;
  return haversineKm(PARIS.lat, PARIS.lon, Number(lat), Number(lon)) > FAR_OWNER_FROM_FRANCE_KM;
}

export function isNationwideRadius(radiusKm: number): boolean {
  return radiusKm >= NATIONWIDE_RADIUS_KM;
}

/** Texte « garde lointaine » pour ce gardien. */
export function isFarForRecipient(distanceKm: number | null | undefined, ownerFar: boolean): boolean {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return ownerFar;
  return distanceKm > FAR_RECIPIENT_KM;
}

/** Objet d'une garde lointaine, sans « près de chez vous ». */
export function farSubject(ownerFirstName: string | null | undefined, city: string | null | undefined): string {
  const who = (ownerFirstName ?? "").trim();
  const where = (city ?? "").trim();
  if (who && where) return `${who} cherche un gardien à ${where}`;
  if (where) return `Une garde à ${where}`;
  if (who) return `${who} cherche un gardien`;
  return "Une nouvelle garde à découvrir";
}
