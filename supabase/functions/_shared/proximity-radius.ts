// Plafond de rayon des diffusions de proximité (send-listing-proximity).
//
// Un rayon de 800 km rend le message faux : l'objet affirme « près de chez
// vous » à une personne située à 779 km. Le plafond est appliqué côté serveur,
// l'UI admin n'étant qu'une commodité.
export const MAX_RADIUS_KM = 200;
export const MIN_RADIUS_KM = 1;
export const DEFAULT_RADIUS_KM = 30;

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
