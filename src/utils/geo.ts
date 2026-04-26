import type { CityData } from "@/data/cities";

export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function getNearbyCities(
  current: CityData,
  all: CityData[],
  limit = 5
): CityData[] {
  return all
    .filter((c) => c.slug !== current.slug)
    .map((c) => ({
      city: c,
      distance: haversineDistance(current.coordinates, c.coordinates),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((item) => item.city);
}

// Re-export depuis lib/normalize pour rétrocompatibilité.
export { slugify as toSlug } from "@/lib/normalize";
