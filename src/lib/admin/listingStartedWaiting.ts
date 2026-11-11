/**
 * Lot ADM20 (audit admin du 11/11/2026) : annonce encore « Cherche un
 * gardien » alors que sa date de début est passée, avec au moins une
 * candidature en attente. Même règle que la file startedWaiting de
 * admin_human_queues (drizzle 0139), la ligne de la vue d'ensemble et le
 * filtre « Commencées, candidats en attente » de /admin/listings.
 *
 * Le 11/11/2026, deux annonces étaient dans ce cas (10 et 1 candidatures),
 * hors de la tuile « Candidatures sans réponse » (gardes à venir seulement)
 * et hors de la liste de travail.
 */
import { isPastDay } from "@/lib/calendarDate";

export interface StartedWaitingInput {
  status?: string | null;
  start_date?: string | null;
  activeApplications: number | null | undefined;
}

export function isListingStartedWaiting(l: StartedWaitingInput, now: Date = new Date()): boolean {
  if (l.status !== "published") return false;
  if (!l.start_date || !isPastDay(l.start_date, now)) return false;
  return typeof l.activeApplications === "number" && l.activeApplications > 0;
}

/**
 * Message type aux candidats d'une annonce commencée sans réponse du
 * propriétaire (texte de Jérémie, 11/11/2026 : « de notre côté on a aussi
 * relancé le propriétaire, la réponse lui appartient »). Formulations
 * affirmatives, aucun engagement à trouver une garde.
 */
export function startedSitCandidateMessage(input: { sitterFirstName?: string | null; sitTitle: string; ownerFirstName?: string | null }): { subject: string; body: string } {
  const hello = input.sitterFirstName?.trim() ? `Bonjour ${input.sitterFirstName.trim()},` : "Bonjour,";
  const owner = input.ownerFirstName?.trim() || "le propriétaire";
  return {
    subject: "Votre candidature : des nouvelles de notre côté",
    body: [
      hello,
      `Vous avez candidaté à l'annonce « ${input.sitTitle.trim()} ». La période de cette garde a commencé et ${owner} a laissé votre candidature en attente.`,
      `De notre côté, nous avons relancé ${owner} à plusieurs reprises. La réponse à une candidature appartient au propriétaire, et nous tenons à vous donner des nouvelles plutôt que de vous laisser attendre.`,
      "Votre candidature se clôt donc aujourd'hui. Votre profil reste visible des propriétaires, et d'autres gardes sont ouvertes en ce moment : vous les trouverez dans la recherche.",
      "Merci pour votre disponibilité et pour la qualité de votre candidature.",
      "Jérémie, Guardiens",
    ].join("\n\n"),
  };
}
