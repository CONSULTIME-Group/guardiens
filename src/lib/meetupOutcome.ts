/**
 * Lot E19 : issues de la fin d'un coup de main et textes associés.
 *
 * « happened » (le coup de main a eu lieu), « not_happened » (à
 * reprogrammer), « cancelled » (le coup de main a été annulé : ni rencontre
 * ni avis). L'issue part explicitement vers mission-quick-action, qui la
 * transmet à confirm_mission_meetup (p_outcome).
 */
import {
  HUMAN_REVIEW_SENTENCE,
  automatedRuleStatement,
} from "../../supabase/functions/_shared/moderation-rules.ts";

export type MeetupOutcome = "happened" | "not_happened" | "cancelled";

export const MEETUP_OUTCOMES: readonly MeetupOutcome[] = ["happened", "not_happened", "cancelled"];

export const MEETUP_CANCELLED_TEXT =
  "C'est noté : le coup de main est annulé. Merci de nous l'avoir dit.";

/** Toast du tableau de bord après une réponse enregistrée. */
export function meetupSavedToast(outcome: MeetupOutcome): string {
  if (outcome === "happened") return "C'est noté, merci.";
  if (outcome === "cancelled") return "C'est noté. Le coup de main est annulé.";
  return "C'est noté. Votre besoin reste suivi.";
}

/**
 * Mot retenu par moderate-content (CGU 14.4 et 14.5) : la réponse est
 * enregistrée, le mot est retiré, la règle et l'examen humain sont cités.
 */
export function meetupWordRetainedNotice(rule?: string | null): string {
  return [
    "Votre mot est retenu par une vérification automatique et retiré de votre réponse.",
    `Règle en cause : ${automatedRuleStatement(rule)}`,
    HUMAN_REVIEW_SENTENCE,
  ].join(" ");
}
