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
 *  - Lieu de garde : profil public du propriétaire (ville, pays, département
 *    ou code postal), repli sur l'annonce seulement si ville ou pays manque.
 *    Voir resolveSitPlace. (Historique : la première version de L1 situait
 *    sur l'annonce, requalifiée par décision produit du 10/10/2026.)
 *  - Rayon : uniquement les annonces dont les coordonnées approximatives de la
 *    commune sont vérifiées et à une distance <= rayon. Aucune autre inclusion.
 */
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

export const isFranceSit = (s: { country?: string | null }): boolean => isFranceCountry(s.country);

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

/**
 * Annonce non ouverte (grisée, jamais comptée ouverte) : toute annonce qui
 * n'est pas ouverte au sens de isOpenSit, statuts confirmés/en cours exclus
 * (ils ont leur propre état « pourvue »).
 */
export const isPastSit = (
  s: { status?: string | null; accepting_applications?: boolean | null; end_date?: string | null; unpublished_at?: string | null },
  today: string,
): boolean => {
  if (s.status === "confirmed" || s.status === "in_progress") return false;
  return !isOpenSit(s, today);
};

/**
 * Filtre serveur strictement équivalent à isOpenSit : accepting_applications
 * IS NOT FALSE (true ou NULL acceptés, comme `!== false`), fin nulle ou >= aujourd'hui.
 */
export function applyOpenSitFilter<Q extends { eq: any; or: any; not: any }>(q: Q, today: string = parisTodayIso()): Q {
  return q
    .eq("status", "published")
    .not("accepting_applications", "is", false)
    .or(`end_date.is.null,end_date.gte.${today}`) as Q;
}

// Lot A5 (14/10/2026) : lieu de garde et règle France vivent dans un module
// partagé avec Alma (supabase/functions/_shared/sit-place.ts), réexporté ici
// sur le modèle de missionChildCare : une seule règle pour le site et Alma.
import { isFranceCountry, normDept, resolveSitPlace, type SitPlace, type SitPlaceInput } from "../../supabase/functions/_shared/sit-place";
export {
  FRANCE_COUNTRY_CODES,
  isAbroadPlace,
  isFranceCountry,
  isFrancePlace,
  resolveSitPlace,
  type SitPlace,
  type SitPlaceInput,
} from "../../supabase/functions/_shared/sit-place";

/** Clé de géocodage du lieu résolu, null si la commune manque. */
export function sitGeocodeKey(s: SitPlaceInput): { city: string; country: string | null } | null {
  const p = resolveSitPlace(s);
  if (!p.city || p.city.length < 2) return null;
  return { city: p.city, country: p.country };
}

export const sitGeocodeKeyString = (s: SitPlaceInput): string | null => {
  const k = sitGeocodeKey(s);
  return k ? `${k.city.toLowerCase()}::${(k.country ?? "").toLowerCase()}` : null;
};

export const sitDeptCode = (s: SitPlaceInput): string | null => resolveSitPlace(s).dept;

/**
 * Vérification d'un point géocodé (L1, Montreuil) : en France, quand le lieu
 * résolu porte un département, le point n'est retenu que si son département
 * (communeDeptFromCoords) est le même. Discordance ou vérification impossible :
 * le point est écarté (aucune distance, aucun rayon, « lieu à préciser »).
 * Sans département de référence, rien à comparer : point conservé.
 */
export type PointCheck = "verified" | "mismatch" | "unverifiable" | "not_applicable";
export function checkGeocodedPoint(place: Pick<SitPlace, "country" | "dept">, pointDept: string | null | undefined): PointCheck {
  if (!isFranceCountry(place.country) || !place.dept) return "not_applicable";
  const pd = normDept(pointDept);
  if (!pd) return "unverifiable";
  return pd === normDept(place.dept) ? "verified" : "mismatch";
}
export const pointUsable = (c: PointCheck): boolean => c === "verified" || c === "not_applicable";

/** Inclusion stricte dans un rayon : coordonnées vérifiées et distance <= rayon. */
export function isWithinRadius(distanceKm: number | null | undefined, radiusKm: number): boolean {
  return typeof distanceKm === "number" && Number.isFinite(distanceKm) && distanceKm <= radiusKm;
}

/**
 * Département d'un point (centre approximatif d'une commune française), par
 * geo.api.gouv.fr. Mis en cache pour la session ; null si inconnu ou en erreur
 * (aucune incohérence n'est alors déclarée).
 */
const communeDeptCache = new Map<string, Promise<string | null>>();
// Lot H3 : départements trouvés gardés 30 jours dans le navigateur (jamais un
// échec), pour qu'une visite suivante ne refasse aucun appel.
const COMMUNE_DEPT_KEY = "guardiens_commune_dept_v1";
const COMMUNE_DEPT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
let communeDeptStore: Record<string, { d: string; t: number }> | null = null;
function readCommuneDeptStore(): Record<string, { d: string; t: number }> {
  if (communeDeptStore) return communeDeptStore;
  communeDeptStore = {};
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(COMMUNE_DEPT_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : null;
    const now = Date.now();
    if (parsed && typeof parsed === "object") {
      for (const [k, v] of Object.entries(parsed as Record<string, { d: string; t: number }>)) {
        if (v && typeof v.d === "string" && now - (v.t || 0) < COMMUNE_DEPT_TTL_MS) communeDeptStore[k] = v;
      }
    }
  } catch { /* stockage illisible : cache vide */ }
  return communeDeptStore;
}
function rememberCommuneDept(key: string, dept: string) {
  const store = readCommuneDeptStore();
  store[key] = { d: dept, t: Date.now() };
  try {
    const entries = Object.entries(store).sort((a, b) => b[1].t - a[1].t).slice(0, 600);
    localStorage.setItem(COMMUNE_DEPT_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* stockage plein ou bloqué : cache de session seul */ }
}
// Lot perf 1 : 4 vérifications de département simultanées au plus, pour
// laisser la bande passante d'un téléphone aux lectures et aux photos.
export const COMMUNE_DEPT_MAX_CONCURRENT = 4;
let communeActive = 0;
const communeQueue: Array<() => void> = [];
function acquireCommuneSlot(): Promise<void> {
  if (communeActive < COMMUNE_DEPT_MAX_CONCURRENT) { communeActive++; return Promise.resolve(); }
  return new Promise((resolve) => communeQueue.push(() => { communeActive++; resolve(); }));
}
function releaseCommuneSlot() {
  communeActive--;
  communeQueue.shift()?.();
}
export function communeDeptFromCoords(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = communeDeptCache.get(key);
  if (hit) return hit;
  const stored = readCommuneDeptStore()[key];
  if (stored) {
    const p = Promise.resolve(stored.d);
    communeDeptCache.set(key, p);
    return p;
  }
  const p = (async () => {
    await acquireCommuneSlot();
    try {
      const r = await fetch(`https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}&fields=codeDepartement&format=json`, {
        signal: typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(5000) : undefined,
      });
      if (!r.ok) return null;
      const data = await r.json();
      const dept = Array.isArray(data) && data[0]?.codeDepartement ? String(data[0].codeDepartement) : null;
      if (dept) rememberCommuneDept(key, dept);
      return dept;
    } catch {
      return null;
    } finally {
      releaseCommuneSlot();
    }
  })();
  communeDeptCache.set(key, p);
  return p;
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

/**
 * Lecture `.in()` découpée : paquets de `chunkSize` identifiants (URL courte),
 * chaque paquet lu par pages de 1 000 (aucune borne PostgREST silencieuse).
 * `build(chunk)` doit renvoyer une requête triée sur une colonne unique.
 */
export async function fetchInChunks<T>(
  ids: string[],
  build: (chunk: string[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  chunkSize = 150,
): Promise<{ data: T[]; error: any; truncated: boolean }> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const out: T[] = [];
  let truncated = false;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const res = await fetchAllPages<T>((from, to) => build(chunk, from, to));
    if (res.error) return { data: out, error: res.error, truncated };
    out.push(...res.rows);
    truncated = truncated || res.truncated;
  }
  return { data: out, error: null, truncated };
}
