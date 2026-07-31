/**
 * Plafond de rayon des diffusions de proximité, côté interface admin.
 * Doit rester aligné sur MAX_RADIUS_KM de
 * supabase/functions/_shared/proximity-radius.ts, qui fait foi : le serveur
 * ramène toute demande supérieure à cette valeur.
 */
export const MAX_RADIUS_KM = 200;
export const MIN_RADIUS_KM = 1;
export const DEFAULT_RADIUS_KM = 30;

export function clampRadiusInput(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RADIUS_KM;
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, n));
}
