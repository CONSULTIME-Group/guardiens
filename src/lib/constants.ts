/**
 * Constantes métier centralisées.
 * Importez depuis ce fichier au lieu de dupliquer les valeurs.
 */

// ── Dates clés du lancement ──
export const LAUNCH_DATE = new Date("2026-05-14T00:00:00Z");
export const LAUNCH_START = new Date("2026-04-07T00:00:00Z");
export const FOUNDER_START = new Date("2026-05-13T00:00:00Z");
export const GRACE_END = new Date("2026-06-14T00:00:00Z");

// ── Helpers temporels ──
export const isBeforeLaunch = () => new Date() < LAUNCH_DATE;
export const isInGracePeriod = () => {
  const now = new Date();
  return now >= LAUNCH_DATE && now < GRACE_END;
};

// ── Tarifs (en euros) ──
export const PRICE_MONTHLY = 9;
export const PRICE_ONESHOT = 12;
export const PRORATA_DISCOUNT = 0.8; // 20 % de réduction

// ── Seuils ──
export const PROFILE_COMPLETION_THRESHOLD = 60; // pourcentage minimum
