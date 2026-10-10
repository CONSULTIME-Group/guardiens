/**
 * Lot L2 : annonces hors France, moteur unique partagé par la page
 * /annonces/international, le carrousel « Au-delà des frontières » et les
 * compteurs « hors France ».
 *
 * Mêmes règles que L1 : annonces ouvertes (applyOpenSitFilter), lieu =
 * profil public du propriétaire puis repli entier sur l'annonce
 * (resolveSitPlace), jamais de FR déduit. « Hors France » = pays retenu
 * connu et différent de FR (un pays inconnu n'est ni France ni étranger).
 */
import { supabase } from "@/integrations/supabase/client";
import {
  applyOpenSitFilter,
  fetchAllPages,
  fetchInChunks,
  resolveSitPlace,
  isWithinRadius,
  type SitPlace,
} from "@/lib/sitSearchRules";
import { getCountryName } from "@/lib/countries";
import { fromPhoton, type PlaceSuggestion } from "@/lib/sitterSearch";

export interface IntlSit {
  id: string;
  slug: string | null;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  cover_photo_url: string | null;
  photos: string[];
  species: string[];
  place: SitPlace;
}

const SIT_COLS =
  "id, slug, title, city, country, departement_code, start_date, end_date, created_at, cover_photo_url, user_id, property_id, property:properties!sits_property_id_fkey(photos, cover_photo_url)";

/** Lecture tronquée (plafond de pages atteint) : jamais de compteur présenté comme complet. */
export class IntlPoolTruncatedError extends Error {
  constructor(what: string) {
    super(`Lecture incomplète (${what}) : plafond de pages atteint, comptage non fiable.`);
    this.name = "IntlPoolTruncatedError";
  }
}

/**
 * Lecture complète des annonces ouvertes, puis lieu propriétaire et espèces.
 * Par défaut hors France ; includeFrance = tous les pays, France incluse.
 * Tout jeu tronqué lève IntlPoolTruncatedError.
 */
export async function fetchIntlOpenSits(opts: { withSpecies?: boolean; includeFrance?: boolean } = {}): Promise<IntlSit[]> {
  const res = await fetchAllPages<any>((from, to) =>
    applyOpenSitFilter(supabase.from("sits").select(SIT_COLS) as any)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to) as any,
  );
  if (res.error) throw res.error;
  if (res.truncated) throw new IntlPoolTruncatedError("annonces");
  const rows = res.rows ?? [];
  const ownerIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))] as string[];
  const owners = await fetchInChunks<any>(ownerIds, (chunk, from, to) =>
    supabase
      .from("public_profiles")
      .select("id, city, postal_code, departement_code, country")
      .in("id", chunk)
      .order("id", { ascending: true })
      .range(from, to) as any,
  );
  if (owners.error) throw owners.error;
  if (owners.truncated) throw new IntlPoolTruncatedError("propriétaires");
  const ownerById = new Map((owners.data ?? []).map((o: any) => [o.id, o]));

  const placed = rows
    .map((r: any) => ({ r, place: resolveSitPlace({ ...r, owner: ownerById.get(r.user_id) ?? null }) }))
    .filter(({ place }) => !!place.country && (opts.includeFrance || place.country !== "FR"));

  const speciesByProperty = new Map<string, Set<string>>();
  if (opts.withSpecies && placed.length) {
    const propIds = [...new Set(placed.map(({ r }) => r.property_id).filter(Boolean))] as string[];
    const pets = await fetchInChunks<any>(propIds, (chunk, from, to) =>
      (supabase.from("public_pets" as any) as any).select("id, species, property_id").in("property_id", chunk).order("id", { ascending: true }).range(from, to) as any,
    );
    if (pets.error) throw pets.error;
    if (pets.truncated) throw new IntlPoolTruncatedError("animaux");
    for (const p of pets.data ?? []) {
      if (!speciesByProperty.has(p.property_id)) speciesByProperty.set(p.property_id, new Set());
      if (p.species) speciesByProperty.get(p.property_id)!.add(p.species);
    }
  }

  return placed.map(({ r, place }) => ({
    id: r.id,
    slug: r.slug ?? null,
    title: r.title ?? null,
    start_date: r.start_date ?? null,
    end_date: r.end_date ?? null,
    created_at: r.created_at ?? null,
    cover_photo_url: r.cover_photo_url || r.property?.cover_photo_url || null,
    photos: r.property?.photos ?? [],
    species: [...(speciesByProperty.get(r.property_id) ?? [])],
    place,
  }));
}

/** Nombre d'annonces par pays retenu, trié par nombre puis nom. */
export function intlCountryCounts(items: Pick<IntlSit, "place">[]): Array<{ code: string; name: string; count: number }> {
  const m = new Map<string, number>();
  for (const s of items) if (s.place.country) m.set(s.place.country, (m.get(s.place.country) ?? 0) + 1);
  return [...m.entries()]
    .map(([code, count]) => ({ code, name: getCountryName(code), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
}

export interface IntlFilters {
  country: string | null;
  start: string | null;
  end: string | null;
  species: string[];
}

/** Filtres communs (pays, dates chevauchantes, espèces : au moins une). */
export function filterIntl<T extends Pick<IntlSit, "place" | "start_date" | "end_date" | "species">>(items: T[], f: IntlFilters): T[] {
  return items.filter((s) => {
    if (f.country && s.place.country !== f.country) return false;
    if (f.start && s.end_date && s.end_date < f.start) return false;
    if (f.end && s.start_date && s.start_date > f.end) return false;
    if (f.species.length && !s.species.some((sp) => f.species.includes(sp))) return false;
    return true;
  });
}

/**
 * Rayon autour d'une ville : seuls les points connus et à distance <= rayon.
 * Sans point, l'annonce n'est ni incluse ni dotée d'une distance.
 */
export function applyIntlRadius<T extends { id: string }>(
  items: T[],
  center: { lat: number; lng: number } | null,
  radiusKm: number,
  pointOf: (s: T) => { lat: number; lng: number } | null,
): { items: Array<T & { distance: number | null }>; unlocated: number } {
  if (!center) return { items: items.map((s) => ({ ...s, distance: null })), unlocated: 0 };
  let unlocated = 0;
  const out: Array<T & { distance: number | null }> = [];
  for (const s of items) {
    const p = pointOf(s);
    if (!p) { unlocated++; continue; }
    const d = haversineKm(center, p);
    if (isWithinRadius(d, radiusKm)) out.push({ ...s, distance: d });
  }
  return { items: out, unlocated };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Clé de lieu RÉSOLU : ville + pays, plus département en France. Deux
 * homonymes français de départements différents ont deux clés, donc chacun
 * sa validation de point ; le géocodage reste dédupliqué par ville + pays
 * (cache de geocodeIntlPlace), sans mélanger les validations.
 */
export const placeKey = (s: Pick<IntlSit, "place">): string | null =>
  s.place.city && s.place.country
    ? `${s.place.city.toLowerCase()}|${s.place.country}${s.place.country === "FR" ? `|${s.place.dept ?? ""}` : ""}`
    : null;

/** Lieux résolus distincts, chacun avec son propre lieu (département inclus). */
export function uniquePlaceKeys(items: Pick<IntlSit, "place">[]): Array<{ key: string; city: string; country: string; place: IntlSit["place"] }> {
  const m = new Map<string, { key: string; city: string; country: string; place: IntlSit["place"] }>();
  for (const s of items) {
    const key = placeKey(s);
    if (!key) continue;
    if (!m.has(key)) m.set(key, { key, city: s.place.city!, country: s.place.country!, place: s.place });
  }
  return [...m.values()];
}

/** Libellé lisible du lieu : « Saint-Ludger, Canada », jamais un code pays brut. */
export function intlPlaceLabel(place: Pick<SitPlace, "city" | "country">): string {
  const country = getCountryName(place.country);
  return [place.city, country].filter(Boolean).join(", ") || "Lieu à préciser";
}

/** Titre contextuel : pays choisi ou étranger en général. */
export function intlTitle(country: string | null, city: string | null, world = false): string {
  if (city && country) return `Gardes à ${city}, ${getCountryName(country)}`;
  if (city) return `Gardes autour de ${city}`;
  if (country) return `Gardes à l'étranger : ${getCountryName(country)}`;
  return world ? "Gardes dans tous les pays, France incluse" : "Gardes à l'étranger, tous les pays hors France";
}

/** Le tri « plus proches » n'a de sens qu'avec une ville située. */
export const closestSortAvailable = (center: { lat: number; lng: number } | null): boolean => !!center;

const normName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Limiteur du repli Photon : 2 requêtes simultanées au plus. */
const PHOTON_MAX = 2;
let photonActive = 0;
const photonQueue: Array<() => void> = [];
async function photonSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (photonActive >= PHOTON_MAX) await new Promise<void>((r) => photonQueue.push(r));
  photonActive++;
  try { return await fn(); } finally { photonActive--; photonQueue.shift()?.(); }
}
/** Cache de session, échecs compris : un lieu n'est jamais redemandé. */
const intlPointCache = new Map<string, Promise<{ lat: number; lng: number } | null>>();
export const __resetIntlPointCache = () => intlPointCache.clear();

/**
 * Choix d'une commune parmi des résultats de même nom et même pays.
 * Une région fournie (« Saint-Ludger, Québec ») départage ; sans région,
 * plusieurs communes distantes de plus de 10 km = ambiguïté, aucun point.
 */
export function pickUniquePlace(
  matches: PlaceSuggestion[],
  region: string | null,
): { lat: number; lng: number } | null {
  let pool = matches.filter((m) => m.lat != null && m.lng != null);
  if (region) {
    const r = normName(region);
    pool = pool.filter((m) => normName(m.detail ?? "").includes(r));
  }
  if (!pool.length) return null;
  const a = pool[0];
  const distinct = pool.some((m) => haversineKm({ lat: a.lat!, lng: a.lng! }, { lat: m.lat!, lng: m.lng! }) > 10);
  if (distinct) return null;
  return { lat: Math.round(a.lat! * 1000) / 1000, lng: Math.round(a.lng! * 1000) / 1000 };
}

/**
 * Point approximatif (centre de commune) d'un lieu : géocodeur du site, puis
 * repli Photon borné, limité au pays et au nom exact (accents, tirets et casse
 * ignorés), sans choix silencieux entre homonymes. Rien d'inventé.
 */
export function geocodeIntlPlace(
  city: string,
  country: string,
  primary: (city: string, country: string) => Promise<{ lat: number; lng: number } | null>,
  fetcher: typeof fetch = fetch,
): Promise<{ lat: number; lng: number } | null> {
  const key = `${normName(city)}|${country}`;
  const hit = intlPointCache.get(key);
  if (hit) return hit;
  const parts = city.split(",").map((x) => x.trim()).filter(Boolean);
  const name = parts[0] ?? city;
  const countryName = normName(getCountryName(country));
  const region = parts.slice(1).find((p) => normName(p) !== countryName && normName(p) !== country.toLowerCase()) ?? null;
  const p = (async () => {
    try {
      const pr = await primary(city, country);
      if (pr) return { lat: pr.lat, lng: pr.lng };
    } catch { /* repli */ }
    try {
      return await photonSlot(async () => {
        const r = await fetcher(`https://photon.komoot.io/api/?q=${encodeURIComponent(name)}&limit=10&lang=fr&layer=city&layer=locality&layer=district`);
        if (!r.ok) return null;
        const target = normName(name);
        const matches = fromPhoton(await r.json(), country).filter((s) => normName(s.name) === target);
        return pickUniquePlace(matches, region);
      });
    } catch {
      return null;
    }
  })();
  intlPointCache.set(key, p);
  return p;
}

/** Coordonnées lues dans l'adresse : nombres finis dans les bornes terrestres. */
export function parseUrlPoint(lat: string | null, lng: string | null): { lat: number; lng: number } | null {
  if (lat === null || lng === null || lat.trim() === "" || lng.trim() === "") return null;
  const a = Number(lat), b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: a, lng: b };
}

/** Animaux : libellés partagés par /annonces et /annonces/international dans l'adresse. */
export const SPECIES_LABELS: Array<{ key: string; label: string; france: boolean }> = [
  { key: "dog", label: "Chiens", france: true },
  { key: "cat", label: "Chats", france: true },
  { key: "horse", label: "Chevaux", france: true },
  { key: "bird", label: "Oiseaux", france: true },
  { key: "rodent", label: "Rongeurs", france: false },
  { key: "fish", label: "Poissons", france: false },
  { key: "reptile", label: "Reptiles", france: false },
  { key: "farm_animal", label: "Animaux de ferme", france: true },
  { key: "nac", label: "NAC", france: true },
];

/**
 * Paramètres conservés d'une recherche à l'autre au changement de pays :
 * dates et animaux compatibles ; ville, coordonnées, zone et rayon effacés.
 */
export function carryOverParams(from: URLSearchParams, target: "france" | "intl"): URLSearchParams {
  const out = new URLSearchParams();
  for (const k of ["debut", "fin"]) { const v = from.get(k); if (v) out.set(k, v); }
  const animals = (from.get("animaux") || "").split(",").map((x) => x.trim()).filter(Boolean)
    .filter((l) => SPECIES_LABELS.some((s) => s.label === l && (target === "intl" || s.france)));
  if (animals.length) out.set("animaux", animals.join(","));
  return out;
}

/** Valeurs du choix de destination. */
export const DEST_WORLD = "monde"; // tous les pays, France incluse
export const DEST_ABROAD = "etranger"; // tous les pays hors France
