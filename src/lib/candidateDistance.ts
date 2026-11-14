import { haversineDistance } from "@/lib/geocode";

type Point = { latitude_approx?: number | null; longitude_approx?: number | null } | null | undefined;

/**
 * Lot RCH5 (14/11/2026) : distance du candidat au propriétaire, en km arrondis,
 * entre les centres de commune publics (latitude_approx). Null si une position manque.
 */
export function candidateDistanceKm(owner: Point, sitter: Point): number | null {
  const ok = (p: Point) => !!p && typeof p.latitude_approx === "number" && typeof p.longitude_approx === "number";
  if (!ok(owner) || !ok(sitter)) return null;
  const d = haversineDistance(owner!.latitude_approx as number, owner!.longitude_approx as number, sitter!.latitude_approx as number, sitter!.longitude_approx as number);
  return Number.isFinite(d) ? Math.max(1, Math.round(d)) : null;
}
