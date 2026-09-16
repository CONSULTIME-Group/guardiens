/**
 * Publication d'une demande ou d'une offre d'entraide.
 *
 * Décision produit : publier un coup de main n'est soumis à aucun seuil de
 * complétion de profil. Tout membre connecté peut publier. Le seuil de 40 %
 * reste exigé pour RÉPONDRE au coup de main de quelqu'un d'autre, ce point
 * est porté par `useAccessLevel().canApplyMissions` et n'est pas touché ici.
 */
import { MIN_COMPLETION_TO_APPLY } from "@/hooks/useAccessLevel";

/** Seul prérequis de publication : être connecté. */
export const canPublishSmallMission = (isAuthenticated: boolean): boolean =>
  isAuthenticated;

/**
 * Invitation douce, jamais bloquante : un profil sous le seuil reçoit moins
 * de réponses, on le dit sans fermer la porte.
 */
export const shouldNudgeProfileCompletion = (completion: number): boolean =>
  completion < MIN_COMPLETION_TO_APPLY;
