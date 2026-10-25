/**
 * Single source of truth for valid alert radii (km).
 * Must match the validation in the SQL RPC `create_alert_from_search`
 * (see migrations) which raises INVALID_RADIUS for any other value.
 */
export const ALLOWED_ALERT_RADII = [5, 15, 30, 50, 100] as const;

export type AllowedAlertRadius = (typeof ALLOWED_ALERT_RADII)[number];

/**
 * Snap an arbitrary radius (km) to the nearest allowed value.
 * In case of a tie, the smaller allowed value is returned (predictable).
 */
export function snapToAllowedRadius(r: number): AllowedAlertRadius {
  if (!Number.isFinite(r)) return 15;
  return ALLOWED_ALERT_RADII.reduce((prev, curr) =>
    Math.abs(curr - r) < Math.abs(prev - r) ? curr : prev
  ) as AllowedAlertRadius;
}

export function isAllowedRadius(r: number): r is AllowedAlertRadius {
  return (ALLOWED_ALERT_RADII as readonly number[]).includes(r);
}

/**
 * Lot E20 « Vague proche » : l'entraide sollicite au plus à 30 km
 * (enqueue_mission_wave, migration 0098). Une alerte « Entraide » seule
 * propose donc 5, 15 ou 30 km ; une alerte qui sert aussi aux gardes garde
 * 50 et 100 km pour les gardes, avec une phrase pour l'entraide.
 */
export const MUTUAL_AID_MAX_RADIUS_KM = 30;
export const MUTUAL_AID_RADIUS_LINE = "Pour l'entraide, vous recevez les besoins à moins de 30 km.";

export function alertRadiusOptions(alertTypes: readonly string[]): readonly number[] {
  const mutualAidOnly = alertTypes.includes("missions") && !alertTypes.includes("gardes");
  return mutualAidOnly
    ? ALLOWED_ALERT_RADII.filter((r) => r <= MUTUAL_AID_MAX_RADIUS_KM)
    : ALLOWED_ALERT_RADII;
}

/** Rayon gardé dans les options proposées (une alerte « Entraide » seule redescend à 30 km). */
export function clampAlertRadius(radiusKm: number, alertTypes: readonly string[]): number {
  const options = alertRadiusOptions(alertTypes);
  return options.includes(radiusKm) ? radiusKm : Math.min(radiusKm, options[options.length - 1]);
}

/** La phrase entraide s'affiche quand l'alerte couvre l'entraide au-delà de 30 km. */
export function showMutualAidRadiusLine(
  alertTypes: readonly string[],
  zoneType: string,
  radiusKm: number | null | undefined,
): boolean {
  if (!alertTypes.includes("missions")) return false;
  return !(zoneType === "rayon" && typeof radiusKm === "number" && radiusKm <= MUTUAL_AID_MAX_RADIUS_KM);
}
