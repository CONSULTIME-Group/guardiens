import { supabase } from "@/integrations/supabase/client";



interface GeoResult {
  lat: number;
  lng: number;
  city: string;
}

/**
 * Session-level in-memory cache for geocoding lookups.
 * Avoids re-hitting the edge function on every re-render / re-filter pass
 * (SearchOwner peut géocoder 100+ villes uniques par recherche).
 * Le edge `geocode` a déjà son propre cache DB ; ce cache évite le round-trip.
 */
const memoryCache = new Map<string, GeoResult | null>();
const inflight = new Map<string, Promise<GeoResult | null>>();

function cacheKey(city: string, country?: string | null) {
  return `${city.trim().toLowerCase()}::${(country || "").trim().toLowerCase()}`;
}

/**
 * Simple concurrency limiter shared across all geocode calls.
 * Empêche de saturer l'edge function quand on Promise.all sur 200 villes.
 */
const MAX_CONCURRENT = 8;
let active = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    queue.push(() => {
      active++;
      resolve();
    });
  });
}

function release() {
  active--;
  const next = queue.shift();
  if (next) next();
}

/**
 * Lot H3 (14/10/2026) : cache persistant (localStorage, 30 jours) des communes
 * situées, pour qu'une visite suivante n'attende plus aucun géocodage. Une
 * commune introuvable n'y entre jamais. Lecture et écriture protégées.
 */
const PERSIST_KEY = "guardiens_geocode_v1";
const PERSIST_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PERSIST_MAX = 600;
type Persisted = Record<string, { lat: number; lng: number; city: string; t: number }>;
let persisted: Persisted | null = null;

function readPersisted(): Persisted {
  if (persisted) return persisted;
  persisted = {};
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PERSIST_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") {
      const now = Date.now();
      for (const [k, v] of Object.entries(parsed as Persisted)) {
        if (v && typeof v.lat === "number" && typeof v.lng === "number" && now - (v.t || 0) < PERSIST_TTL_MS) persisted[k] = v;
      }
    }
  } catch { /* stockage illisible : cache vide */ }
  return persisted;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persist(key: string, r: GeoResult) {
  const store = readPersisted();
  store[key] = { lat: r.lat, lng: r.lng, city: r.city, t: Date.now() };
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const entries = Object.entries(store).sort((a, b) => b[1].t - a[1].t).slice(0, PERSIST_MAX);
      localStorage.setItem(PERSIST_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch { /* stockage plein ou bloqué : cache de session seul */ }
  }, 500);
}

function fromPersisted(key: string): GeoResult | null {
  const hit = readPersisted()[key];
  return hit ? { lat: hit.lat, lng: hit.lng, city: hit.city } : null;
}

/**
 * Lot H3 : les appels d'un même instant sont regroupés en une requête
 * (`places`, 40 au plus) ; le serveur lit son cache en une fois. Une réponse
 * absente ou incomplète (ancienne version de la fonction) repasse par l'appel
 * unitaire, commune par commune.
 */
const BATCH_MAX = 40;
type Pending = { key: string; city: string; country?: string | null; resolve: (r: GeoResult | null) => void };
let batchQueue: Pending[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleBatch() {
  if (batchTimer) return;
  batchTimer = setTimeout(() => {
    batchTimer = null;
    const items = batchQueue;
    batchQueue = [];
    for (let i = 0; i < items.length; i += BATCH_MAX) void flushBatch(items.slice(i, i + BATCH_MAX));
  }, 15);
}

async function flushBatch(items: Pending[]) {
  if (items.length === 1) {
    const it = items[0];
    it.resolve(await geocodeOne(it.key, it.city, it.country));
    return;
  }
  let results: any[] | null = null;
  try {
    const { data, error } = await supabase.functions.invoke("geocode", {
      body: { places: items.map((it) => ({ city: it.city.trim(), country: it.country?.trim() || undefined })) },
    });
    if (!error && Array.isArray(data?.results) && data.results.length === items.length) results = data.results;
  } catch { results = null; }
  await Promise.all(items.map(async (it, i) => {
    const r = results?.[i];
    if (r && typeof r.lat === "number" && typeof r.lng === "number") {
      const res: GeoResult = { lat: r.lat, lng: r.lng, city: r.city ?? it.city };
      memoryCache.set(it.key, res);
      persist(it.key, res);
      it.resolve(res);
      return;
    }
    if (r && !r.fallback && r.error === "City not found") {
      memoryCache.set(it.key, null);
      it.resolve(null);
      return;
    }
    // Lot absent, panne passagère ou commune à chercher : appel unitaire.
    it.resolve(await geocodeOne(it.key, it.city, it.country));
  }));
}

async function geocodeOne(key: string, city: string, country?: string | null): Promise<GeoResult | null> {
  await acquire();
  try {
    // Un seul appel : la fonction serveur gère déjà les variantes de ville et
    // de pays ainsi que le cache. Le résultat est mémorisé sous la clé d'origine.
    const { data, error } = await supabase.functions.invoke("geocode", {
      body: { city: city.trim(), country: country?.trim() || undefined },
    });
    if (error || !data?.lat || !data?.lng) {
      // Lot E10 : seule une commune réellement introuvable est mémorisée ;
      // une panne passagère ou un géocodeur limité se retente au clic suivant.
      if (!error && data && !data.fallback && data.error === "City not found") memoryCache.set(key, null);
      return null;
    }
    const result: GeoResult = { lat: data.lat, lng: data.lng, city: data.city };
    memoryCache.set(key, result);
    persist(key, result);
    return result;
  } catch {
    return null;
  } finally {
    release();
  }
}

/**
 * Geocode a city name to lat/lng coordinates.
 * Uses a backend function with Nominatim + cache, plus an in-memory layer,
 * a persistent layer and request batching (lot H3).
 */
export async function geocodeCity(city: string, country?: string | null): Promise<GeoResult | null> {
  if (!city || city.trim().length < 2) return null;

  const key = cacheKey(city, country);
  if (memoryCache.has(key)) return memoryCache.get(key)!;
  const stored = fromPersisted(key);
  if (stored) { memoryCache.set(key, stored); return stored; }
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = new Promise<GeoResult | null>((resolve) => {
    batchQueue.push({ key, city, country, resolve });
    scheduleBatch();
  }).finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

/**
 * Calculate the distance in km between two points using the Haversine formula.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
