/**
 * Rayon des diffusions de proximité, côté interface admin.
 *
 * Lot P2 (arène du 19/10/2026) : le rayon saisi est plafonné à
 * MAX_RADIUS_KM = 1 000 km, seuil de la diffusion nationale du lot Q1
 * (NATIONWIDE_RADIUS_KM, supabase/functions/_shared/far-listing.ts) : une
 * garde lointaine reste diffusable à tous les gardiens actifs. Au-delà de
 * 200 km, l'envoi demande une confirmation explicite du rayon
 * (« Diffuser à N km ? »). La borne serveur
 * (supabase/functions/_shared/proximity-radius.ts) reste une borne technique
 * large ; la déduplication sur 7 jours y protège de la sur-sollicitation.
 */
export const MAX_RADIUS_KM = 1000;
export const LARGE_RADIUS_WARN_KM = 200;
export const MIN_RADIUS_KM = 1;
export const DEFAULT_RADIUS_KM = 30;
export const PROXIMITY_DEDUP_DAYS = 7;

export function clampRadiusInput(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RADIUS_KM;
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, n));
}

/** Rayon au-delà de 200 km : confirmation explicite avant l'envoi. */
export function needsRadiusConfirmation(radiusKm: number): boolean {
  return Number(radiusKm) > LARGE_RADIUS_WARN_KM;
}

export function radiusConfirmationTitle(radiusKm: number): string {
  return `Diffuser à ${Number(radiusKm).toLocaleString("fr-FR")} km ?`;
}
