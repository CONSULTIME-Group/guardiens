/**
 * Libellés du signal « trou de couverture » et de la « tension SEO ».
 *
 * Règle de fond : le nombre affiché est le nombre de gardiens situés dans le
 * rayon de comptage administratif (30 km par défaut) autour du point de la
 * page ville, sans aucun filtre de vérification d'identité. La vérification
 * s'affiche en information secondaire, jamais dans la phrase principale.
 *
 * Piège documenté : ce rayon de comptage n'a rien à voir avec le rayon
 * déclaré par les gardiens dans leur formulaire, ni avec la valeur héritée
 * traitée comme une absence de réponse dans la distribution d'affinité.
 */

export interface CityCoverageMetrics {
  city: string;
  /** Gardiens dans le rayon, vérification comprise ou non. */
  sittersCount: number;
  /** Sous-ensemble vérifié, information seulement. */
  verifiedSittersCount: number;
  radiusKm: number;
  activeSitsCount?: number;
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

/** Fragment « 12 gardiens à moins de 30 km », toujours chiffré. */
export const buildSittersFragment = (m: CityCoverageMetrics): string =>
  m.sittersCount === 0
    ? `aucun gardien à moins de ${m.radiusKm} km`
    : `${m.sittersCount} ${plural(m.sittersCount, "gardien", "gardiens")} à moins de ${m.radiusKm} km`;

/** Mention de vérification, posée à côté du compte, jamais à sa place. */
export const buildVerifiedFragment = (m: CityCoverageMetrics): string => {
  if (m.sittersCount === 0) return "";
  if (m.verifiedSittersCount === 0) return "Aucune identité vérifiée pour l'instant.";
  return `Dont ${m.verifiedSittersCount} avec identité vérifiée.`;
};

/** Phrase principale du signal A, jamais « 0 gardien » quand il y en a. */
export const buildCoverageGapMessage = (m: CityCoverageMetrics): string =>
  m.sittersCount === 0
    ? `Aucun gardien autour de ${m.city}. Cibler la ville en recrutement.`
    : `${m.sittersCount} ${plural(m.sittersCount, "gardien", "gardiens")} à moins de ${m.radiusKm} km de ${m.city}. Cibler la ville en recrutement.`;

/** Phrase principale du signal B. */
export const buildSeoTensionMessage = (
  m: CityCoverageMetrics & { impressions: number; ratio?: number },
): string =>
  `${m.city} attire ${m.impressions} impressions pour ${buildSittersFragment(m)}. La demande arrive plus vite que l'offre.`;
