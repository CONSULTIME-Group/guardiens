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
import { fromPhoton } from "@/lib/sitterSearch";

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

/** Lecture complète des annonces ouvertes, puis lieu propriétaire et espèces. */
export async function fetchIntlOpenSits(opts: { withSpecies?: boolean } = {}): Promise<IntlSit[]> {
  const res = await fetchAllPages<any>((from, to) =>
    applyOpenSitFilter(supabase.from("sits").select(SIT_COLS) as any)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to) as any,
  );
  if (res.error) throw res.error;
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
  const ownerById = new Map((owners.data ?? []).map((o: any) => [o.id, o]));

  const placed = rows
    .map((r: any) => ({ r, place: resolveSitPlace({ ...r, owner: ownerById.get(r.user_id) ?? null }) }))
    .filter(({ place }) => !!place.country && place.country !== "FR");

  const speciesByProperty = new Map<string, Set<string>>();
  if (opts.withSpecies && placed.length) {
    const propIds = [...new Set(placed.map(({ r }) => r.property_id).filter(Boolean))] as string[];
    const pets = await fetchInChunks<any>(propIds, (chunk, from, to) =>
      supabase.from("pets").select("id, species, property_id").in("property_id", chunk).order("id", { ascending: true }).range(from, to) as any,
    );
    if (pets.error) throw pets.error;
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

/** Clés de géocodage dédupliquées (ville, pays) : une requête par lieu, jamais par annonce. */
export function uniquePlaceKeys(items: Pick<IntlSit, "place">[]): Array<{ key: string; city: string; country: string }> {
  const m = new Map<string, { key: string; city: string; country: string }>();
  for (const s of items) {
    if (!s.place.city || !s.place.country) continue;
    const key = `${s.place.city.toLowerCase()}|${s.place.country}`;
    if (!m.has(key)) m.set(key, { key, city: s.place.city, country: s.place.country });
  }
  return [...m.values()];
}

export const placeKey = (s: Pick<IntlSit, "place">): string | null =>
  s.place.city && s.place.country ? `${s.place.city.toLowerCase()}|${s.place.country}` : null;

/** Libellé lisible du lieu : « Saint-Ludger, Canada », jamais un code pays brut. */
export function intlPlaceLabel(place: Pick<SitPlace, "city" | "country">): string {
  const country = getCountryName(place.country);
  return [place.city, country].filter(Boolean).join(", ") || "Lieu à préciser";
}

/** Titre contextuel : pays choisi ou étranger en général. */
export function intlTitle(country: string | null, city: string | null): string {
  if (city && country) return `Gardes à ${city}, ${getCountryName(country)}`;
  if (city) return `Gardes autour de ${city}`;
  if (country) return `Gardes à l'étranger : ${getCountryName(country)}`;
  return "Gardes à l'étranger, tous les pays";
}

/** Le tri « plus proches » n'a de sens qu'avec une ville située. */
export const closestSortAvailable = (center: { lat: number; lng: number } | null): boolean => !!center;

const normName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Point approximatif (centre de commune) d'un lieu hors France : géocodeur du
 * site, puis repli Photon limité au pays et au nom exact (accents, tirets et
 * casse ignorés). Aucun point si le nom ne correspond pas : rien d'inventé.
 */
export async function geocodeIntlPlace(
  city: string,
  country: string,
  primary: (city: string, country: string) => Promise<{ lat: number; lng: number } | null>,
  fetcher: typeof fetch = fetch,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const p = await primary(city, country);
    if (p) return { lat: p.lat, lng: p.lng };
  } catch { /* repli */ }
  try {
    const r = await fetcher(`https://photon.komoot.io/api/?q=${encodeURIComponent(city)}&limit=10&lang=fr&layer=city&layer=locality&layer=district`);
    if (!r.ok) return null;
    const target = normName(city.split(",")[0]);
    const hit = fromPhoton(await r.json(), country).find((s) => normName(s.name) === target && s.lat != null && s.lng != null);
    return hit ? { lat: Math.round(hit.lat! * 1000) / 1000, lng: Math.round(hit.lng! * 1000) / 1000 } : null;
  } catch {
    return null;
  }
}
