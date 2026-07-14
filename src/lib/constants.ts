/**
 * Constantes métier centralisées.
 * Importez depuis ce fichier au lieu de dupliquer les valeurs.
 */

// ── Dates clés du lancement ──
// Période à 0 € pour TOUS prolongée jusqu'au 30 septembre 2026 inclus.
// Abonnement gardien requis à partir du 1er octobre 2026.
export const LAUNCH_DATE = new Date("2026-10-01T00:00:00Z");
export const FOUNDER_START = new Date("2026-09-30T00:00:00Z");
export const GRACE_END = new Date("2026-10-01T00:00:00Z");

// ── Helpers temporels ──
export const isBeforeLaunch = () => new Date() < LAUNCH_DATE;
// La bannière "À 0 € pour tous" reste visible tant que l'on est avant GRACE_END.
export const isInGracePeriod = () => new Date() < GRACE_END;
