/**
 * Raisons du moteur lues par le gardien (lot D3). Le moteur les écrit pour le
 * propriétaire (« comme vous le souhaitez ») ; côté gardien elles deviennent
 * « comme demandé ». Affichage seulement, moteur inchangé.
 */
export function sitterSideReason(label: string): string {
  return label
    .replace(/^Gardien expérimenté\b/, "Expérimenté")
    .replace(/, comme vous le (souhaitez|demandez)\s*$/, ", comme demandé");
}
