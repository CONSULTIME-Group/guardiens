/**
 * Lot PAYS1 (24/11/2026) : un membre qui choisit « Je vis hors de France »
 * puis saisit une ville et un code postal français est un résident en France
 * rangé dans un autre pays (Ecully en Belgique, Rezé au Royaume-Uni). Module
 * pur : décide, à partir des réponses de geo.api.gouv.fr, si le lieu saisi
 * désigne une commune française. Complète le lot G2, qui retire après coup
 * le point d'un tel profil et l'avertit sur son profil : ici, la saisie se
 * corrige dès l'inscription. La ville doit correspondre : un code étranger
 * à 5 chiffres (Huesca 22005, Barika 06400) ne déclenche rien.
 */

import { cityMatchesCommunes } from "../../supabase/functions/_shared/profile-geocode-rules.ts";

export interface FrenchCommune {
  nom: string;
  codesPostaux?: string[];
}

export interface FrenchPlaceMatch {
  /** Nom officiel de la commune. */
  city: string;
  /** Code postal à garder : celui saisi s'il appartient à la commune, sinon le premier de la commune. */
  postalCode: string;
}

/** Minuscules, sans accents ni ponctuation, « Saint » et « St » confondus. */
export function placeKey(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\bst\b/g, "saint")
    .replace(/\bste\b/g, "sainte")
    .replace(/[^a-z0-9]/g, "");
}

export const isFrenchPostalShape = (postalCode: string | null | undefined): boolean =>
  /^\d{5}$/.test((postalCode ?? "").trim());

/** Département à chercher pour un code postal métropolitain ; null pour l'outre-mer et la Corse. */
export function departmentPrefix(postalCode: string): string | null {
  const p = postalCode.trim();
  if (!isFrenchPostalShape(p) || p.startsWith("20") || p.startsWith("97") || p.startsWith("98")) return null;
  return p.slice(0, 2);
}

/**
 * Commune française désignée par la saisie, ou null. `byPostal` : communes du
 * code postal saisi ; `byName` : communes du département du code qui portent
 * ce nom (pour un code inexact comme 69000 à Écully).
 */
export function matchFrenchPlace(
  city: string,
  postalCode: string,
  byPostal: FrenchCommune[],
  byName: FrenchCommune[] = [],
): FrenchPlaceMatch | null {
  const key = placeKey(city);
  const code = postalCode.trim();
  if (key.length < 2 || !isFrenchPostalShape(code)) return null;
  // Même règle que le lot G2 (geocode-profile) : accents, « St », arrondissements (« Marseille 7e »).
  const same = (c: FrenchCommune) => placeKey(c.nom) === key || cityMatchesCommunes(city, [c.nom]);
  const direct = byPostal.find(same);
  if (direct) return { city: direct.nom, postalCode: code };
  const named = byName.find(same);
  if (named) {
    const codes = named.codesPostaux ?? [];
    return { city: named.nom, postalCode: codes.includes(code) ? code : codes[0] ?? code };
  }
  return null;
}
