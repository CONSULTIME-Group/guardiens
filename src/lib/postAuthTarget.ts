/**
 * Destination post-inscription selon le rôle choisi.
 *
 * Décision produit du 16/08/2026 (tunnel post-inscription propriétaire,
 * lot 1) : un propriétaire fraîchement inscrit atterrit directement sur la
 * création d'annonce, marquée source=signup pour la mesure de cohorte.
 * Le garde-fou d'affinité (OnboardingGate) s'intercale ensuite sans casser
 * la destination finale, transportée par le paramètre redirect.
 *
 * Une redirection explicite (?redirect=, déjà assainie par sanitizeRedirect)
 * reste toujours prioritaire. Le rôle « both » garde le tableau de bord :
 * choix conservateur, le tunnel ne s'impose qu'au rôle owner explicite.
 */

export type SignupRole = "owner" | "sitter" | "both" | "pro";

/** Cible du tunnel de création pour un propriétaire fraîchement inscrit. */
export const OWNER_SIGNUP_TUNNEL_TARGET = "/sits/create?source=signup";

export function resolvePostAuthTarget(
  role: SignupRole | null,
  redirectTarget: string | null,
): string {
  if (role === "pro") return "/pros/inscription";
  if (redirectTarget) return redirectTarget;
  if (role === "owner") return OWNER_SIGNUP_TUNNEL_TARGET;
  return "/dashboard";
}
