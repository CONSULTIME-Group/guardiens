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
 * "No active sit" = aucune annonce publiée ou confirmée (in-flight).
 * Vrai si l'owner n'a aucune sit, ou si toutes ses sits sont dans un
 * statut non-actif : draft, archived, cancelled, completed.
 *
 * Indépendant des animaux : couvre le cas d'un owner qui a des pets et
 * un historique d'annonces (archived/completed après saison) mais rien
 * en ligne actuellement. Alma doit rester proactive dans ce cas.
 */
const NON_ACTIVE_SIT_STATUSES = new Set([
  "draft",
  "archived",
  "cancelled",
  "completed",
]);

export function hasNoActiveSit(
  sits: Array<{ status?: string | null }>,
): boolean {
  if (sits.length === 0) return true;
  return sits.every((s) => NON_ACTIVE_SIT_STATUSES.has(s.status ?? ""));
}

/**
 * Détermine la NBA dominante du dashboard owner.
 * Un et un seul variant est actif à la fois (précepte 2026).
 */
export type OwnerNbaVariant =
  | "sit_draft_from_prompt"
  | "sit_draft_from_prompt_with_existing_draft"
  | "draft_resume"
  | "no_active_sit"
  | "priority_action";

export function computeOwnerNbaVariant(input: {
  isNewOwner: boolean;
  hasDraft: boolean;
  hasNoActiveSit?: boolean;
}): OwnerNbaVariant {
  // Un draft existe : la NBA dominante est DraftResumeCard. Si le concierge
  // IA (SitDraftFromPrompt) est également affiché en secondaire, on trace un
  // variant distinct pour ventiler l'usage.
  if (input.hasDraft) {
    if (input.hasNoActiveSit) return "sit_draft_from_prompt_with_existing_draft";
    return "draft_resume";
  }
  if (input.isNewOwner) return "sit_draft_from_prompt";
  if (input.hasNoActiveSit) return "no_active_sit";
  return "priority_action";
}
