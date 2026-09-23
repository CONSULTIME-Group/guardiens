/**
 * Promesse d'audience affichée avant publication d'un besoin.
 *
 * Le nombre vient de `mission_wave_audience_preview`, qui applique exactement
 * les filtres et le rayon de `mission_wave_audience`, la fonction du moteur de
 * vagues. Sous dix personnes, on annonce le nombre réel. Au-delà, la première
 * vague touche dix personnes, une autre suit 48 heures plus tard.
 */
export const WAVE_PROMISE_SIZE = 10;

export function waveAudienceMessage(count: number): string {
  if (count <= 0) {
    return "Votre besoin reste visible sur la page Entraide, et les personnes qui rejoignent votre secteur le découvriront.";
  }
  if (count === 1) {
    return "La personne disponible la plus proche de chez vous sera prévenue.";
  }
  if (count < WAVE_PROMISE_SIZE) {
    return `Les ${count} personnes disponibles autour de chez vous seront prévenues.`;
  }
  return "Les 10 personnes disponibles les plus proches seront prévenues tout de suite, puis 10 autres 48 h plus tard si besoin.";
}
