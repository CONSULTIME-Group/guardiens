/**
 * Lot J2-A : « Je postule » depuis Alma ouvre directement le formulaire.
 * Le lien `?postuler=1` suit exactement la logique du bouton de la fiche :
 * candidatures fermées ou déjà envoyées, rien ne s'ouvre ; profil trop
 * court, le panneau de complétion s'ouvre ; sinon, le formulaire.
 */
export function applyDeepLinkTarget(args: {
  param: string | null;
  acceptingApplications: boolean;
  accessLevel: number | null | undefined;
  hasApplied: boolean;
  canApplyGuards: boolean;
}): "apply" | "completion" | null {
  if (args.param !== "1") return null;
  if (!args.acceptingApplications || args.hasApplied) return null;
  if (args.accessLevel === 1) return "completion";
  if (!args.canApplyGuards) return null;
  return "apply";
}
