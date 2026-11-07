/**
 * Date du jour dans le fuseau de l'appareil, au format AAAA-MM-JJ.
 *
 * Le sélecteur de dates du formulaire d'annonce affiche le calendrier local :
 * comparer ses valeurs à la date UTC faisait passer pour « passée » la date
 * du jour d'un propriétaire du Chili, de Polynésie ou des Antilles en soirée.
 */
export function localTodayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
