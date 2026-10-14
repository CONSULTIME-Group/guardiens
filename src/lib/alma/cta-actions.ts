/**
 * Mapping des `cta_action` sémantiques des usage_nudge vers la vraie URL de
 * navigation. Ajouter un nouveau cta_action côté banque = ajouter une entrée
 * ici + le check contraint côté migration.
 *
 * Aucune de ces routes n'est un dead-end : toutes sont câblées dans App.tsx.
 */
export type AlmaCtaAction =
  | "draft_sit"
  | "create_entraide"
  | "browse_sitters"
  | "complete_profile"
  | "browse_sits"
  | "view_applications"
  | "none";

export const ALMA_CTA_ACTION_TO_URL: Record<Exclude<AlmaCtaAction, "none">, string> = {
  draft_sit: "/dashboard?intent=draft_from_prompt",
  create_entraide: "/petites-missions/creer",
  browse_sitters: "/recherche-gardiens",
  complete_profile: "/profile",
  // Lot A2 (audit Alma du 14/10/2026) : browse_sits sert aux gardiens, la
  // liste des gardes est /annonces (/sits est « Mes annonces » du
  // propriétaire) ; view_applications sans ?tab=, que le tableau de bord
  // ignore : les candidatures reçues se lisent depuis « Mes annonces ».
  browse_sits: "/annonces",
  view_applications: "/sits",
};

export function resolveAlmaCtaHref(action: string | null | undefined): string | null {
  if (!action || action === "none") return null;
  return (ALMA_CTA_ACTION_TO_URL as Record<string, string>)[action] ?? null;
}
