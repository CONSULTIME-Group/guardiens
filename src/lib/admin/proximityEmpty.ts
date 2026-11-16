/**
 * Lot ANN-3 (16/11/2026) : quand l'aperçu de diffusion ne cible personne,
 * dire pourquoi. Le 16/11, la garde de Montcaret affichait « Aucun gardien
 * dans ce rayon » alors que ses 2 gardiens à proximité avaient déjà reçu
 * l'annonce (à la publication, ou par une diffusion de moins de 7 jours).
 */
export function proximityEmptyText(excludedRecent: number | null | undefined, radiusKm: number): string {
  const n = Math.max(0, Number(excludedRecent) || 0);
  if (n === 0) return `Aucun gardien dans un rayon de ${radiusKm} km. Élargissez le rayon pour toucher plus de monde.`;
  const who = n > 1 ? `Les ${n} gardiens de ce rayon ont` : "Le gardien de ce rayon a";
  return `${who} déjà reçu cette annonce (à sa publication ou lors d'une diffusion de moins de 7 jours). Élargissez le rayon pour en prévenir d'autres.`;
}
