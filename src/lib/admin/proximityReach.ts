/**
 * Lot DIFF1 (16/11/2026) : phrase sous le compte de la diffusion de proximité.
 *
 * send-listing-proximity retire de la cible les gardiens déjà prévenus de
 * l'annonce (alerte de publication, diffusion précédente, fenêtre de 7 jours)
 * et renvoie ce nombre dans excluded_recent. La fenêtre affichait seulement
 * « 0 gardien ciblé » alors que la vue d'ensemble annonçait 2 gardiens à
 * proximité (Montcaret, 16/11/2026 : 2 gardiens à 30 km, tous deux déjà
 * prévenus à la publication, parmi 137).
 */
export function proximityReachLine(count: number, excludedRecent: number | null | undefined): string | null {
  const already = Math.max(0, Math.floor(Number(excludedRecent) || 0));
  if (already === 0) return null;
  const inRadius = count + already;
  const gardiens = `${inRadius} gardien${inRadius > 1 ? "s" : ""} dans le rayon`;
  if (count === 0) {
    return `${gardiens}, ${inRadius > 1 ? "tous déjà prévenus" : "déjà prévenu"} de cette annonce. Élargissez le rayon pour en toucher d'autres.`;
  }
  return `${gardiens}, dont ${already} déjà prévenu${already > 1 ? "s" : ""} de cette annonce.`;
}
