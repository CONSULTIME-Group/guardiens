/**
 * Choix proposé à la sortie du formulaire de création quand l'annonce est
 * publiable mais pas encore publiée : publier maintenant, ou garder en
 * brouillon.
 *
 * Décision produit du 18/08/2026 : on ne force pas la publication, on force
 * le choix. « Garder en brouillon » est une issue légitime qui ne doit
 * culpabiliser personne. La raison déclarée (facultative, à un clic) est la
 * donnée qui manquait pour comprendre les brouillons dormants ; elle est
 * stockée sur l'annonce et lisible dans /admin/sits-management, puis effacée
 * automatiquement dès que l'annonce passe en ligne.
 */

export const DRAFT_HOLD_REASONS = [
  { id: "dates_uncertain", label: "Mes dates ne sont pas sûres" },
  { id: "want_reread", label: "Je veux encore relire" },
  { id: "still_thinking", label: "Je réfléchis encore" },
  { id: "other", label: "Autre raison" },
] as const;

export type DraftHoldReason = (typeof DRAFT_HOLD_REASONS)[number]["id"];

/** Libellé lisible, y compris côté admin où la réponse est citée telle quelle. */
export const draftHoldReasonLabel = (id: string | null | undefined): string =>
  DRAFT_HOLD_REASONS.find((r) => r.id === id)?.label ?? "Autre raison";

export interface PublishExitChoiceInput {
  /** Tous les critères bloquants de publication sont remplis. */
  canPublish: boolean;
  /** L'annonce a déjà été publiée un jour (dépublication volontaire). */
  publishedAt: string | null;
  /** La publication vient de réussir dans cette session. */
  justPublished: boolean;
}

/**
 * L'écran de choix ne s'affiche que pour un brouillon complet jamais publié.
 * Une annonce non publiable sort sans cet écran : c'est la checklist des
 * éléments manquants qui porte ce cas. Une annonce publiée puis dépubliée est
 * un choix assumé, on ne le redemande pas.
 */
export const shouldOfferPublishExitChoice = (input: PublishExitChoiceInput): boolean =>
  input.canPublish && !input.publishedAt && !input.justPublished;
