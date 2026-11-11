// Lot SEC3 (11/11/2026, revue sécurité) : entrées et sorties de
// generate-location-profile. La ville et le code postal viennent du
// navigateur d'un membre, partent dans le prompt, et la fiche générée est
// enregistrée puis resservie à tous pour ce code postal. Ce module borne ce
// qui entre et nettoie ce qui est enregistré. Aucune dépendance Deno.

export const CITY_MAX_LENGTH = 80;
export const FIELD_MAX_LENGTH = 600;

// France (5 chiffres), Belgique (4 chiffres), Canada (G0M 1W0), autres pays :
// lettres, chiffres, espaces et traits d'union, 3 à 10 signes.
const POSTAL_CODE_RE = /^[A-Z0-9][A-Z0-9 -]{1,8}[A-Z0-9]$/;
// Nom de lieu : lettres de toute langue, chiffres, espaces, apostrophes,
// points, virgules, parenthèses, barres obliques et traits d'union.
const CITY_RE = /^[\p{L}\p{M}0-9 '’.,()/-]+$/u;

export type LocationInput = { city: string; postalCode: string };

export function parseLocationInput(city: unknown, postalCode: unknown): LocationInput | null {
  if (typeof city !== "string" || typeof postalCode !== "string") return null;
  // Saut de ligne ou caractère de contrôle : jamais dans un nom de lieu.
  if (/[\u0000-\u001f\u007f]/.test(city) || /[\u0000-\u001f\u007f]/.test(postalCode)) return null;
  const cleanCity = city.trim().replace(/\s+/g, " ");
  const cleanPostal = postalCode.trim().replace(/\s+/g, " ").toUpperCase();
  if (cleanCity.length < 2 || cleanCity.length > CITY_MAX_LENGTH) return null;
  if (!CITY_RE.test(cleanCity)) return null;
  if (!/\p{L}/u.test(cleanCity)) return null;
  if (!POSTAL_CODE_RE.test(cleanPostal)) return null;
  return { city: cleanCity, postalCode: cleanPostal };
}

// Texte enregistré : texte simple, sans balise ni lien, longueur bornée.
export function cleanProfileField(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FIELD_MAX_LENGTH);
}
