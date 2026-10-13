/**
 * Lot X3a (13/10/2026), constat B-03 : sur une garde confirmée, la fiche
 * montrait à tout gardien connecté « Garde confirmée, Préparez l'arrivée »,
 * et à tout candidat, refusé compris, « Annuler ma participation ». Chaque
 * acceptation produit des candidats refusés automatiquement par
 * accept_application qui reçoivent un lien vers cette fiche.
 *
 * - chosen : candidature acceptée, garde confirmée, en cours ou terminée ;
 * - other_chosen : candidature non retenue sur une garde confirmée ou en cours ;
 * - none : tout le reste (pas de candidature, annonce encore ouverte).
 */
export type SitterPresence = "chosen" | "other_chosen" | "none";

export function sitterPresenceOnSit(
  sitStatus: string | null | undefined,
  applicationStatus: string | null | undefined,
): SitterPresence {
  const s = String(sitStatus);
  if (applicationStatus === "accepted" && (s === "confirmed" || s === "in_progress" || s === "completed")) {
    return "chosen";
  }
  if (applicationStatus && applicationStatus !== "accepted" && (s === "confirmed" || s === "in_progress")) {
    return "other_chosen";
  }
  return "none";
}
