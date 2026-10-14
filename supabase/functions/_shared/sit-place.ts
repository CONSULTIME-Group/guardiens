/**
 * Lieu d'une garde et périmètre France, source unique (lot A5, audit Alma du
 * 14/10/2026 ; décision de Jérémie du 14/10/2026 : l'outre-mer suit la règle du
 * site). Partagé par le moteur d'annonces (src/lib/sitSearchRules.ts le
 * réexporte) et par Alma (_shared/alma-truth.ts) : la Polynésie française et
 * les territoires hors départements vont sur la page internationale, pour le
 * site comme pour Alma. Module pur, sans import.
 *
 *  - France : pays du lieu résolu === "FR" strictement. Un pays absent n'est
 *    pas la France.
 *  - Hors de France : pays du lieu résolu connu et différent de "FR" (règle de
 *    /annonces/international, src/lib/intlSitSearch.ts).
 *  - Lieu de garde : profil public du propriétaire (ville, pays, département
 *    ou code postal), repli sur l'annonce seulement si ville ou pays manque.
 */

/** Codes pays servis comme France. */
export const FRANCE_COUNTRY_CODES: readonly string[] = ["FR"];

export interface SitPlaceInput {
  city?: string | null;
  country?: string | null;
  departement_code?: string | null;
  owner?: {
    city?: string | null;
    postal_code?: string | null;
    country?: string | null;
    departement_code?: string | null;
  } | null;
}

export interface SitPlace {
  /** Commune retenue, null si aucune source n'en fournit. */
  city: string | null;
  /** Pays ISO retenu, null si inconnu (jamais déduit FR). */
  country: string | null;
  /** Département (France seulement), null si non fiable. */
  dept: string | null;
  /** owner = profil public du propriétaire ; sit = repli annonce ; none. */
  source: "owner" | "sit" | "none";
}

export const cleanPlaceText = (v: unknown): string => {
  if (typeof v !== "string") return "";
  const t = v.trim();
  const l = t.toLowerCase();
  return t && l !== "null" && l !== "undefined" ? t : "";
};

export const normDept = (d: string | null | undefined): string | null => {
  const v = (d ?? "").trim().toUpperCase();
  if (!v) return null;
  return /^\d$/.test(v) ? `0${v}` : v;
};

const deptFromPostalStrict = (postal: string | null | undefined): string | null => {
  const p = cleanPlaceText(postal);
  if (!/^\d{5}$/.test(p)) return null;
  return p.startsWith("97") || p.startsWith("98") ? p.slice(0, 3) : p.slice(0, 2);
};

/** Pays servi comme France (code ISO, casse et espaces ignorés). */
export function isFranceCountry(code: string | null | undefined): boolean {
  return FRANCE_COUNTRY_CODES.includes((code ?? "").trim().toUpperCase());
}

/**
 * Lieu de garde (décision Jérémie, 10/10/2026 : « la ville du proprio c'est la
 * base »). Source PRINCIPALE = profil public du propriétaire (ville + pays,
 * département ou code postal du même profil). Repli entier sur l'annonce
 * seulement si la localisation du propriétaire est incomplète (ville ou pays
 * absent). Les deux sources ne sont jamais mélangées : pas de département
 * d'annonce accolé à la ville du propriétaire, pas de pays FR déduit.
 */
export function resolveSitPlace(s: SitPlaceInput): SitPlace {
  const o = s.owner ?? null;
  const oCity = cleanPlaceText(o?.city);
  const oCountry = cleanPlaceText(o?.country).toUpperCase() || null;
  if (oCity) {
    const country = oCountry || cleanPlaceText(s.country).toUpperCase() || null;
    const dept = isFranceCountry(country) ? normDept(o?.departement_code) ?? deptFromPostalStrict(o?.postal_code) : null;
    return { city: oCity, country, dept, source: "owner" };
  }
  const sCity = cleanPlaceText(s.city);
  const sCountry = cleanPlaceText(s.country).toUpperCase() || null;
  if (sCity || sCountry) {
    const dept = isFranceCountry(sCountry) ? normDept(s.departement_code) : null;
    return { city: sCity || null, country: sCountry, dept, source: "sit" };
  }
  return { city: null, country: null, dept: null, source: "none" };
}

/** France stricte sur le lieu résolu (pays du propriétaire, sinon de l'annonce). */
export const isFrancePlace = (s: SitPlaceInput): boolean => isFranceCountry(resolveSitPlace(s).country);

/** Hors de France : pays connu et différent de la France (page internationale). */
export const isAbroadPlace = (s: SitPlaceInput): boolean => {
  const c = resolveSitPlace(s).country;
  return !!c && !isFranceCountry(c);
};
