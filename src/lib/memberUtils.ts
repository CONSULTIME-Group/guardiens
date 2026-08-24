/**
 * Affichage d'un membre dont le compte a été effacé.
 *
 * L'effacement anonymise la ligne profiles au lieu de la détruire : les avis
 * et les messages restent rattachés, mais aucune donnée personnelle ne subsiste.
 * Un membre supprimé s'affiche donc sous un nom neutre, sans photo et sans lien
 * vers une fiche publique.
 */

import { publicFirstName } from "@/lib/displayName";

export const DELETED_MEMBER_NAME = "Membre supprimé";

export interface MemberLike {
  first_name?: string | null;
  account_status?: string | null;
  is_deleted?: boolean | null;
  avatar_url?: string | null;
}

export function isDeletedMember(member: MemberLike | null | undefined): boolean {
  if (!member) return false;
  if (member.is_deleted) return true;
  if (member.account_status === "deleted") return true;
  return member.first_name === DELETED_MEMBER_NAME;
}

/** Nom affichable, jamais vide. */
export function getMemberDisplayName(
  member: MemberLike | null | undefined,
  fallback = "Membre",
): string {
  if (!member) return fallback;
  if (isDeletedMember(member)) return DELETED_MEMBER_NAME;
  return member.first_name?.trim() || fallback;
}

/**
 * Prénom affichable sur une surface publique, jamais vide.
 * Ne garde que le premier mot du champ prénom, certains membres y
 * saisissent leur nom complet. Un membre supprimé garde son nom neutre.
 */
export function getMemberPublicFirstName(
  member: MemberLike | null | undefined,
  fallback = "Membre",
): string {
  if (!member) return fallback;
  if (isDeletedMember(member)) return DELETED_MEMBER_NAME;
  return publicFirstName(member.first_name) || fallback;
}

/** Photo affichable, nulle pour un membre supprimé. */
export function getMemberAvatarUrl(
  member: MemberLike | null | undefined,
): string | null {
  if (!member || isDeletedMember(member)) return null;
  return member.avatar_url || null;
}

/** Initiale de repli pour l'avatar neutre. */
export function getMemberInitial(
  member: MemberLike | null | undefined,
  fallback = "?",
): string {
  if (isDeletedMember(member)) return "?";
  const name = member?.first_name?.trim();
  return name ? name.charAt(0).toUpperCase() : fallback;
}

/** Un membre supprimé n'a plus de fiche publique : aucun lien ne doit pointer vers lui. */
export function isMemberLinkable(member: MemberLike | null | undefined): boolean {
  return !isDeletedMember(member);
}
