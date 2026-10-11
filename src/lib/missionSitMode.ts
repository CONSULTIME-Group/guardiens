/**
 * Lot E6, partie 1 : question « Comment ça se passe ? ».
 *
 * Le signal de garde de plusieurs jours ouvre une question à choix unique.
 * Le besoin ne part que si la personne confirme le déroulement :
 *  - `at_home` : quelqu'un s'installe chez moi pendant mon absence ;
 *  - `visits` : quelqu'un passe chez moi ;
 *  - `at_helper` : mon animal va chez la personne.
 *
 * Chaque mode porte une ligne d'affichage utilisée sur la fiche du besoin
 * et dans l'email de vague. Les libellés restent affirmatifs, sans tiret.
 */

export type MissionSitMode = "at_home" | "visits" | "at_helper";

export const SIT_MODE_QUESTION_TITLE = "Comment ça se passe ?";

export const SIT_MODE_OPTIONS: Array<{
  value: MissionSitMode;
  label: string;
}> = [
  { value: "at_home", label: "Quelqu'un s'installe chez moi pendant mon absence" },
  { value: "visits", label: "Quelqu'un passe chez moi" },
  { value: "at_helper", label: "Mon animal va chez la personne" },
];

export const AT_HELPER_NOTE =
  "Un coup de main entre gens du coin, en échange d'un service ou d'une attention.";

export const SIT_MODE_AT_HOME_TITLE =
  "Quelqu'un s'installe chez vous : c'est une garde, publiez-la comme annonce.";
export const SIT_MODE_AT_HOME_TEXT =
  "Les gardiens de votre secteur la reçoivent et vous choisissez la personne qui vous convient.";

/** Lot E9 : ce qui est repris dans l'annonce, dit seulement quand c'est vrai. */
export function sitPrefillNote(hasDates: boolean): string {
  return hasDates ? "Votre texte et vos dates sont repris." : "Votre texte est repris.";
}
export const SIT_MODE_PRIMARY = "Publier une annonce de garde";
export const SIT_MODE_SECONDARY = "Publier quand même un besoin";

export const isMissionSitMode = (value: unknown): value is MissionSitMode =>
  value === "at_home" || value === "visits" || value === "at_helper";

/** Ligne d'affichage du déroulement, fiche et email. */
export function sitModeLine(mode: MissionSitMode, firstName?: string | null): string {
  const first = (firstName || "").trim();
  switch (mode) {
    case "at_home":
      return first ? `Présence chez ${first} pendant son absence` : "Présence chez vous pendant votre absence";
    case "visits":
      return first ? `Passages chez ${first}` : "Passages chez vous";
    case "at_helper":
      return "L'animal vient chez vous";
  }
}

/**
 * Lot E9 (11/10/2026) : la question « Comment ça se passe ? » s'ouvre pour
 * tout besoin qui parle d'animaux, en plus des gardes de plusieurs jours.
 * Décision de Jérémie : on propose la garde quand quelqu'un s'installe chez
 * la personne ; un animal gardé chez la personne qui aide, ou des passages,
 * restent un coup de main.
 */
export function shouldAskSitMode(args: {
  missionType: string | null | undefined;
  multiDay: boolean;
  /** Catégorie déduite du seul titre : la description cite souvent un animal en passant. */
  titleCategory: string | null | undefined;
  sitLike: boolean;
}): boolean {
  if (args.missionType !== "besoin") return false;
  return args.multiDay || args.titleCategory === "animals" || args.sitLike;
}

/**
 * Lot E9 : les dates d'un besoin (?debut=&fin=) s'appliquent à l'annonce
 * quand le texte repris du besoin est toujours à l'écran (aucun brouillon
 * repris entre-temps) et qu'aucune date n'est déjà posée.
 */
export function shouldApplyMissionDates(args: {
  prefillTitle: string | null;
  title: string;
  remoteDraftResumed: boolean;
  localDraftRestored: boolean;
  startDate: string;
  endDate: string;
}): boolean {
  if (args.prefillTitle === null) return false;
  if (args.remoteDraftResumed || args.localDraftRestored) return false;
  if (args.title !== args.prefillTitle) return false;
  return !args.startDate && !args.endDate;
}

/** Signal de modération « ressemble à une garde » : seulement si quelqu'un s'installe chez la personne. */
export function reportsSitLike(sitLike: boolean, mode: MissionSitMode | null | undefined): boolean {
  return sitLike && (!mode || mode === "at_home");
}

/** Adresse de l'annonce de garde préremplie (paramètres lus par CreateSit : debut, fin). */
export function sitCreateUrl(dateNeeded?: string | null, endDate?: string | null): string {
  const params = new URLSearchParams();
  const day = (value?: string | null) => (value ? value.slice(0, 10) : "");
  if (day(dateNeeded)) params.set("debut", day(dateNeeded));
  if (day(endDate)) params.set("fin", day(endDate));
  const qs = params.toString();
  return `/sits/create${qs ? `?${qs}` : ""}`;
}
