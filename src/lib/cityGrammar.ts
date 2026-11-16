/**
 * Lot VIL3 (16/11/2026) : prépositions devant un nom de ville, pour les
 * pages villes v2. « à Évreux », « au Havre », « aux Sables-d'Olonne » ;
 * « d'Évreux », « du Havre », « des Sables-d'Olonne », « de La Rochelle ».
 *
 * Élision devant une voyelle, et devant un h muet seulement pour les villes
 * listées : un h aspiré garde « de » (Hazebrouck, Haguenau).
 */

const H_MUET = new Set(["hyères", "hérouville-saint-clair", "hénin-beaumont", "hendaye", "houilles"]);

function startsWithVowelSound(city: string): boolean {
  if (/^[aeiouyàâäéèêëîïôöûüœ]/i.test(city)) return true;
  return H_MUET.has(city.toLowerCase());
}

/** « à Lyon », « au Havre », « au Mans », « aux Sables-d'Olonne », « à La Rochelle ». */
export function cityAt(city: string): string {
  if (/^Le /.test(city)) return `au ${city.slice(3)}`;
  if (/^Les /.test(city)) return `aux ${city.slice(4)}`;
  return `à ${city}`;
}

/** « de Lyon », « d'Évreux », « du Havre », « des Sables-d'Olonne », « de La Rochelle ». */
export function cityOf(city: string): string {
  if (/^Le /.test(city)) return `du ${city.slice(3)}`;
  if (/^Les /.test(city)) return `des ${city.slice(4)}`;
  return startsWithVowelSound(city) ? `d'${city}` : `de ${city}`;
}
