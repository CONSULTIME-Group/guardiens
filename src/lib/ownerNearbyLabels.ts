/**
 * Libellés de « Près de chez vous » (lot D3).
 * - Sous 1 km : la ville seule (deux positions ramenées au centre d'une même
 *   commune ne disent rien de la distance réelle).
 * - Lien de sortie : compte exact du rayon (paliers 30, 50, 100 km), jamais le
 *   vivier national accolé à une mention de proximité.
 */
export function nearbyPlaceLabel(city: string | null | undefined, distanceKm: number | null | undefined): string {
  const parts: string[] = [];
  if (city) parts.push(city);
  if (typeof distanceKm === "number" && distanceKm >= 1) parts.push(`${Math.round(distanceKm)} km`);
  return parts.join(", ");
}

export function nearbyExitLabel(input: {
  totalCount?: number | null;
  radiusUsed?: number | null;
  hasGeo?: boolean;
  isBeyond?: boolean;
} | null | undefined): string {
  const n = input?.totalCount ?? 0;
  const r = input?.radiusUsed ?? null;
  if (!input?.hasGeo || input?.isBeyond || r == null || n <= 0) return "Voir tous les gardiens";
  return `Voir les ${n} gardiens à moins de ${r} km`;
}
