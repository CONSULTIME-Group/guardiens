/**
 * Localisation affichée d'une annonce de garde (lot L1, 07/10/2026).
 *
 * Règle unique, partagée par la fiche (publique et connectée), les cartes de
 * liste, l'aperçu de partage, les métadonnées et Alma :
 *  1. la commune de l'annonce (sits.city) ;
 *  2. sinon la ville du profil du propriétaire ;
 *  3. sinon « {code postal}, {nom du département} » (69380, Rhône) ;
 *  4. sinon un libellé neutre, jamais une chaîne vide ni « null ».
 *
 * Interdiction de déduire une commune d'un code postal : un code postal
 * couvre souvent plusieurs communes (69380 en couvre plus de dix).
 *
 * Copie stricte côté fonctions Edge : supabase/functions/_shared/sit-location.ts.
 * Toute modification doit être reportée.
 */

export const SIT_LOCATION_UNKNOWN = "Commune à préciser";

export interface SitLocationInput {
  sitCity?: string | null;
  ownerCity?: string | null;
  postalCode?: string | null;
  departementName?: string | null;
}

const clean = (v: unknown): string => {
  if (typeof v !== "string") return "";
  const t = v.trim();
  return t && t.toLowerCase() !== "null" && t.toLowerCase() !== "undefined" ? t : "";
};

/** Commune réelle (annonce puis profil), chaîne vide si aucune. */
export const sitCommune = (i: SitLocationInput): string => clean(i.sitCity) || clean(i.ownerCity);

export const sitLocationLabel = (i: SitLocationInput): string => {
  const commune = sitCommune(i);
  if (commune) return commune;
  const postal = clean(i.postalCode);
  const dept = clean(i.departementName);
  if (postal && dept) return `${postal}, ${dept}`;
  return postal || dept || SIT_LOCATION_UNKNOWN;
};

/** Code département déduit d'un code postal (97x et 98x sur trois chiffres). */
export const deptCodeFromPostal = (postal?: string | null): string | null => {
  const p = clean(postal);
  if (!/^\d{5}$/.test(p)) return null;
  return p.startsWith("97") || p.startsWith("98") ? p.slice(0, 3) : p.slice(0, 2);
};
