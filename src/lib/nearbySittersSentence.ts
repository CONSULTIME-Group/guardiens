/**
 * Phrases de proximité des tableaux de bord propriétaire.
 * Chiffre exact du rayon, sans revendication de vérification : le compteur
 * inclut tous les gardiens du rayon, avec ou sans écusson d'identité.
 */
const plural = (n: number) => (n > 1 ? "s" : "");

/** Accueil : « 12 gardiens à 30 km attendent votre prochaine annonce. » */
export function nearbyWaitingSentence(n: number, radiusKm: number): string {
  return `${n} gardien${plural(n)} à ${radiusKm} km ${n > 1 ? "attendent" : "attend"} votre prochaine annonce.`;
}

/** Vedette : « 12 gardiens inscrits à 30 km. » */
export function nearbyRegisteredSentence(n: number, radiusKm: number): string {
  return `${n} gardien${plural(n)} inscrit${plural(n)} à ${radiusKm} km.`;
}
