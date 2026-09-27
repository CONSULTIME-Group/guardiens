/**
 * Règle d'affichage du pourcentage d'affinité (lot D0, 27/09/2026).
 * Un pourcentage ne s'affiche que s'il repose sur au moins 4 critères
 * effectivement comparés entre les deux profils. En dessous, seules les
 * raisons s'affichent : un 100 % bâti sur deux critères n'est pas crédible.
 */
export const AFFINITY_MIN_COMPARED_CRITERIA = 4;

export function canShowAffinityPercent(
  result: { total?: number | null } | null | undefined,
): boolean {
  return (result?.total ?? 0) >= AFFINITY_MIN_COMPARED_CRITERIA;
}

/** Ligne affichée à un propriétaire sans annonce publiée. */
export const AFFINITY_AFTER_PUBLISH_LINE = "L'affinité se calcule dès votre annonce publiée.";
