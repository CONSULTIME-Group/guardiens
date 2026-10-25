/**
 * Lot E17 « La boucle tenue » : côté aidant, un besoin clos sans choix se
 * distingue d'une autre personne choisie.
 *
 * La clôture d'un besoin (close_pending_responses_on_mission_close) passe les
 * réponses en attente en declined avec decline_reason « mission_closed »
 * (migration 0099). Sans motif, declined garde son sens historique : refus de
 * l'auteur ou autre personne choisie.
 */
export const CLOSURE_DECLINE_REASON = "mission_closed";
export const CLOSURE_DECLINE_TITLE = "Ce besoin est clos";
export const CLOSURE_DECLINE_TEXT = "Ce besoin est clos, merci pour votre proposition.";

export function isClosureDecline(response: { status?: string | null; decline_reason?: string | null } | null | undefined): boolean {
  return !!response && response.status === "declined" && response.decline_reason === CLOSURE_DECLINE_REASON;
}
