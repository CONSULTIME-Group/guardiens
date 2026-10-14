/**
 * Lot Z2 (audit B-12 du 13/10/2026) : une seule règle pour les deux barres de
 * candidature de la fiche gardien (barre du haut, toutes tailles d'écran, et
 * barre fixe mobile).
 *
 * Avant : la barre du haut exigeait l'espace gardien et une annonce publiée,
 * la barre fixe mobile s'affichait toujours. Un double rôle en espace
 * propriétaire voyait « Postuler » sur mobile et rien sur ordinateur, et une
 * garde confirmée gardait sa barre mobile.
 *
 *  - apply : espace gardien actif, annonce publiée ; les deux barres.
 *  - switch_space : double rôle en espace propriétaire, annonce publiée ; un
 *    bouton qui bascule en espace gardien (même bascule que ?espace=gardien).
 *  - none : annonce non publiée, ou compte sans espace gardien.
 */
export type SitApplySurface = "apply" | "switch_space" | "none";

export const SWITCH_TO_SITTER_LABEL = "Passer en espace gardien pour postuler";

export interface SitApplySurfaceInput {
  activeRole: string | null | undefined;
  userRole: string | null | undefined;
  sitStatus: string | null | undefined;
}

export function sitApplySurface({ activeRole, userRole, sitStatus }: SitApplySurfaceInput): SitApplySurface {
  if (sitStatus !== "published") return "none";
  if (activeRole === "sitter") return "apply";
  if (userRole === "both") return "switch_space";
  return "none";
}
