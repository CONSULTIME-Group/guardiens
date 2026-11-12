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
  // Lot I1 (12/10/2026) : « Publier mon annonce de garde » mène à /sits/create.
  // Sans intention, une inscription Google sans rôle choisi prenait le rôle par
  // défaut « gardien » (5 comptes sur 16 inscrits à 0 % du 09 au 12/10).
  if (redirectTarget === "/sits/create" || redirectTarget.startsWith("/sits/create?") || redirectTarget.startsWith("/sits/create#")) return "owner";
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
 * Lot E17 : intention écrite sur le compte à l'inscription
 * (profiles.arrival_intent, par handle_new_user). `entraideChosen` vaut
 * l'intention entraide en cours sur la page d'inscription (détectée depuis le
 * redirect, ou choisie sur l'écran C1, et retirée quand la personne choisit
 * un autre rôle). Sinon, l'intention détectée owner ou sitter ; sinon rien.
 */
export function arrivalIntentForSignup(
  entraideChosen: boolean,
  detected: SignupIntent | null,
  /**
   * Lot INS1 (08/11/2026) : rôle réellement choisi sur la page. Le choix gagne
   * sur l'intention déduite du lien : 2 comptes arrivés par « Publier mon
   * annonce » puis inscrits « Je veux garder » portaient arrival_intent owner
   * avec le rôle sitter. Polyvalent : l'intention déduite, s'il y en a une.
   */
  chosenRole?: SignupRole | null,
): SignupIntent | null {
  if (entraideChosen) return "entraide";
  if (chosenRole === "owner" || chosenRole === "sitter") return chosenRole;
  return detected === "owner" || detected === "sitter" ? detected : null;
}

/**
 * Lot INS1 étape 1 (12/11/2026) : l'écran C1 propose deux cases à cocher pour
 * la garde. L'entraide et les sorties sont acquises à tout membre.
 *   une case : le rôle coché, comme avant ;
 *   les deux : rôle polyvalent, parcours propriétaire d'abord ;
 *   aucune   : rôle polyvalent et intention entraide (ancien lien « coup de main »).
 */
export type GuardChoice = "owner" | "sitter" | "both" | "none";

export interface GuardChoiceOutcome {
  choice: GuardChoice;
  role: SignupRole;
  /** L'inscription suit le parcours entraide. */
  entraide: boolean;
  /** Clé arrival.* du rappel affiché à l'étape 2. */
  recapKey: string;
}

export function resolveGuardChoice(owner: boolean, sitter: boolean): GuardChoiceOutcome {
  if (owner && sitter) return { choice: "both", role: "both", entraide: false, recapKey: "arrival.c2.both_recap" };
  if (owner) return { choice: "owner", role: "owner", entraide: false, recapKey: "arrival.c1.owner_title" };
  if (sitter) return { choice: "sitter", role: "sitter", entraide: false, recapKey: "arrival.c1.sitter_title" };
  return { choice: "none", role: roleForSignupIntent("entraide") ?? "both", entraide: true, recapKey: "arrival.c2.entraide_recap" };
}

/** Cases à l'état voulu quand on revient à l'étape 1 avec un rôle déjà posé. */
export function guardBoxesFor(role: SignupRole | null, entraide: boolean): { owner: boolean; sitter: boolean } {
  if (entraide || !role) return { owner: false, sitter: false };
  return { owner: role === "owner" || role === "both", sitter: role === "sitter" || role === "both" };
}

/**
 * Intention écrite sur le compte pour une inscription du parcours v2 : les
 * deux cases cochées valent « propriétaire d'abord ». Les autres cas suivent
 * arrivalIntentForSignup.
 */
export function arrivalIntentForGuardChoice(
  entraideChosen: boolean,
  detected: SignupIntent | null,
  chosenRole: SignupRole | null,
  bothChecked: boolean,
): SignupIntent | null {
  if (!entraideChosen && bothChecked && chosenRole === "both") return "owner";
  return arrivalIntentForSignup(entraideChosen, detected, chosenRole);
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
  if (intent === "owner" && redirectTarget?.startsWith("/sits/create")) return "owner_publish";
  if (intent !== "entraide") return intent;
  if (redirectTarget?.startsWith("/projets/publier")) return "entraide_projet";
  if (redirectTarget?.startsWith("/petites-missions")) return "entraide";
  return "projets";
}

/**
 * Lot INS1 : le bandeau de contexte (« publier votre annonce », « contacter ce
 * gardien »…) ne s'affiche que si le rôle choisi correspond encore à
 * l'intention déduite du lien. Un polyvalent couvre les deux rôles.
 */
export function signupIntentMatchesRole(
  intent: SignupIntent | null,
  chosenRole: SignupRole | null,
  entraideChosen: boolean,
): boolean {
  if (!intent) return false;
  if (intent === "entraide") return entraideChosen;
  if (!chosenRole) return true;
  return chosenRole === "both" || chosenRole === intent;
}
