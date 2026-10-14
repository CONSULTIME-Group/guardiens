/**
 * Guides locaux, lieux réels et sourcés (lots GL1 et GL2, 13/10/2026).
 *
 * Constat : le 10/10/2026, le guide /guides/saint-ludger (annonce à Saint
 * Ludger, Québec) a été publié avec 20 lieux écrits par l'IA et situés en
 * France (code postal 76000, vétérinaires dans l'Oise). Sur 1 423 lieux de
 * guides, 1 078 n'avaient aucune source (base, 13/10/2026).
 *
 * Décisions de Jérémie (13/10/2026) :
 * - un guide à l'étranger porte sur la vraie ville étrangère, jamais sur un
 *   homonyme français ;
 * - uniquement des lieux réels et sourcés ;
 * - aucun guide sans lieu : on élargit la recherche (forêts, balades,
 *   vétérinaires, animaleries existent partout) ;
 * - un lien vers le lieu pour l'itinéraire.
 *
 * Ce module ne contient aucun import réseau : il est testé par Vitest
 * (src/__tests__/gl/). Les appels réseau passent par des fonctions `fetch`
 * injectées.
 */

export type GuideCategory =
  | "dog_park"
  | "general_park"
  | "walk_trail"
  | "vet"
  | "pet_shop"
  | "dog_friendly_cafe"
  | "dog_friendly_restaurant";

export type PlaceKind =
  | "dog_park"
  | "park"
  | "nature_reserve"
  | "forest"
  | "hiking_route"
  | "path"
  | "vet"
  | "pet_shop"
  | "cafe"
  | "restaurant";

export interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface GuideCenter {
  lat: number;
  lon: number;
  /** Code pays ISO 3166-1 alpha-2, en majuscules. */
  country: string;
  /** Région administrative lisible (« Québec »), ou null. */
  region: string | null;
}

/**
 * Rayons de recherche successifs, en mètres. Le dernier (80 km) ne sert qu'aux
 * catégories encore vides à 50 km (voir `categoriesToWiden`) : essai à blanc de
 * Saint-Ludger (Québec) du 14/10/2026, le vétérinaire le plus proche connu
 * d'OpenStreetMap est à 52 km (décision de Jérémie du 14/10/2026).
 */
export const RADII_M = [5000, 15000, 30000, 50000, 80000] as const;
/** Au-delà de ce rayon, seules les catégories sans aucun lieu sont cherchées. */
export const NEAR_RADIUS_M = 50000;

/**
 * Règles par catégorie :
 * - `min` : en dessous, on élargit le rayon ;
 * - `max` : nombre de lieux retenus ;
 * - `maxRadius` : au-delà, la catégorie n'a plus de sens pour une garde.
 */
export const CATEGORY_RULES: Record<GuideCategory, { min: number; max: number; maxRadius: number }> = {
  general_park: { min: 3, max: 4, maxRadius: 30000 },
  walk_trail: { min: 2, max: 4, maxRadius: 30000 },
  dog_park: { min: 1, max: 3, maxRadius: 15000 },
  vet: { min: 2, max: 4, maxRadius: 80000 },
  pet_shop: { min: 1, max: 3, maxRadius: 50000 },
  dog_friendly_cafe: { min: 1, max: 3, maxRadius: 15000 },
  dog_friendly_restaurant: { min: 1, max: 3, maxRadius: 15000 },
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_RULES) as GuideCategory[];

/** Catégories rapprochées d'une fiche Google (lieux ponctuels). */
export const GOOGLE_MATCH_TOLERANCE_M: Partial<Record<PlaceKind, number>> = {
  vet: 250,
  pet_shop: 250,
  cafe: 250,
  restaurant: 250,
  dog_park: 600,
  park: 1000,
};

const WALK_NAME = /(sentier|chemin|promenade|balade|randonn|boucle|voie verte|halage|trail|path|walk|sendero|percorso)/i;

/**
 * Filtres Overpass par catégorie : éléments nommés uniquement.
 * Le rayon vient en premier : mesuré le 13/10/2026, la même recherche de
 * vétérinaires à 2 km de Lyon finit en délai dépassé quand l'étiquette précède
 * le rayon, et répond en quelques secondes quand le rayon précède l'étiquette
 * (overpass-api.de et overpass.openstreetmap.fr).
 */
export function overpassFilters(category: GuideCategory, radiusM: number, lat: number, lon: number): string[] {
  const a = `(around:${radiusM},${lat},${lon})`;
  switch (category) {
    case "dog_park":
      return [`nwr${a}["leisure"="dog_park"];`];
    case "general_park":
      return [
        `nwr${a}["leisure"~"^(park|nature_reserve)$"]["name"];`,
        // Deux filtres simples : la recherche par expression sur la clé est lente.
        `wr${a}["landuse"="forest"]["name"];`,
        `wr${a}["natural"="wood"]["name"];`,
      ];
    case "walk_trail":
      // La recherche des chemins par leur nom est lourde : limitée à 15 km
      // (au-delà, elle dépassait le délai d'Overpass le 13/10/2026).
      return [
        `relation${a}["route"~"^(hiking|foot)$"]["name"]["network"!~"^(iwn|nwn)$"];`,
        ...(radiusM <= 15000 ? [`way${a}["highway"~"^(path|footway|track|cycleway)$"]["name"~"${WALK_NAME.source}",i];`] : []),
      ];
    case "vet":
      return [`nwr${a}["amenity"="veterinary"]["name"];`];
    case "pet_shop":
      return [`nwr${a}["shop"="pet"]["name"];`];
    // Même requête pour les cafés et les restaurants : elle n'est envoyée qu'une fois.
    case "dog_friendly_cafe":
    case "dog_friendly_restaurant":
      return [`nwr${a}["amenity"~"^(cafe|restaurant|pub|bar)$"]["name"]["dog"~"^(yes|leashed)$"];`];
  }
}

/** Une requête Overpass pour plusieurs catégories au même rayon. */
export function buildOverpassQuery(categories: GuideCategory[], radiusM: number, lat: number, lon: number): string {
  const parts = categories.flatMap((c) => overpassFilters(c, radiusM, lat, lon));
  return `[out:json][timeout:25];(${parts.join("")});out center tags;`;
}

/** Catégorie et nature d'un élément OSM, ou null s'il ne correspond à rien. */
/**
 * Noms écartés : essai à blanc sur Lyon du 13/10/2026, un « Espace de
 * Déjection Canine » remontait comme espace pour chiens et des traboules
 * (itinéraires piétons urbains) comme balades avec un chien.
 */
const EXCLUDED_NAME = /(d[ée]jection|canisette|sanisette|toilettes?\s+canines?|traboule)/i;

/**
 * Noms sans valeur pour un lecteur : essai à blanc de Marrakech du 14/10/2026,
 * un chemin nommé « path1 » remontait comme balade.
 */
const PLACEHOLDER_NAME = /^(path|chemin|sentier|trail|walk|way|track|piste)[\s_-]*\d*$/i;

/** Écritures autres que latines (arabe, hébreu, cyrillique, grec, Asie). */
const NON_LATIN = /[\u0370-\u03FF\u0400-\u04FF\u0590-\u08FF\u0E00-\u0E7F\u3040-\u9FFF\uAC00-\uD7AF]+/g;

/**
 * Nom affiché d'un lieu : le nom français quand OpenStreetMap le donne, sinon
 * le nom local sans la partie écrite dans un autre alphabet quand une partie
 * latine existe (« Arset El Bilk عرصة البيلك » devient « Arset El Bilk »).
 */
export function displayName(tags: Record<string, string> | undefined): string {
  const t = tags ?? {};
  const fr = (t["name:fr"] ?? "").trim();
  if (fr) return fr;
  const name = (t.name ?? "").trim();
  if (!name || !/[A-Za-zÀ-ÿ]/.test(name)) return name;
  const latin = name.replace(NON_LATIN, " ").replace(/\(\s*\)/g, " ").replace(/\s{2,}/g, " ").replace(/^[\s,/(-]+|[\s,/(-]+$/g, "").trim();
  return latin || name;
}

export function categorize(el: OsmElement): { category: GuideCategory; kind: PlaceKind } | null {
  const t = el.tags ?? {};
  if (t.name && EXCLUDED_NAME.test(t.name)) return null;
  if (t.name && PLACEHOLDER_NAME.test(t.name.trim())) return null;
  if (t.leisure === "dog_park" && (!t.name || !t.name.trim())) return { category: "dog_park", kind: "dog_park" };
  if (!t.name || !t.name.trim()) return null;
  const dogOk = t.dog === "yes" || t.dog === "leashed";
  if (t.amenity === "veterinary") return { category: "vet", kind: "vet" };
  if (t.shop === "pet") return { category: "pet_shop", kind: "pet_shop" };
  if (t.leisure === "dog_park") return { category: "dog_park", kind: "dog_park" };
  if (t.amenity === "cafe" && dogOk) return { category: "dog_friendly_cafe", kind: "cafe" };
  if (["restaurant", "pub", "bar"].includes(t.amenity ?? "") && dogOk) {
    return { category: "dog_friendly_restaurant", kind: "restaurant" };
  }
  if (t.route === "hiking" || t.route === "foot") {
    if (t.network === "iwn" || t.network === "nwn") return null;
    return { category: "walk_trail", kind: "hiking_route" };
  }
  if (["path", "footway", "track", "cycleway"].includes(t.highway ?? "") && WALK_NAME.test(t.name)) {
    return { category: "walk_trail", kind: "path" };
  }
  if (t.leisure === "park") return { category: "general_park", kind: "park" };
  if (t.leisure === "nature_reserve") return { category: "general_park", kind: "nature_reserve" };
  if (t.landuse === "forest" || t.natural === "wood") return { category: "general_park", kind: "forest" };
  return null;
}

export function elementPoint(el: OsmElement): { lat: number; lon: number } | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const sourceUrlOf = (el: OsmElement) => `https://www.openstreetmap.org/${el.type}/${el.id}`;

export const normName = (s: string) =>
  (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export interface Candidate {
  category: GuideCategory;
  kind: PlaceKind;
  name: string;
  lat: number;
  lon: number;
  distanceM: number;
  sourceUrl: string;
  tags: Record<string, string>;
}

/**
 * Garde-fou universel : un lieu au-delà du rayon maximal de sa catégorie (plus
 * 2 km de marge pour le centre d'une forêt ou d'un sentier) est rejeté. C'est
 * ce contrôle qui interdit un lieu de l'Oise dans un guide du Québec.
 */
export function withinGuide(category: GuideCategory, distanceM: number): boolean {
  return distanceM <= CATEGORY_RULES[category].maxRadius + 2000;
}

/** Éléments OSM vers candidats, dans le rayon, sans doublon. */
export function toCandidates(
  elements: OsmElement[],
  center: { lat: number; lon: number },
  known: { names: Set<string>; sources: Set<string> },
): { candidates: Candidate[]; rejectedDistance: number } {
  const best = new Map<string, Candidate>();
  let rejectedDistance = 0;
  for (const el of elements) {
    const cat = categorize(el);
    if (!cat) continue;
    const pt = elementPoint(el);
    if (!pt) continue;
    const sourceUrl = sourceUrlOf(el);
    const name = displayName(el.tags) || "Espace canin";
    const key = `${cat.category}|${normName(name)}`;
    if (known.sources.has(sourceUrl) || known.names.has(normName(name))) continue;
    const distanceM = haversineM(center.lat, center.lon, pt.lat, pt.lon);
    if (!withinGuide(cat.category, distanceM)) {
      rejectedDistance++;
      continue;
    }
    const prev = best.get(key);
    if (!prev || distanceM < prev.distanceM) {
      best.set(key, { ...cat, name, lat: pt.lat, lon: pt.lon, distanceM, sourceUrl, tags: el.tags ?? {} });
    }
  }
  return { candidates: [...best.values()], rejectedDistance };
}

/** Sélection par catégorie : les plus proches, dans la limite `max`. */
export function selectByCategory(
  candidates: Candidate[],
  alreadyCounted: Partial<Record<GuideCategory, number>> = {},
): Candidate[] {
  const out: Candidate[] = [];
  const usedNames = new Set<string>();
  for (const category of ALL_CATEGORIES) {
    const room = CATEGORY_RULES[category].max - (alreadyCounted[category] ?? 0);
    if (room <= 0) continue;
    const pool = candidates
      .filter((c) => c.category === category)
      .sort((a, b) => a.distanceM - b.distanceM);
    let taken = 0;
    for (const c of pool) {
      if (taken >= room) break;
      const n = normName(c.name);
      if (usedNames.has(n)) continue;
      usedNames.add(n);
      out.push(c);
      taken++;
    }
  }
  return out;
}

/** Catégories encore sous leur minimum et cherchables au rayon donné. */
export function categoriesToWiden(
  counts: Partial<Record<GuideCategory, number>>,
  nextRadiusM: number,
): GuideCategory[] {
  return ALL_CATEGORIES.filter((c) => {
    const n = counts[c] ?? 0;
    if (n >= CATEGORY_RULES[c].min || nextRadiusM > CATEGORY_RULES[c].maxRadius) return false;
    // Zone rurale : au-delà de 50 km, seulement si la catégorie est encore vide.
    return nextRadiusM <= NEAR_RADIUS_M || n === 0;
  });
}

/** « 800 m », « 3,2 km », « 18 km ». */
export function formatDistance(distanceM: number): string {
  if (distanceM < 950) return `${Math.max(100, Math.round(distanceM / 100) * 100)} m`;
  const km = distanceM / 1000;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

function where(distanceM: number, city: string): string {
  if (distanceM < 400) return `au centre de ${city}`;
  return `à ${formatDistance(distanceM)} du centre de ${city}`;
}

/**
 * Description tirée des seules étiquettes de la source. Rien n'est affirmé
 * au-delà (horaires, accueil, laisse).
 */
export function describe(c: Pick<Candidate, "kind" | "distanceM" | "tags">, city: string): string {
  const w = where(c.distanceM, city);
  const t = c.tags;
  switch (c.kind) {
    case "dog_park":
      return `Espace aménagé pour les chiens, ${w}.`;
    case "park":
      return `Parc ${w}.`;
    case "nature_reserve":
      return `Réserve naturelle ${w}, avec sa propre réglementation pour les chiens.`;
    case "forest":
      return `Forêt ${w}.`;
    case "hiking_route": {
      const d = (t.distance ?? "").replace(/[^\d.,]/g, "").replace(",", ".");
      const km = Number(d);
      const len = Number.isFinite(km) && km > 0 ? ` de ${String(Math.round(km * 10) / 10).replace(".", ",")} km` : "";
      return `Itinéraire de randonnée${len}, ${w}.`;
    }
    case "path":
      return `Chemin de promenade ${w}.`;
    case "vet":
      return t.emergency === "yes"
        ? `Cabinet vétérinaire avec service d'urgence, ${w}.`
        : `Cabinet vétérinaire ${w}.`;
    case "pet_shop":
      return `Animalerie ${w}.`;
    case "cafe":
      return t.dog === "leashed" ? `Café qui accueille les chiens en laisse, ${w}.` : `Café qui accueille les chiens, ${w}.`;
    case "restaurant":
      return t.dog === "leashed"
        ? `Restaurant qui accueille les chiens en laisse, ${w}.`
        : `Restaurant qui accueille les chiens, ${w}.`;
  }
}

/** Numéro lisible : groupes de deux chiffres en France, tel quel ailleurs. */
export function formatPhone(raw: string | undefined, country: string): string | null {
  if (!raw) return null;
  const first = raw.split(";")[0].trim();
  if (country === "FR") {
    let local = first.replace(/[^\d+]/g, "");
    if (local.startsWith("+33")) local = "0" + local.slice(3);
    else if (local.startsWith("0033")) local = "0" + local.slice(4);
    local = local.replace(/\D/g, "");
    if (local.length !== 10) return null;
    return local.match(/.{2}/g)!.join(" ");
  }
  const cleaned = first.replace(/[^\d+ ().]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.replace(/\d/g, "").length === cleaned.length ? null : cleaned;
}

/** Badges : seulement ce que la source établit. */
export function dogFlags(c: Pick<Candidate, "kind" | "tags">): { dogs_welcome: boolean; leash_required: boolean | null } {
  const dog = c.tags.dog;
  if (c.kind === "dog_park") return { dogs_welcome: true, leash_required: false };
  if (dog === "leashed") return { dogs_welcome: true, leash_required: true };
  if (dog === "yes") return { dogs_welcome: true, leash_required: null };
  return { dogs_welcome: false, leash_required: null };
}

/** Adresse à partir des étiquettes OSM, ou null. */
export function addressFromTags(t: Record<string, string>): string | null {
  const street = t["addr:street"];
  if (!street) return null;
  const line1 = [t["addr:housenumber"], street].filter(Boolean).join(" ");
  const line2 = [t["addr:postcode"], t["addr:city"]].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(", ");
}

const COMMERCIAL_KINDS = new Set<PlaceKind>(["vet", "pet_shop", "cafe", "restaurant"]);
export const isCommercial = (k: PlaceKind) => COMMERCIAL_KINDS.has(k);

/** La Base Adresse Nationale couvre la métropole et les DROM, pas la Polynésie ni la Nouvelle-Calédonie. */
export function usesBan(country: string, postalCode: string | null | undefined): boolean {
  if ((country || "FR").toUpperCase() !== "FR") return false;
  const p = (postalCode ?? "").trim();
  if (/^98[6-8]/.test(p)) return false;
  return true;
}

/** Code pays au sens d'OpenStreetMap : la Polynésie (987) et la Nouvelle-Calédonie (988) y ont le leur. */
export function nominatimCountry(country: string, postalCode: string | null | undefined): string {
  const c = (country || "FR").toUpperCase();
  const p = (postalCode ?? "").trim();
  if (c === "FR" && /^987/.test(p)) return "pf";
  if (c === "FR" && /^988/.test(p)) return "nc";
  if (c === "FR" && /^986/.test(p)) return "wf";
  return c.toLowerCase();
}

/** Nom du pays en français (« Canada », « Maroc »). */
export function countryLabel(country: string): string {
  try {
    const dn = new Intl.DisplayNames(["fr"], { type: "region" });
    return dn.of(country.toUpperCase()) ?? country.toUpperCase();
  } catch {
    return country.toUpperCase();
  }
}

/** Lien Google Maps vers le lieu, en mode itinéraire. Aucune clé, aucun coût. */
export function directionsUrl(p: { name: string; latitude: number | null; longitude: number | null; google_place_id?: string | null; address?: string | null }): string | null {
  if (p.latitude == null || p.longitude == null) return null;
  const base = "https://www.google.com/maps/dir/?api=1";
  if (p.google_place_id) {
    const dest = encodeURIComponent([p.name, p.address].filter(Boolean).join(", "));
    return `${base}&destination=${dest}&destination_place_id=${encodeURIComponent(p.google_place_id)}`;
  }
  return `${base}&destination=${p.latitude},${p.longitude}`;
}

/** Lien vers la fiche Google du lieu (avis et note), seulement si le rapprochement est fait. */
export function googlePlaceUrl(p: { name: string; address?: string | null; google_place_id?: string | null }): string | null {
  if (!p.google_place_id) return null;
  const q = encodeURIComponent([p.name, p.address].filter(Boolean).join(", "));
  return `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${encodeURIComponent(p.google_place_id)}`;
}

// ---------------------------------------------------------------------------
// Centre du guide
// ---------------------------------------------------------------------------

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Délai d'attente d'un appel réseau (sans effet là où AbortSignal.timeout manque). */
export const timeoutSignal = (ms: number): AbortSignal | undefined =>
  typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(ms) : undefined;

const UA = { "User-Agent": "Guardiens/1.0 (guides locaux; contact@guardiens.fr)" };

interface NominatimSearchHit {
  lat: string;
  lon: string;
  addresstype?: string;
  type?: string;
  address?: Record<string, string>;
}

/**
 * Choisit, parmi les homonymes, la localité la plus proche de l'indice (le
 * lieu du propriétaire). Sans indice, la première. Un indice à plus de 60 km
 * de tout résultat écarte les résultats : on garde l'indice arrondi.
 */
export function pickNearest<T extends { lat: number; lon: number }>(
  hits: T[],
  hint: { lat: number; lon: number } | null,
  maxKm = 60,
): T | null {
  if (hits.length === 0) return null;
  if (!hint) return hits[0];
  let best: T | null = null;
  let bestD = Infinity;
  for (const h of hits) {
    const d = haversineM(hint.lat, hint.lon, h.lat, h.lon);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return bestD <= maxKm * 1000 ? best : null;
}

/** Coordonnées arrondies au kilomètre : un lieu de propriétaire n'est jamais repris tel quel. */
export const roundCoord = (v: number) => Math.round(v * 100) / 100;

/** Communes d'un code postal (BAN), la plus proche du nom du guide d'abord, puis la plus peuplée. */
export async function banByPostcode(
  pc: string,
  city: string,
  fetchFn: FetchLike,
): Promise<{ lat: number; lon: number; context: string }[] | null> {
  const params = new URLSearchParams({ q: pc, type: "municipality", limit: "10" });
  const r = await fetchFn(`https://api-adresse.data.gouv.fr/search/?${params}`, { headers: UA });
  if (!r.ok) return null;
  const data = await r.json();
  const words = normName(city).split(" ").filter((w) => w.length > 3);
  const ranked = (data?.features ?? [])
    .filter((f: any) => String(f?.properties?.postcode ?? "") === pc)
    .map((f: any) => {
      const name = normName(String(f?.properties?.name ?? ""));
      return {
        lat: Number(f?.geometry?.coordinates?.[1]),
        lon: Number(f?.geometry?.coordinates?.[0]),
        context: String(f?.properties?.context ?? ""),
        named: words.some((w) => name.includes(w)) ? 1 : 0,
        population: Number(f?.properties?.population ?? 0),
      };
    })
    .filter((h: { lat: number; lon: number }) => Number.isFinite(h.lat) && Number.isFinite(h.lon))
    .sort((a: any, b: any) => b.named - a.named || b.population - a.population);
  // Une seule commune retenue : le centre du guide, jamais une moyenne.
  return ranked.slice(0, 1).map(({ lat, lon, context }: any) => ({ lat, lon, context }));
}

export async function resolveGuideCenter(
  input: {
    city: string;
    postalCode: string | null;
    country: string;
    hint: { lat: number; lon: number } | null;
  },
  fetchFn: FetchLike,
): Promise<GuideCenter | null> {
  const country = (input.country || "FR").toUpperCase();
  const city = input.city.trim();

  if (usesBan(country, input.postalCode)) {
    const pc = (input.postalCode ?? "").trim();
    const dept = /^\d{5}$/.test(pc) ? (/^9[78]/.test(pc) ? pc.slice(0, 3) : pc.slice(0, 2)) : null;
    // La BAN rend toujours un résultat approchant : seule une commune au nom
    // exact et au score franc compte (sinon « Essaouira » deviendrait une
    // commune française).
    const banHits = async (withPostcode: boolean) => {
      const params = new URLSearchParams({ q: city, type: "municipality", limit: "5" });
      if (withPostcode) params.set("postcode", pc);
      const r = await fetchFn(`https://api-adresse.data.gouv.fr/search/?${params}`, { headers: UA });
      if (!r.ok) return null;
      const data = await r.json();
      return (data?.features ?? [])
        .filter((f: any) => Number(f?.properties?.score ?? 0) >= 0.6 && normName(String(f?.properties?.name ?? "")) === normName(city))
        // Sans le code postal exact (« 69000 » pour Lyon), même département exigé.
        .filter((f: any) => withPostcode || !dept || String(f?.properties?.citycode ?? f?.properties?.postcode ?? "").startsWith(dept))
        .map((f: any) => ({
          lat: Number(f?.geometry?.coordinates?.[1]),
          lon: Number(f?.geometry?.coordinates?.[0]),
          context: String(f?.properties?.context ?? ""),
        }))
        .filter((h: { lat: number; lon: number }) => Number.isFinite(h.lat) && Number.isFinite(h.lon)) as {
          lat: number;
          lon: number;
          context: string;
        }[];
    };
    try {
      let hits = dept ? await banHits(true) : null;
      if (!hits || hits.length === 0) hits = await banHits(false);
      // Nom qui n'est pas une commune (« Beaujolais », un pays ou une vallée) :
      // centre de la commune du code postal, celle dont le nom reprend un mot
      // du guide d'abord, puis la plus peuplée (essai réel du 14/10/2026).
      if ((!hits || hits.length === 0) && /^\d{5}$/.test(pc)) hits = await banByPostcode(pc, city, fetchFn);
      if (hits) {
        const best = pickNearest(hits, input.hint);
        // Communes trouvées, toutes loin du lieu indiqué : la demande est incohérente.
        if (!best && hits.length > 0) return null;
        if (best) {
          const region = best.context.split(",").map((s: string) => s.trim()).filter(Boolean).pop() ?? null;
          return { lat: best.lat, lon: best.lon, country: "FR", region };
        }
      }
    } catch {
      // repli plus bas
    }
  } else {
    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        addressdetails: "1",
        limit: "10",
        city,
        countrycodes: nominatimCountry(country, input.postalCode),
        "accept-language": "fr",
      });
      const r = await fetchFn(`https://nominatim.openstreetmap.org/search?${params}`, { headers: UA });
      if (r.ok) {
        const data = (await r.json()) as NominatimSearchHit[];
        const hits = (Array.isArray(data) ? data : [])
          .map((h) => ({ lat: Number(h.lat), lon: Number(h.lon), address: h.address ?? {} }))
          .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lon));
        const best = pickNearest(hits, input.hint);
        if (!best && hits.length > 0) return null;
        if (best) {
          const region = best.address.state ?? best.address.region ?? best.address.county ?? null;
          return { lat: best.lat, lon: best.lon, country, region };
        }
      }
    } catch {
      // repli plus bas
    }
  }

  if (input.hint) {
    return { lat: roundCoord(input.hint.lat), lon: roundCoord(input.hint.lon), country, region: null };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Prompt d'introduction
// ---------------------------------------------------------------------------

/**
 * Invite de l'introduction. Le pays réel est nommé, les seuls lieux cités
 * sont ceux trouvés en base, et l'IA n'invente aucun nom.
 */
export function introPrompt(city: string, center: GuideCenter, placeNames: string[]): string {
  const where = center.country === "FR"
    ? `${city}${center.region ? ` (${center.region})` : ""}, en France`
    : `${city}${center.region ? `, ${center.region}` : ""}, ${countryLabel(center.country)}`;
  const names = placeNames.slice(0, 8);
  return [
    `Écris une introduction de 3 phrases pour un guide destiné aux gardiens de maison et d'animaux qui séjournent à ${where}.`,
    `Ton chaleureux et concret. Ne cite aucun nom de lieu, de rue, de commerce ou de rivière${names.length ? ` en dehors de cette liste de lieux réels : ${names.join(" ; ")}` : ""}.`,
    `N'invente aucun fait. Décris l'ambiance de façon générale et ce qui rend le coin agréable pour promener un chien.`,
    `Ponctuation : virgules, points, deux-points, parenthèses. Aucun tiret.`,
    `Écris uniquement des phrases affirmatives : dis ce que le lieu est et offre, jamais ce qu'il n'est pas (aucun « ne », « pas », « sans », « aucun », « jamais »).`,
    `Termine par une phrase séparée qui commence par « Idéal pour les gardiens qui ».`,
    `Réponds UNIQUEMENT en JSON valide : {"intro": "...", "ideal_for": "Idéal pour les gardiens qui..."}`,
  ].join("\n");
}

/** Retire les tirets longs qu'un modèle glisserait malgré la consigne. */
export const stripDashes = (s: string) =>
  (s ?? "")
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1 à $2")
    .replace(/\s*[\u2013\u2014]\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/,\s*,/g, ",");

// ---------------------------------------------------------------------------
// Collecte : Overpass, rayon élargi par catégorie, adresses
// ---------------------------------------------------------------------------

// Le 13/10/2026, overpass-api.de répondait 504 ou « Query timed out » et
// kumi comme private.coffee ne répondaient pas en 60 s : quatre miroirs, 20 s
// chacun.
export const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/** Exécute une requête Overpass sur les miroirs successifs ; null si tous échouent. */
/** Issue d'un essai sur un miroir, pour le diagnostic (aucune donnée de lieu). */
export interface OverpassAttempt {
  via: "direct" | "base";
  mirror: string;
  ms: number;
  outcome: string;
}

/**
 * Exécute une requête Overpass sur les miroirs successifs ; null si tous
 * échouent. Requête en GET, la forme qui répond depuis la base le 13/10/2026.
 */
export async function runOverpass(
  query: string,
  fetchFn: FetchLike,
  timeoutMs = 20000,
  deadline = Number.POSITIVE_INFINITY,
  onAttempt?: (a: OverpassAttempt) => void,
): Promise<OsmElement[] | null> {
  for (const mirror of OVERPASS_MIRRORS) {
    if (Date.now() + 5000 > deadline) return null;
    const t0 = Date.now();
    const note = (outcome: string) => onAttempt?.({ via: "direct", mirror: new URL(mirror).hostname, ms: Date.now() - t0, outcome });
    try {
      const r = await fetchFn(`${mirror}?data=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: { ...UA },
        signal: typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(timeoutMs) : undefined,
      });
      if (!r.ok) {
        note(`http_${r.status}`);
        continue;
      }
      const text = await r.text();
      if (!text.trim().startsWith("{")) {
        note("non_json");
        continue;
      }
      const data = JSON.parse(text);
      // Délai ou mémoire dépassés : Overpass répond 200 avec une remarque et
      // une liste tronquée. Ce n'est pas un résultat.
      if (/runtime (error|remark)|timed out|out of memory/i.test(String(data?.remark ?? ""))) {
        note("remark_timeout");
        continue;
      }
      note("ok");
      return Array.isArray(data?.elements) ? data.elements : [];
    } catch (e) {
      note(`exception_${String((e as Error)?.name ?? "erreur")}`);
      continue;
    }
  }
  return null;
}

/** Une requête Overpass rendue en éléments, ou null si aucun miroir n'a répondu. */
export type OverpassTransport = (query: string, deadline: number) => Promise<OsmElement[] | null>;

/** Plusieurs requêtes Overpass ; une entrée null par requête restée sans réponse. */
export type OverpassBatch = (queries: string[], deadline: number) => Promise<(OsmElement[] | null)[]>;

/**
 * Adresse lisible d'un point : BAN en France, Nominatim ailleurs.
 * `error` distingue une panne (à refaire) d'une absence d'adresse.
 */
export async function reverseAddress(
  pt: { lat: number; lon: number },
  opts: { country: string; postalCode: string | null; commercial: boolean },
  fetchFn: FetchLike,
  sleep: (ms: number) => Promise<void>,
): Promise<{ address: string | null; error: boolean }> {
  if (usesBan(opts.country, opts.postalCode)) {
    try {
      const type = opts.commercial ? "housenumber" : "municipality";
      const r = await fetchFn(
        `https://api-adresse.data.gouv.fr/reverse/?lon=${pt.lon}&lat=${pt.lat}&type=${type}`,
        { headers: UA, signal: timeoutSignal(8000) },
      );
      if (!r.ok) return { address: null, error: true };
      const f = (await r.json())?.features?.[0];
      if (!f?.properties?.label) return { address: null, error: false };
      if (opts.commercial && Number(f.properties.distance ?? Infinity) > 150) return { address: null, error: false };
      return {
        address: opts.commercial
          ? String(f.properties.label)
          : [f.properties.postcode, f.properties.city ?? f.properties.label].filter(Boolean).join(" "),
        error: false,
      };
    } catch {
      return { address: null, error: true };
    }
  }
  // Nominatim : une requête par seconde au plus (règles d'usage).
  await sleep(1100);
  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(pt.lat),
      lon: String(pt.lon),
      zoom: opts.commercial ? "18" : "12",
      addressdetails: "1",
      "accept-language": "fr",
    });
    const r = await fetchFn(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: UA, signal: timeoutSignal(8000) });
    if (!r.ok) return { address: null, error: true };
    const a = (await r.json())?.address ?? {};
    const town = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet ?? null;
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const parts = opts.commercial ? [street || null, [a.postcode, town].filter(Boolean).join(" ") || null] : [town];
    const label = parts.filter(Boolean).join(", ");
    return { address: label || null, error: false };
  } catch {
    return { address: null, error: true };
  }
}

export interface GuideForSourcing {
  city: string;
  postalCode: string | null;
  center: GuideCenter;
}

export interface SourcedRow {
  category: GuideCategory;
  kind: PlaceKind;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  description: string;
  tips: string | null;
  dogs_welcome: boolean;
  leash_required: boolean | null;
  source_url: string;
}

export interface CollectReport {
  rows: SourcedRow[];
  radiiUsed: Partial<Record<GuideCategory, number>>;
  /** Vrai si une partie de la collecte manque (Overpass, adresse, délai) : le guide reste en file. */
  incomplete: boolean;
  overpassFailed: boolean;
  rejectedDistance: number;
  rejectedAddress: number;
}

/**
 * Collecte les lieux d'un guide. `known` contient les lieux sourcés déjà en
 * base (comptés dans les quotas, jamais doublés).
 */
export async function collectPlaces(
  guide: GuideForSourcing,
  known: { names: Set<string>; sources: Set<string>; counts: Partial<Record<GuideCategory, number>> },
  fetchFn: FetchLike,
  sleep: (ms: number) => Promise<void>,
  deadline = Number.POSITIVE_INFINITY,
  overpass?: OverpassTransport,
  batch?: OverpassBatch,
): Promise<CollectReport> {
  const { center } = guide;
  const ask: OverpassTransport = overpass ?? ((q, d) => runOverpass(q, fetchFn, 20000, d));
  let incomplete = false;
  const pool: Candidate[] = [];
  const radiiUsed: Partial<Record<GuideCategory, number>> = {};
  let rejectedDistance = 0;
  let overpassFailed = false;
  const counts = (): Partial<Record<GuideCategory, number>> => {
    const c: Partial<Record<GuideCategory, number>> = { ...known.counts };
    for (const x of selectByCategory(pool, known.counts)) c[x.category] = (c[x.category] ?? 0) + 1;
    return c;
  };

  let pending = ALL_CATEGORIES.filter((c) => (known.counts[c] ?? 0) < CATEGORY_RULES[c].max);
  let requests = 0;
  // Une requête courte par filtre, l'une après l'autre : mesuré le 13/10/2026,
  // un serveur Overpass chargé répond à une recherche simple et coupe à 30 s
  // une union de plusieurs filtres, et refuse (504) les requêtes simultanées.
  outer: for (let i = 0; i < RADII_M.length && pending.length > 0; i++) {
    const radius = RADII_M[i];
    const seen = new Set(pool.map((p) => p.sourceUrl));
    const statements = [...new Set(pending.flatMap((c) => overpassFilters(c, radius, center.lat, center.lon)))];
    const take = (els: OsmElement[]) => {
      const { candidates, rejectedDistance: rd } = toCandidates(els, center, known);
      rejectedDistance += rd;
      for (const c of candidates) {
        if (!pending.includes(c.category) || seen.has(c.sourceUrl)) continue;
        seen.add(c.sourceUrl);
        pool.push(c);
        radiiUsed[c.category] = radiiUsed[c.category] ?? radius;
      }
    };
    if (batch) {
      if (Date.now() + 8000 > deadline) {
        incomplete = true;
        break;
      }
      const results = await batch(statements.map((st) => `[out:json][timeout:25];${st}out center tags;`), deadline);
      const answered = results.filter((r) => r !== null);
      for (const els of answered) take(els!);
      if (answered.length < results.length) {
        // Une partie des filtres sans réponse : on élargit quand même pour les
        // catégories qui manquent, et le guide reste en file pour un nouveau passage.
        incomplete = true;
        if (answered.length === 0) overpassFailed = true;
      }
    } else {
      for (const statement of statements) {
        if (Date.now() + 8000 > deadline) {
          incomplete = true;
          break outer;
        }
        if (requests++ > 0) await sleep(500);
        const els = await ask(`[out:json][timeout:25];${statement}out center tags;`, deadline);
        if (els === null) {
          overpassFailed = true;
          incomplete = true;
          break outer;
        }
        take(els);
      }
    }
    const next = RADII_M[i + 1];
    pending = next ? categoriesToWiden(counts(), next) : [];
  }

  const selected = selectByCategory(pool, known.counts);
  const built = await buildRows(selected, guide, fetchFn, sleep, deadline);
  if (built.incomplete) incomplete = true;
  const { rows, rejectedAddress } = built;
  return { rows, radiiUsed, incomplete, overpassFailed, rejectedDistance, rejectedAddress };
}


/**
 * Lignes prêtes à insérer pour des candidats retenus : adresse (étiquettes,
 * puis BAN en France, Nominatim ailleurs), description, téléphone, badges.
 */
export async function buildRows(
  selected: Candidate[],
  guide: GuideForSourcing,
  fetchFn: FetchLike,
  sleep: (ms: number) => Promise<void>,
  deadline = Number.POSITIVE_INFINITY,
): Promise<{ rows: SourcedRow[]; incomplete: boolean; rejectedAddress: number }> {
  const { center } = guide;
  let incomplete = false;
  const rows: SourcedRow[] = [];
  let rejectedAddress = 0;
  for (const c of selected) {
    const commercial = isCommercial(c.kind);
    let address = addressFromTags(c.tags);
    let geocoderDown = false;
    if (!address) {
      if (Date.now() + 3000 > deadline) {
        incomplete = true;
        break;
      }
      const rev = await reverseAddress(
        { lat: c.lat, lon: c.lon },
        { country: center.country, postalCode: guide.postalCode, commercial },
        fetchFn,
        sleep,
      );
      if (rev.error) {
        if (usesBan(center.country, guide.postalCode)) {
          // Panne de la BAN : le lieu sera repris au passage suivant.
          incomplete = true;
          continue;
        }
        // Hors de France, Nominatim refuse souvent les serveurs partagés : le
        // lieu garde sa distance au centre, l'itinéraire donne l'adresse.
        geocoderDown = true;
      }
      address = rev.address;
    }
    if (!address) {
      if (commercial && !geocoderDown) {
        rejectedAddress++;
        continue;
      }
      address = `${formatDistance(c.distanceM)} du centre de ${guide.city}`;
    }
    const phone = formatPhone(c.tags.phone ?? c.tags["contact:phone"], center.country);
    const flags = dogFlags(c);
    rows.push({
      category: c.category,
      kind: c.kind,
      name: c.name,
      address,
      latitude: c.lat,
      longitude: c.lon,
      distance_km: Math.round(c.distanceM / 100) / 10,
      description: describe(c, guide.city),
      tips: phone ? `Téléphone : ${phone}.` : null,
      dogs_welcome: flags.dogs_welcome,
      leash_required: flags.leash_required,
      source_url: c.sourceUrl,
    });
  }
  return { rows, incomplete, rejectedAddress };
}

// ---------------------------------------------------------------------------
// Rapprochement Google : identifiant de lieu seulement
// ---------------------------------------------------------------------------

/**
 * Conditions Google Maps Platform (Places API, 5.3 et 5.4) : seul
 * l'identifiant de lieu se conserve, et aucun contenu Places ne s'affiche avec
 * une carte non Google. On ne garde donc que `google_place_id`, qui sert aux
 * liens « Itinéraire » et « Avis sur Google Maps ». Aucune note n'est écrite.
 */
export async function matchGooglePlaceId(
  p: { name: string; address: string; latitude: number; longitude: number; kind: PlaceKind },
  country: string,
  apiKey: string,
  fetchFn: FetchLike,
): Promise<{ placeId: string | null; status: "ok" | "sans_resultat" | "trop_loin" | "erreur" | "hors_perimetre" }> {
  const tol = GOOGLE_MATCH_TOLERANCE_M[p.kind];
  if (!tol) return { placeId: null, status: "hors_perimetre" };
  try {
    const r = await fetchFn("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.location",
      },
      body: JSON.stringify({
        textQuery: `${p.name}, ${p.address}`,
        languageCode: "fr",
        regionCode: country.toUpperCase(),
        maxResultCount: 1,
        locationBias: { circle: { center: { latitude: p.latitude, longitude: p.longitude }, radius: 500.0 } },
      }),
    });
    if (!r.ok) return { placeId: null, status: "erreur" };
    const place = (await r.json())?.places?.[0];
    if (!place?.id) return { placeId: null, status: "sans_resultat" };
    const d = haversineM(p.latitude, p.longitude, Number(place.location?.latitude), Number(place.location?.longitude));
    if (!Number.isFinite(d) || d > tol) return { placeId: null, status: "trop_loin" };
    return { placeId: String(place.id), status: "ok" };
  } catch {
    return { placeId: null, status: "erreur" };
  }
}

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

export const baseSlug = (city: string) =>
  city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Suffixe d'un homonyme : département en France, pays ailleurs. */
export function homonymSlug(slug: string, center: GuideCenter, postalCode: string | null): string {
  if (center.country === "FR") {
    const pc = (postalCode ?? "").trim();
    const dept = /^9[78]/.test(pc) ? pc.slice(0, 3) : pc.slice(0, 2);
    // Même règle que public.guide_homonym_slug (migration GL).
    return /^\d{2,3}$/.test(dept) ? `${slug}-${dept}` : `${slug}-fr`;
  }
  return `${slug}-${center.country.toLowerCase()}`;
}


// ---------------------------------------------------------------------------
// Protocole de génération (lot GL4) : éléments compacts, rédaction vérifiée
// ---------------------------------------------------------------------------

/** Guides refondus à la main (src/data/guideOverrides.ts) : leur texte n'est jamais réécrit. */
export const CURATED_SLUGS = ["lyon", "annecy", "rennes", "clermont-ferrand"] as const;

const KEPT_TAGS = [
  "name", "dog", "distance", "phone", "contact:phone", "emergency", "leisure", "amenity", "shop",
  "route", "highway", "landuse", "natural", "network",
  "addr:housenumber", "addr:street", "addr:postcode", "addr:city",
];

/**
 * Réponse Overpass réduite à ce que le guide utilise : éléments reconnus,
 * dans le rayon, étiquettes utiles, les plus proches d'abord (60 au plus).
 * C'est ce qui est gardé en base entre deux passages de la file.
 */
export function compactElements(els: OsmElement[], center: { lat: number; lon: number }, max = 60): OsmElement[] {
  // Un même nom (chemin découpé en tronçons) ne garde que son tronçon le plus
  // proche, avant la limite : les autres lieux restent dans la liste.
  const best = new Map<string, { el: OsmElement; d: number }>();
  for (const el of els) {
    const cat = categorize(el);
    const pt = elementPoint(el);
    if (!cat || !pt) continue;
    const d = haversineM(center.lat, center.lon, pt.lat, pt.lon);
    if (!withinGuide(cat.category, d)) continue;
    const tags: Record<string, string> = {};
    for (const k of KEPT_TAGS) if (el.tags?.[k] != null) tags[k] = String(el.tags[k]);
    // Le nom gardé est le nom affiché (français, ou partie latine du nom local).
    if (tags.name) tags.name = displayName(el.tags);
    const key = `${cat.category}|${normName(tags.name ?? String(el.id))}`;
    const prev = best.get(key);
    if (!prev || d < prev.d) best.set(key, { el: { type: el.type, id: el.id, lat: pt.lat, lon: pt.lon, tags }, d });
  }
  return [...best.values()].sort((a, b) => a.d - b.d).slice(0, max).map((k) => k.el);
}

export interface FactPlace {
  category: string;
  name: string;
  distance_km: number | null;
}

/** Libellé de lieu : « Saint Ludger (Québec, Canada) », « Lyon (Rhône) ». */
export function placeLabel(city: string, country: string, region: string | null): string {
  const parts = [region, country.toUpperCase() !== "FR" ? countryLabel(country) : null].filter(Boolean);
  return parts.length ? `${city} (${parts.join(", ")})` : city;
}

const km = (d: number | null) => (d == null ? null : formatDistance(d * 1000));

/**
 * Introduction factuelle, écrite depuis les seules données vérifiées : sert de
 * texte de repli quand la rédaction par l'IA échoue au contrôle, et de résumé
 * citable par les moteurs.
 */
export function factualIntro(city: string, label: string, places: FactPlace[]): { intro: string; ideal_for: string } {
  const nature = places.filter((p) => ["general_park", "walk_trail", "dog_park"].includes(p.category));
  const vets = places.filter((p) => p.category === "vet").sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
  const parts: string[] = [];
  parts.push(`Ce guide réunit ${places.length} lieu${places.length > 1 ? "x" : ""} vérifié${places.length > 1 ? "s" : ""} dans OpenStreetMap autour de ${label}.`);
  if (nature.length) {
    const names = nature.slice(0, 3).map((p) => p.name).join(", ");
    parts.push(`Pour promener un chien : ${names}${nature.length > 3 ? ", et d'autres balades listées plus bas" : ""}.`);
  }
  if (vets[0]) {
    const d = km(vets[0].distance_km);
    parts.push(`Le vétérinaire le plus proche, ${vets[0].name}, se trouve ${d ? `à ${d} du centre` : "dans le secteur"}.`);
  }
  return {
    intro: parts.join(" "),
    ideal_for: `Idéal pour les gardiens qui veulent repérer avant d'arriver les balades et les adresses utiles autour de ${city}.`,
  };
}

// Mot-clé de lieu sans casse imposée, nom propre qui suit en majuscule.
const PROPER_PLACE = /\b(?:[Pp]arc|[Ff]orêt|[Ff]oret|[Bb]ois|[Jj]ardin|[Ss]quare|[Rr]ue|[Aa]venue|[Bb]oulevard|[Pp]lace|[Cc]hemin|[Ss]entier|[Ll]ac|[Rr]ivière|[Rr]iviere|[Cc]linique|[Cc]abinet|[Cc]afé|[Cc]afe|[Rr]estaurant|[Aa]nimalerie|[Pp]lage|[Mm]ont|[Cc]ol|[Vv]allée|[Vv]allee|[Qq]uais?|[Bb]erges?)\s+(?:de\s+la\s+|du\s+|des\s+|de\s+l'|d'|de\s+)?(\p{Lu}[\p{L}'-]+)/gu;

/** Tournures négatives, proscrites dans les textes publics. */
const NEGATIVE = /(?:^|[\s,.;:(])(?:ne|n'|n’|pas|aucune?|sans|jamais|rien|ni)(?=[\s,.;:)!?]|$)/iu;

/**
 * Contrôle de la rédaction : refuse un texte qui contient un tiret long ou qui
 * nomme un lieu (« Parc de la Ludgerette ») absent de la liste vérifiée.
 */
export function introProblems(text: string, allowedNames: string[]): string[] {
  const problems: string[] = [];
  if (/[\u2013\u2014]/.test(text)) problems.push("tiret_long");
  // « à deux pas » est une tournure affirmative.
  if (NEGATIVE.test(text.replace(/à deux pas/giu, ""))) problems.push("tournure_negative");
  const allowed = allowedNames.map(normName).join(" | ");
  for (const m of text.matchAll(PROPER_PLACE)) {
    const phrase = normName(m[0]);
    const word = normName(m[1]);
    if (!allowed.includes(word) && !allowed.includes(phrase)) problems.push(`lieu_non_verifie:${m[0]}`);
  }
  return problems;
}
