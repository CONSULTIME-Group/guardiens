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

const cleanStr = (v: unknown): string => {
  if (typeof v !== "string") return "";
  const t = v.trim();
  const l = t.toLowerCase();
  return t && l !== "null" && l !== "undefined" ? t : "";
};

const normDept = (d: string | null | undefined): string | null => {
  const v = (d ?? "").trim().toUpperCase();
  if (!v) return null;
  return /^\d$/.test(v) ? `0${v}` : v;
};

const deptFromPostalStrict = (postal: string | null | undefined): string | null => {
  const p = cleanStr(postal);
  if (!/^\d{5}$/.test(p)) return null;
  return p.startsWith("97") || p.startsWith("98") ? p.slice(0, 3) : p.slice(0, 2);
};

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
  const oCity = cleanStr(o?.city);
  const oCountry = cleanStr(o?.country).toUpperCase() || null;
  if (oCity && oCountry) {
    const dept = oCountry === "FR" ? normDept(o?.departement_code) ?? deptFromPostalStrict(o?.postal_code) : null;
    return { city: oCity, country: oCountry, dept, source: "owner" };
  }
  const sCity = cleanStr(s.city);
  const sCountry = cleanStr(s.country).toUpperCase() || null;
  if (sCity || sCountry) {
    const dept = sCountry === "FR" ? normDept(s.departement_code) : null;
    return { city: sCity || null, country: sCountry, dept, source: "sit" };
  }
  return { city: null, country: null, dept: null, source: "none" };
}

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

/** France stricte sur le lieu résolu (pays du propriétaire, sinon de l'annonce). */
export const isFrancePlace = (s: SitPlaceInput): boolean => resolveSitPlace(s).country === "FR";

export const sitDeptCode = (s: SitPlaceInput): string | null => resolveSitPlace(s).dept;

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
export function communeDeptFromCoords(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = communeDeptCache.get(key);
  if (hit) return hit;
  const p = (async () => {
    try {
      const r = await fetch(`https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}&fields=codeDepartement&format=json`);
      if (!r.ok) return null;
      const data = await r.json();
      return Array.isArray(data) && data[0]?.codeDepartement ? String(data[0].codeDepartement) : null;
    } catch {
      return null;
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
