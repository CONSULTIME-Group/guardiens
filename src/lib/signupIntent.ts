/**
 * Intention d'inscription déduite du paramètre redirect.
 *
 * Un role explicite dans l'URL gagne toujours : dans ce cas on ne déduit rien.
 * Les intentions servent à présélectionner un rôle, passer directement à
 * l'étape 2 et afficher un bandeau de contexte.
 */

export type SignupIntent = "owner" | "sitter" | "entraide";

export type SignupRole = "owner" | "sitter" | "both";

/**
 * Déduit l'intention à partir du chemin de redirection.
 * Retourne null si un rôle explicite est fourni ou si rien ne correspond.
 */
export function detectSignupIntent(
  redirectTarget: string | null | undefined,
  presetRole?: SignupRole | null,
): SignupIntent | null {
  if (presetRole) return null;
  if (!redirectTarget) return null;
  if (redirectTarget.startsWith("/gardiens/")) return "owner";
  if (redirectTarget.startsWith("/annonces/")) return "sitter";
  if (redirectTarget.startsWith("/projets")) return "entraide";
  if (redirectTarget.startsWith("/petites-missions")) return "entraide";
  return null;
}

/** Rôle présélectionné pour une intention donnée. */
export function roleForSignupIntent(intent: SignupIntent | null): SignupRole | null {
  if (intent === "owner") return "owner";
  if (intent === "sitter") return "sitter";
  if (intent === "entraide") return "both";
  return null;
}

/**
 * Clé i18n du bandeau de contexte, sous register_page.intent_banner.
 * L'intention entraide se décline selon la destination exacte.
 */
export function signupIntentBannerKey(
  intent: SignupIntent | null,
  redirectTarget: string | null | undefined,
): string | null {
  if (!intent) return null;
  if (intent !== "entraide") return intent;
  if (redirectTarget?.startsWith("/projets/publier")) return "entraide_projet";
  if (redirectTarget?.startsWith("/petites-missions")) return "entraide";
  return "projets";
}
