// Rayon des diffusions de proximité (send-listing-proximity).
//
// Le rayon est un choix admin, il n'est plus bridé à 200 km. Seule une borne
// technique très large empêche les valeurs absurdes. La protection réelle
// contre la sur-sollicitation est la déduplication : un gardien déjà servi
// pour cette annonce, ou touché par une diffusion de proximité dans les
// 7 derniers jours, est exclu de la cible.
export const MAX_RADIUS_KM = 20000;
export const LARGE_RADIUS_WARN_KM = 200;
export const MIN_RADIUS_KM = 1;
export const DEFAULT_RADIUS_KM = 30;
export const PROXIMITY_DEDUP_DAYS = 7;

export interface RadiusDecision {
  radiusKm: number;
  requestedRadiusKm: number;
  clamped: boolean;
}

/**
 * Ramène un rayon demandé dans les bornes acceptées. Ne refuse jamais la
 * campagne : elle est simplement diffusée au plafond, et le fait est journalisé.
 */
export function clampRadiusKm(requested: unknown): RadiusDecision {
  const raw = Number(requested);
  const asked = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RADIUS_KM;
  const bounded = Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, asked));
  return {
    radiusKm: bounded,
    requestedRadiusKm: asked,
    clamped: bounded !== asked,
  };
}
