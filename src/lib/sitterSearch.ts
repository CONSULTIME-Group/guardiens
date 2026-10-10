/**
 * Recherche de gardiens (/recherche-gardiens), logique pure et lecture du vivier.
 *
 * Lot 1 international (10/10/2026) : le vivier est lu en entier par la RPC
 * search_sitter_pool, pays filtré côté serveur AVANT toute pagination, pages
 * de 1 000 lignes (plafond serveur), plus de tranche de 500 profils triés par
 * identifiant. La population est celle des vues publiques (compte actif,
 * prénom, complétion >= 40) : la même que les compteurs par pays.
 * Coordonnées toujours approximées (2 décimales), jamais précises.
 */
import { supabase } from "@/integrations/supabase/client";
import { getDeptCode } from "@/lib/departments";
import { getRegionCode } from "@/lib/regions";
import { haversineDistance } from "@/lib/geocode";

export const SITTER_POOL_PAGE = 1000;
const MAX_PAGES = 20;
/** Cartes affichées par palier dans la grille, « Afficher plus » ensuite. */
export const RESULTS_PAGE_SIZE = 48;

export interface PoolRow {
  user_id: string;
  country: string | null;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  postal_code: string | null;
  profile_completion: number | null;
  identity_verified: boolean | null;
  completed_sits_count: number | null;
  bio: string | null;
  last_seen_at: string | null;
  latitude_approx: number | null;
  longitude_approx: number | null;
  animal_types: string[] | null;
  has_vehicle: boolean | null;
  is_available: boolean | null;
  reply_median_minutes: number | null;
  sitter_type: string | null;
  travels_with_children: boolean | null;
  travels_with_own_animals: boolean | null;
  competences: string[] | null;
  special_animal_skills: string[] | null;
  interests: string[] | null;
  experience_years: string | null;
}

/** Vivier complet (pays donné, ou tous pays si null), paginé sans perte. */
export async function fetchSitterSearchPool(country: string | null): Promise<PoolRow[]> {
  const rows: PoolRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * SITTER_POOL_PAGE;
    const { data, error } = await (supabase as any)
      .rpc("search_sitter_pool", { p_country: country })
      .order("user_id", { ascending: true })
      .range(from, from + SITTER_POOL_PAGE - 1);
    if (error) throw error;
    const batch = (data ?? []) as PoolRow[];
    rows.push(...batch);
    if (batch.length < SITTER_POOL_PAGE) return rows;
  }
  console.warn(`[sitter-search] ${MAX_PAGES} pages lues, vivier tronqué.`);
  return rows;
}

export async function fetchSitterCountryCounts(): Promise<Array<{ code: string; count: number }>> {
  const { data, error } = await (supabase as any).rpc("search_sitter_country_counts");
  if (error) throw error;
  return ((data ?? []) as Array<{ country: string; sitters: number }>)
    .filter((r) => r.country)
    .map((r) => ({ code: r.country, count: r.sitters }));
}

/** Transforme une ligne du vivier dans la forme attendue par les cartes. */
export function poolRowToSitter(r: PoolRow) {
  return {
    id: r.user_id,
    user_id: r.user_id,
    country: r.country,
    animal_types: r.animal_types,
    has_vehicle: r.has_vehicle,
    is_available: r.is_available,
    reply_median_minutes: r.reply_median_minutes,
    sitter_type: r.sitter_type,
    travels_with_children: r.travels_with_children,
    travels_with_own_animals: r.travels_with_own_animals,
    _card: {
      competences: r.competences,
      special_animal_skills: r.special_animal_skills,
      interests: r.interests,
      experience_years: r.experience_years,
    },
    profile: {
      id: r.user_id,
      first_name: r.first_name,
      avatar_url: r.avatar_url,
      city: r.city,
      postal_code: r.postal_code,
      profile_completion: r.profile_completion,
      identity_verified: r.identity_verified,
      completed_sits_count: r.completed_sits_count,
      bio: r.bio,
      last_seen_at: r.last_seen_at,
      latitude_approx: r.latitude_approx,
      longitude_approx: r.longitude_approx,
    },
  };
}

export type ZoneMode = "radius" | "dept" | "region" | "country";

export interface ZoneContext {
  zoneMode: ZoneMode;
  /** Pays de recherche, null = tous les pays. */
  country: string | null;
  center: { lat: number; lng: number } | null;
  radiusKm: number;
  /** Département de référence (France seulement). */
  refDept: string | null;
}

export interface ZonableSitter {
  country?: string | null;
  _dist: number | null;
  profile?: { postal_code?: string | null } | null;
}

/** Distance arrondie au km depuis le centre, coordonnées approximées. */
export function distanceFrom(
  center: { lat: number; lng: number } | null,
  lat: number | null | undefined,
  lng: number | null | undefined,
): number | null {
  if (!center || typeof lat !== "number" || typeof lng !== "number") return null;
  return Math.round(haversineDistance(center.lat, center.lng, lat, lng));
}

const isFr = (s: ZonableSitter) => (s.country ?? null) === "FR";

/**
 * Appartenance aux zones. Département et région ne valent que pour un gardien
 * établi en France : un code postal étranger (13000 à Rio) ne doit jamais
 * tomber dans les Bouches-du-Rhône. Le repli département du rayon (gardien
 * sans coordonnées) suit la même règle.
 */
export function inRadius(s: ZonableSitter, ctx: ZoneContext): boolean {
  if (s._dist != null) return s._dist <= ctx.radiusKm;
  if (!ctx.refDept || !isFr(s)) return false;
  const cp = s.profile?.postal_code;
  return cp ? getDeptCode(cp) === ctx.refDept : false;
}

export function inDept(s: ZonableSitter, refDept: string | null): boolean {
  if (!refDept || !isFr(s)) return false;
  const cp = s.profile?.postal_code;
  return cp ? getDeptCode(cp) === refDept : false;
}

export function inRegion(s: ZonableSitter, refRegion: string | null): boolean {
  if (!refRegion || !isFr(s)) return false;
  const cp = s.profile?.postal_code;
  return cp ? getRegionCode(getDeptCode(cp)) === refRegion : false;
}

/** Le vivier est déjà restreint au pays par le serveur : « pays » = tout. */
export function applyZone<T extends ZonableSitter>(items: T[], ctx: ZoneContext): T[] {
  const refRegion = getRegionCode(ctx.refDept);
  if (ctx.zoneMode === "radius") return ctx.center ? items.filter((s) => inRadius(s, ctx)) : items;
  if (ctx.zoneMode === "dept") return items.filter((s) => inDept(s, ctx.refDept));
  if (ctx.zoneMode === "region") return items.filter((s) => inRegion(s, refRegion));
  return items;
}

export function zoneCounts<T extends ZonableSitter>(items: T[], ctx: ZoneContext) {
  const refRegion = getRegionCode(ctx.refDept);
  return {
    radius: ctx.center ? items.filter((s) => inRadius(s, ctx)).length : 0,
    dept: items.filter((s) => inDept(s, ctx.refDept)).length,
    region: items.filter((s) => inRegion(s, refRegion)).length,
    country: items.length,
  };
}

/** Suggestion de lieu, toujours rattachée explicitement à un pays. */
export interface PlaceSuggestion {
  name: string;
  /** Précision affichée : code postal (France) ou région, pays. */
  detail: string | null;
  country: string;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
}

export function fromGeoApiGouv(rows: any[]): PlaceSuggestion[] {
  return (rows ?? []).map((r) => ({
    name: r.nom,
    detail: r.codesPostaux?.[0] ?? null,
    country: "FR",
    postalCode: r.codesPostaux?.[0] ?? null,
    lat: r.centre?.coordinates?.[1] ?? null,
    lng: r.centre?.coordinates?.[0] ?? null,
  }));
}

const PHOTON_PLACE_VALUES = new Set(["city", "town", "village", "municipality", "hamlet", "suburb", "borough", "locality"]);

/** Résultats Photon (OpenStreetMap), filtrés sur le pays demandé si fourni. */
export function fromPhoton(json: any, country: string | null): PlaceSuggestion[] {
  const out: PlaceSuggestion[] = [];
  const seen = new Set<string>();
  for (const f of json?.features ?? []) {
    const p = f?.properties ?? {};
    const cc = String(p.countrycode ?? "").toUpperCase();
    if (!cc || !p.name) continue;
    if (country && cc !== country) continue;
    if (p.osm_key && p.osm_key !== "place" && p.osm_key !== "boundary") continue;
    if (p.osm_value && p.osm_key === "place" && !PHOTON_PLACE_VALUES.has(p.osm_value)) continue;
    const key = `${p.name}|${p.state ?? ""}|${cc}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const [lng, lat] = f?.geometry?.coordinates ?? [];
    out.push({
      name: p.name,
      detail: [p.state, p.country].filter(Boolean).join(", ") || null,
      country: cc,
      postalCode: null,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
    });
  }
  return out;
}

/**
 * Sources de suggestions selon le pays : France = geo.api.gouv.fr seul,
 * autre pays = Photon restreint à ce pays, tous pays = les deux, chaque
 * entrée portant son pays.
 */
export function suggestionSources(country: string | null): { gouv: boolean; photon: boolean } {
  if (country === "FR") return { gouv: true, photon: false };
  if (country) return { gouv: false, photon: true };
  return { gouv: true, photon: true };
}

export interface LocationState {
  country: string | null;
  zoneMode: ZoneMode;
  city: string;
  cityCountry: string | null;
  cityPostalCode: string | null;
}

/**
 * Changement de pays : une ville d'un autre pays est retirée (fin de
 * « Lyon + Canada »), département et région n'existent qu'en France.
 * « Tous les pays » (null) lève réellement la restriction de pays.
 */
export function changeCountry(state: LocationState, next: string | null): LocationState {
  const keepCity = !!state.city && (next === null || state.cityCountry === next);
  const city = keepCity ? state.city : "";
  let zoneMode = state.zoneMode;
  if ((zoneMode === "dept" || zoneMode === "region") && next !== "FR") zoneMode = city ? "radius" : "country";
  if (zoneMode === "radius" && !city) zoneMode = "country";
  if (!keepCity && zoneMode !== "country") zoneMode = "country";
  return {
    country: next,
    zoneMode,
    city,
    cityCountry: keepCity ? state.cityCountry : null,
    cityPostalCode: keepCity ? state.cityPostalCode : null,
  };
}

/** Sélection d'une ville : le pays de recherche suit celui de la ville, sauf en « tous pays ». */
export function selectPlace(state: LocationState, s: PlaceSuggestion): LocationState {
  return {
    country: state.country === null ? null : s.country,
    zoneMode: state.zoneMode === "country" || (s.country !== "FR" && state.zoneMode !== "radius") ? "radius" : state.zoneMode,
    city: s.name,
    cityCountry: s.country,
    cityPostalCode: s.postalCode,
  };
}

export type MapTiles = "ign" | "world";

export interface MapViewport {
  tiles: MapTiles;
  /** Cadrage sur les résultats quand il y en a. */
  bounds: Array<[number, number]> | null;
  center: [number, number];
  zoom: number;
}

const FR_METRO = { minLat: 41, maxLat: 51.5, minLng: -5.5, maxLng: 10 };
const inMetro = (lat: number, lng: number) =>
  lat >= FR_METRO.minLat && lat <= FR_METRO.maxLat && lng >= FR_METRO.minLng && lng <= FR_METRO.maxLng;

/**
 * Cadrage de la carte. Plan IGN seulement si tout est en France métropolitaine
 * (pays France, centre et points dans l'Hexagone), fond mondial sinon : un
 * point outre-mer ou étranger est montré tel quel, jamais jugé faux.
 */
export function computeMapViewport(opts: {
  country: string | null;
  center: { lat: number; lng: number } | null;
  points: Array<{ lat: number; lng: number }>;
  countryCenter?: { lat: number; lng: number } | null;
}): MapViewport {
  const { country, center, points } = opts;
  const allMetro =
    country === "FR" &&
    (!center || inMetro(center.lat, center.lng)) &&
    points.every((p) => inMetro(p.lat, p.lng));
  const tiles: MapTiles = allMetro ? "ign" : "world";
  const pts = points.map((p) => [p.lat, p.lng] as [number, number]);
  if (center) {
    const withCenter = pts.length > 0 ? [...pts, [center.lat, center.lng] as [number, number]] : null;
    return { tiles, bounds: withCenter, center: [center.lat, center.lng], zoom: 10 };
  }
  if (pts.length >= 2) return { tiles, bounds: pts, center: pts[0], zoom: 6 };
  if (pts.length === 1) return { tiles, bounds: null, center: pts[0], zoom: 9 };
  if (country === "FR") return { tiles, bounds: null, center: [46.6, 2.5], zoom: 5 };
  if (country && opts.countryCenter) return { tiles, bounds: null, center: [opts.countryCenter.lat, opts.countryCenter.lng], zoom: 4 };
  return { tiles: "world", bounds: null, center: [20, 0], zoom: 2 };
}
