/**
 * Lot A10 : définition unique du taux d'ouverture dans l'admin.
 * Taux d'ouverture = emails ouverts / emails livrés. Jamais sur les envoyés,
 * jamais de repli silencieux sur un autre dénominateur.
 */
export function openRate(opened: number, delivered: number): number | null {
  if (!delivered || delivered <= 0) return null;
  return opened / delivered;
}

/** Pourcentage arrondi à une décimale, null si aucun email livré. */
export function openRatePct(opened: number, delivered: number): number | null {
  const r = openRate(opened, delivered);
  return r === null ? null : Math.round(r * 1000) / 10;
}

/** Libellé français : « 12,3 % », ou « · » si aucun email livré. */
export function formatOpenRate(opened: number, delivered: number): string {
  const p = openRatePct(opened, delivered);
  return p === null ? "·" : `${p.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

export const OPEN_RATE_HINT = "Ouverts sur livrés";
