/**
 * Lot G1 : quand et comment situer un profil.
 *
 * Constat du 26/10/2026 : 36 profils français à code postal sans coordonnées,
 * dont 28 sans ville (la mise à jour s'arrêtait sur « no city ») et un échec
 * passager jamais rattrapé (Clarensac, annonce publiée). Règles :
 * - ville renseignée : comme avant (BAN, puis Nominatim, puis Photon) ;
 * - ville vide, code postal français valide : centre de la commune la plus
 *   peuplée du code postal (base officielle des communes) ;
 * - rattrapage quotidien des profils restés sans position, modifiés depuis
 *   plus d'une heure et moins de 7 jours : un échec passager se rattrape,
 *   une saisie fausse s'arrête seule au bout de 7 jours.
 */

export type ProfilePlace = { city?: string | null; postal_code?: string | null; country?: string | null };

export type GeocodePlan =
  | { kind: "city"; city: string; postal: string; country: string; isFR: boolean }
  | { kind: "postal"; postal: string }
  | { kind: "none"; reason: "no_place" | "no_city_foreign" };

/** Code postal français plausible : cinq chiffres, jamais « 00000 ». */
export function isFrPostalCode(value: string | null | undefined): boolean {
  const v = (value ?? "").replace(/\s/g, "");
  return /^\d{5}$/.test(v) && v !== "00000";
}

export function isFranceCountry(country: string | null | undefined): boolean {
  const c = (country ?? "FR").trim().toLowerCase();
  return c === "" || c === "fr" || c === "france";
}

export function planProfileGeocode(p: ProfilePlace): GeocodePlan {
  const city = (p.city ?? "").trim();
  const postal = (p.postal_code ?? "").replace(/\s/g, "");
  const country = (p.country ?? "FR").trim() || "FR";
  const isFR = isFranceCountry(country);
  if (city) return { kind: "city", city, postal, country, isFR };
  if (isFR && isFrPostalCode(postal)) return { kind: "postal", postal };
  return { kind: "none", reason: isFR ? "no_place" : "no_city_foreign" };
}

/** Fenêtre du rattrapage quotidien. */
export const BACKFILL_MIN_AGE_MS = 60 * 60 * 1000;
export const BACKFILL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const BACKFILL_LIMIT = 40;

export function backfillWindow(now: Date): { updatedAfter: string; updatedBefore: string } {
  return {
    updatedAfter: new Date(now.getTime() - BACKFILL_MAX_AGE_MS).toISOString(),
    updatedBefore: new Date(now.getTime() - BACKFILL_MIN_AGE_MS).toISOString(),
  };
}

/** Un profil sans position que le rattrapage peut tenter. */
export function isBackfillCandidate(p: ProfilePlace & { latitude?: number | null; longitude?: number | null }): boolean {
  if (p.latitude != null && p.longitude != null) return false;
  return planProfileGeocode(p).kind !== "none";
}

/**
 * Lot G2 : un lieu étranger n'apparaît jamais en France.
 *
 * Constat du 26/10/2026 (comptes actifs) : 26 profils au pays étranger avaient
 * un département français tiré de leur code postal (Tübingen 72076 dans la
 * Sarthe, Rio de Janeiro 13000 dans les Bouches-du-Rhône), 9 profils au pays
 * étranger avaient un point en France (centre de commune posé par le formulaire
 * avant le passage « Je vis à l'étranger »), et des profils au pays France
 * portaient une ville étrangère (Casablanca 20220, Bruxelles 01180).
 * Un contrôle strict ville / code postal écartait 57 vrais habitants
 * (Cherbourg 50100, Évian 74500, Lyon 69100) : il n'est pas appliqué seul.
 */

export type PlaceStatus = "country_mismatch" | "foreign_city";

/** Pays du périmètre français (outre-mer compris), même liste que les compteurs départementaux. */
export const FRENCH_SCOPE_COUNTRIES = ["FR", "PF", "NC", "RE", "GP", "MQ", "GF", "YT", "PM", "WF", "BL", "MF", "TF"];

export function isFrenchScopeCountry(country: string | null | undefined): boolean {
  const c = (country ?? "").trim().toUpperCase();
  return c === "" || c === "FRANCE" || FRENCH_SCOPE_COUNTRIES.includes(c);
}

/**
 * Cadre large autour de la métropole et de la Corse : seul un point dans ce
 * cadre est soumis à la question « commune française ? » (pointIsInFrance).
 * Il déborde sur la Belgique, la Suisse, l'Allemagne et l'Espagne : il ne
 * décide jamais seul.
 */
export function isNearMetropolitanFrance(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= 41.3 && lat <= 51.2 && lng >= -5.3 && lng <= 9.7;
}

const norm = (v: string) => v
  .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, " ").trim()
  .replace(/(^| )st(e?)( |$)/g, " saint$2 ").replace(/\s+/g, " ").trim();

/**
 * La ville saisie est-elle une commune du code postal ? Accents, casse, tirets
 * et « St » ignorés ; « Lyon 3e », « Paris 15 », « Marseille 13e arrondissement »
 * acceptés pour la commune « Lyon », « Paris », « Marseille ».
 */
export function cityMatchesCommunes(city: string, communes: string[]): boolean {
  const c = norm(city);
  if (!c) return false;
  return communes.some((nom) => {
    const n = norm(nom);
    if (!n) return false;
    if (n === c) return true;
    return c.startsWith(n + " ") && /^(\d+( ?(e|er|eme))?( arrondissement)?|cedex.*)$/.test(c.slice(n.length + 1));
  });
}

/**
 * Décision pour un profil dont le pays est hors du périmètre français : un point
 * situé dans une commune française (inFrance, lu par pointIsInFrance) est
 * refusé (country_mismatch) ; un point ailleurs est gardé ; sans réponse du
 * service (inFrance null), rien n'est décidé.
 */
export function foreignPointDecision(
  country: string | null | undefined,
  inFrance: boolean | null,
): "keep" | "reject" | "not_applicable" {
  if (isFrenchScopeCountry(country)) return "not_applicable";
  return inFrance === true ? "reject" : "keep";
}
