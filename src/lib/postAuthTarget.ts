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
 * reste toujours prioritaire. Le rôle « both » entre dans le tunnel depuis
 * le 16/08/2026 : un polyvalent est aussi un propriétaire.
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
  // Un polyvalent (both) est aussi un propriétaire : 93 comptes concernés
  // en base au 16/08/2026. Le tunnel de création d'annonce s'impose à lui
  // comme au rôle owner explicite.
  if (role === "owner" || role === "both") return OWNER_SIGNUP_TUNNEL_TARGET;
  return "/dashboard";
}
