/**
 * Règles uniques du moteur d'annonces (lot L1, 10/10/2026).
 *
 * Partagées par la recherche (SearchSitter), /annonces, /annonces/international,
 * la vitrine internationale et le compteur de la page d'accueil, pour que tous
 * les compteurs portent sur la même population.
 *
 *  - Ouverte : publiée, candidatures acceptées, fin >= aujourd'hui (Europe/Paris,
 *    date de fin incluse) ou fin non renseignée.
 *  - France : country === "FR" strictement. Un pays absent n'est pas la France.
 *  - Lieu de garde : commune et pays de l'annonce (sits.city, sits.country),
 *    département de l'annonce (sits.departement_code). Jamais la ville du
 *    profil propriétaire pour situer ou mesurer une distance.
 */
import { deptCodeFromPostal } from "@/lib/sitLocation";

/** Date du jour à Paris, AAAA-MM-JJ. */
export function parisTodayIso(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const isFranceSit = (s: { country?: string | null }): boolean =>
  (s.country ?? "").trim().toUpperCase() === "FR";

export const isOpenSit = (
  s: { status?: string | null; accepting_applications?: boolean | null; end_date?: string | null },
  today: string,
): boolean =>
  s.status === "published" &&
  s.accepting_applications !== false &&
  (!s.end_date || s.end_date.slice(0, 10) >= today);

/** Fin passée (date de fin strictement avant aujourd'hui à Paris). */
export const isEndedSit = (s: { end_date?: string | null }, today: string): boolean =>
  !!s.end_date && s.end_date.slice(0, 10) < today;

/** Filtre serveur équivalent à isOpenSit, pour les comptages exacts. */
export function applyOpenSitFilter<Q extends { eq: any; or: any }>(q: Q, today: string = parisTodayIso()): Q {
  return q
    .eq("status", "published")
    .eq("accepting_applications", true)
    .or(`end_date.is.null,end_date.gte.${today}`) as Q;
}

export interface SitPlaceInput {
  city?: string | null;
  country?: string | null;
  departement_code?: string | null;
  owner?: { postal_code?: string | null; country?: string | null } | null;
}

/** Clé de géocodage du lieu de garde, null si la commune manque. */
export function sitGeocodeKey(s: SitPlaceInput): { city: string; country: string | null } | null {
  const city = (s.city ?? "").trim();
  if (city.length < 2) return null;
  const country = (s.country ?? "").trim().toUpperCase() || null;
  return { city, country };
}

export const sitGeocodeKeyString = (s: SitPlaceInput): string | null => {
  const k = sitGeocodeKey(s);
  return k ? `${k.city.toLowerCase()}::${(k.country ?? "").toLowerCase()}` : null;
};

/**
 * Département du lieu de garde : celui de l'annonce, sinon celui déduit du code
 * postal du propriétaire, seulement en France (jamais pour un code étranger).
 */
export function sitDeptCode(s: SitPlaceInput): string | null {
  if (!isFranceSit(s)) return null;
  const own = (s.departement_code ?? "").trim();
  if (own) return own;
  return deptCodeFromPostal(s.owner?.postal_code ?? null);
}

/** Lecture paginée stable : pages de 1 000 jusqu'à la dernière page incomplète. */
export const SIT_POOL_PAGE = 1000;
const MAX_PAGES = 20;
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<{ rows: T[]; error: any; truncated: boolean }> {
  const rows: T[] = [];
  for (let p = 0; p < MAX_PAGES; p++) {
    const from = p * SIT_POOL_PAGE;
    const { data, error } = await page(from, from + SIT_POOL_PAGE - 1);
    if (error) return { rows, error, truncated: false };
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < SIT_POOL_PAGE) return { rows, error: null, truncated: false };
  }
  console.warn(`[sit-pool] ${MAX_PAGES} pages lues, jeu tronqué.`);
  return { rows, error: null, truncated: true };
}
