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
 * Geocode a city name to lat/lng coordinates.
 * Uses a backend function with Nominatim + cache, plus an in-memory layer.
 */
export async function geocodeCity(city: string, country?: string | null): Promise<GeoResult | null> {
  if (!city || city.trim().length < 2) return null;

  const key = cacheKey(city, country);
  if (memoryCache.has(key)) return memoryCache.get(key)!;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    await acquire();
    try {
      const { data, error } = await supabase.functions.invoke("geocode", {
        body: { city: city.trim(), country: country?.trim() || undefined },
      });
      if (error || !data?.lat || !data?.lng) {
        memoryCache.set(key, null);
        return null;
      }
      const result: GeoResult = { lat: data.lat, lng: data.lng, city: data.city };
      memoryCache.set(key, result);
      return result;
    } catch {
      memoryCache.set(key, null);
      return null;
    } finally {
      release();
      inflight.delete(key);
    }
  })();

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
