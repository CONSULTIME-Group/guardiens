/**
 * Construit les lignes à insérer dans `badge_attributions` à partir des
 * écussons sélectionnés, en respectant la direction de l'avis.
 */
export function buildBadgeAttributionRows(opts: {
  selectedBadges: string[];
  revieweeId: string;
  reviewerId: string;
  sitId: string;
}) {
  if (opts.selectedBadges.length === 0) return [];
  return opts.selectedBadges.map((badge_id) => ({
    user_id: opts.revieweeId,
    giver_id: opts.reviewerId,
    sit_id: opts.sitId,
    badge_id,
    is_manual: false,
  }));
}
