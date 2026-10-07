/**
 * Copie stricte de src/lib/sitLocation.ts (les fonctions Edge ne peuvent pas
 * importer src/). Toute modification doit être reportée des deux côtés.
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

export const sitCommune = (i: SitLocationInput): string => clean(i.sitCity) || clean(i.ownerCity);

export const sitLocationLabel = (i: SitLocationInput): string => {
  const commune = sitCommune(i);
  if (commune) return commune;
  const postal = clean(i.postalCode);
  const dept = clean(i.departementName);
  if (postal && dept) return `${postal}, ${dept}`;
  return postal || dept || SIT_LOCATION_UNKNOWN;
};

export const deptCodeFromPostal = (postal?: string | null): string | null => {
  const p = clean(postal);
  if (!/^\d{5}$/.test(p)) return null;
  return p.startsWith("97") || p.startsWith("98") ? p.slice(0, 3) : p.slice(0, 2);
};
