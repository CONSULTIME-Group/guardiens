import { useEffect, useState } from "react";
import { geocodeCity } from "@/lib/geocode";

const geoCache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeCached(city: string): Promise<{ lat: number; lng: number } | null> {
  const key = city.toLowerCase().trim();
  if (geoCache.has(key)) return geoCache.get(key)!;
  const result = await geocodeCity(city);
  const coords = result ? { lat: result.lat, lng: result.lng } : null;
  geoCache.set(key, coords);
  return coords;
}

/** Geocode a list of items keyed by id, returning a stable Map<id, coords>. */
export function useEntityCoords<T extends { id: string; city?: string | null; latitude?: number | null; longitude?: number | null }>(
  items: T[] | undefined,
  { useDbCoords = false }: { useDbCoords?: boolean } = {}
) {
  const [coords, setCoords] = useState<Map<string, { lat: number; lng: number }>>(new Map());

  useEffect(() => {
    if (!items?.length) return;
    const toGeocode = items.filter((it) => it.city && !coords.has(it.id));
    if (toGeocode.length === 0) return;
    let cancelled = false;
    (async () => {
      const newMap = new Map(coords);
      for (const it of toGeocode) {
        if (useDbCoords && it.latitude && it.longitude) {
          newMap.set(it.id, { lat: it.latitude, lng: it.longitude });
        } else if (it.city) {
          const c = await geocodeCached(it.city);
          if (c) newMap.set(it.id, c);
        }
      }
      if (!cancelled) setCoords(newMap);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return coords;
}
