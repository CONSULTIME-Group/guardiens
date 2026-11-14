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

/**
 * Lot RCH4 (14/11/2026, arène « page Recherche », décision 3 de Jérémie) :
 * rayon d'alerte proposé depuis la recherche, jamais « France entière ».
 * Distance déclarée d (rayon de mobilité du gardien) : 30 km si d ≤ 30,
 * 50 km si d ≤ 50, sinon 100 km. Sans distance déclarée, 100 km. La valeur
 * 30 par défaut du formulaire n'est pas une déclaration (doctrine affinité).
 * Depuis un rayon de recherche, jamais moins de 30 km.
 */
export const SEARCH_ALERT_MIN_RADIUS_KM = 30;

export function proposedAlertRadius(declaredKm: number | null | undefined): 30 | 50 | 100 {
  if (typeof declaredKm !== "number" || !Number.isFinite(declaredKm) || declaredKm <= 0) return 100;
  if (declaredKm <= 30) return 30;
  if (declaredKm <= 50) return 50;
  return 100;
}

export function searchAlertRadius(searchRadiusKm: number | null | undefined): 30 | 50 | 100 {
  if (typeof searchRadiusKm !== "number" || !Number.isFinite(searchRadiusKm)) return 100;
  const snapped = snapToAllowedRadius(Math.max(SEARCH_ALERT_MIN_RADIUS_KM, searchRadiusKm));
  return (snapped < SEARCH_ALERT_MIN_RADIUS_KM ? SEARCH_ALERT_MIN_RADIUS_KM : snapped) as 30 | 50 | 100;
}
