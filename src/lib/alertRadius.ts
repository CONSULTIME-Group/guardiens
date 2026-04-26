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
