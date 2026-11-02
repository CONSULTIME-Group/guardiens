/**
 * Une conversation disparaît de la liste seulement quand un membre à double
 * rôle, dans l'espace opposé, l'a déjà lue et qu'elle porte sur une annonce.
 * Un fil sans annonce n'a pas de côté (le propriétaire y est simplement la
 * personne qui a écrit la première) et un message non lu reste toujours visible.
 */
export function isConversationVisibleInRole(args: {
  userId: string;
  userRole: string | null | undefined;
  activeRole: string | null | undefined;
  ownerId: string;
  sitterId: string;
  sitId: string | null;
  smallMissionId: string | null;
  unreadCount: number;
}): boolean {
  if (args.userRole !== "both") return true;
  if (!args.sitId || args.smallMissionId) return true;
  if (args.unreadCount > 0) return true;
  if (args.activeRole === "owner") return args.ownerId === args.userId;
  if (args.activeRole === "sitter") return args.sitterId === args.userId;
  return true;
}
