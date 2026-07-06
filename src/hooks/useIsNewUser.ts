/**
 * Hooks & helpers de détection du nouveau propriétaire / nouveau gardien.
 *
 * Utilisés par les dashboards pour appliquer les préceptes UX 2026
 * (une seule NBA dominante, pas de surfaces concurrentes above the fold).
 */

export function useIsNewOwner(input: {
  sitsCount: number;
  petsCount: number;
}): boolean {
  return input.sitsCount === 0 && input.petsCount === 0;
}

export function useIsNewSitter(input: {
  totalApps: number;
  completedSits: number;
}): boolean {
  return input.totalApps === 0 && input.completedSits === 0;
}

/**
 * "Early owner" = propriétaire qui n'a encore rien mis en ligne.
 * Vrai tant qu'il n'a AUCUNE annonce publiée (peu importe le nombre de
 * brouillons) ET aucun animal enregistré.
 *
 * Utilisé pour couvrir le cas d'un owner qui a déjà créé un draft mais
 * dont le dashboard resterait "vide" si on se basait sur `sits.length`.
 */
export function isEarlyOwner(input: {
  sits: Array<{ status?: string | null }>;
  pets: Array<unknown>;
}): boolean {
  if (input.pets.length > 0) return false;
  if (input.sits.length === 0) return true;
  return input.sits.every((s) => s.status === "draft");
}

/**
 * Détermine la NBA dominante du dashboard owner.
 * Un et un seul variant est actif à la fois (précepte 2026).
 */
export type OwnerNbaVariant =
  | "sit_draft_from_prompt"
  | "draft_resume"
  | "priority_action";

export function computeOwnerNbaVariant(input: {
  isNewOwner: boolean;
  hasDraft: boolean;
}): OwnerNbaVariant {
  if (input.hasDraft) return "draft_resume";
  if (input.isNewOwner) return "sit_draft_from_prompt";
  return "priority_action";
}
