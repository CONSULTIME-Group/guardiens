/**
 * Ownership / authorship guards.
 *
 * Centralise la logique « cet utilisateur est-il l'auteur de cette ressource ? »
 * pour éviter les variantes locales qui pourraient laisser passer un cas de
 * type `undefined === undefined`, des chaînes vides, ou des comparaisons
 * non strictes.
 *
 * Règle unique : auteur ⇔ utilisateur connecté (id non vide) ET ressource
 * chargée (ownerId non vide) ET égalité stricte des deux ids.
 *
 * IMPORTANT : ce guard est purement côté client. Il sert à piloter l'UI.
 * La sécurité réelle reste assurée par les politiques RLS de la base.
 */

export type MaybeId = string | null | undefined;

/**
 * Retourne true uniquement si `viewerId` et `ownerId` sont des chaînes
 * non vides strictement égales.
 */
export function isOwner(viewerId: MaybeId, ownerId: MaybeId): boolean {
  if (typeof viewerId !== "string" || typeof ownerId !== "string") return false;
  if (viewerId.length === 0 || ownerId.length === 0) return false;
  return viewerId === ownerId;
}

/**
 * Variante orientée objet : prend la ressource et un sélecteur d'owner id.
 * Pratique quand on travaille avec un objet possiblement nul.
 */
export function isAuthorOf<T extends object>(
  viewerId: MaybeId,
  resource: T | null | undefined,
  ownerKey: keyof T = "user_id" as keyof T,
): boolean {
  if (!resource) return false;
  const ownerId = resource[ownerKey];
  return isOwner(viewerId, typeof ownerId === "string" ? ownerId : null);
}
