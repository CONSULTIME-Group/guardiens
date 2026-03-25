import { supabase } from "@/integrations/supabase/client";

interface GeoResult {
  lat: number;
  lng: number;
  city: string;
}

/**
 * Geocode a city name to lat/lng coordinates.
 * Uses a backend function with Nominatim + cache.
 */
export async function geocodeCity(city: string): Promise<GeoResult | null> {
  if (!city || city.trim().length < 2) return null;

  try {
    const { data, error } = await supabase.functions.invoke("geocode", {
      body: { city: city.trim() },
    });

    if (error || !data?.lat || !data?.lng) return null;
    return { lat: data.lat, lng: data.lng, city: data.city };
  } catch {
    return null;
  }
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
