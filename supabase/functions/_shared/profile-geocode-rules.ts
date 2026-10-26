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
