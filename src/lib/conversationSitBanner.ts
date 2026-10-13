/**
 * Lot Z : bandeau de garde d'une conversation.
 *
 * Avant ce lot, « Garde en cours » et « Garde terminée · Laisser un avis »
 * ne lisaient que le statut de l'annonce : chaque candidat non retenu voyait
 * le bandeau de la garde d'un autre et un lien vers /review qui le refusait.
 * Désormais le bandeau exige que la candidature de cette conversation soit
 * acceptée, et l'avis suit isSitReviewable (garde terminée, ou archivée après
 * sa date de fin).
 */
import { isSitReviewable } from "@/lib/reviewEligibility";

export type ConversationSitBanner = "in_progress" | "reviewable" | null;

export function conversationSitBanner(
  input: {
    sitStatus?: string | null;
    sitEndDate?: string | null;
    applicationStatus?: string | null;
  },
  now: Date = new Date(),
): ConversationSitBanner {
  if (input.applicationStatus !== "accepted") return null;
  if (input.sitStatus === "in_progress") return "in_progress";
  if (isSitReviewable({ status: input.sitStatus, end_date: input.sitEndDate }, now)) return "reviewable";
  return null;
}
