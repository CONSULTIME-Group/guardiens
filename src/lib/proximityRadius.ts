/**
 * Rayon des diffusions de proximité, côté interface admin.
 * Doit rester aligné sur supabase/functions/_shared/proximity-radius.ts, qui
 * fait foi. Le rayon n'est plus plafonné à 200 km : c'est un choix admin. La
 * garde contre la sur-sollicitation est la déduplication sur 7 jours.
 */
export const MAX_RADIUS_KM = 20000;
export const LARGE_RADIUS_WARN_KM = 200;
export const MIN_RADIUS_KM = 1;
export const DEFAULT_RADIUS_KM = 30;
export const PROXIMITY_DEDUP_DAYS = 7;

export function clampRadiusInput(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RADIUS_KM;
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, n));
}
