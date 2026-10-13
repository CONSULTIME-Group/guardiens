/**
 * Lot Z2 (audit C-18 du 13/10/2026) : le bloc d'invitation des personnes
 * proches (MatchedHelpersInviteBlock) reste visible pour l'auteur tant que son
 * besoin est ouvert et qu'aucune proposition vivante n'est arrivée.
 *
 * Avant : le bloc n'existait qu'avec ?published=1, effacé à la fermeture de la
 * bannière de publication ; l'auteur qui revenait sur son besoin ne pouvait
 * plus inviter personne.
 */
export interface MissionInviteBlockInput {
  isAuthor: boolean;
  status: string | null | undefined;
  responses: Array<{ status?: string | null }> | null | undefined;
}

/** Une proposition en attente ou retenue : l'auteur a déjà de quoi avancer. */
const LIVE_RESPONSE_STATUSES = new Set(["pending", "accepted"]);

export function showMissionInviteBlock({ isAuthor, status, responses }: MissionInviteBlockInput): boolean {
  if (!isAuthor || status !== "open") return false;
  return !(responses ?? []).some((r) => LIVE_RESPONSE_STATUSES.has(String(r?.status)));
}
