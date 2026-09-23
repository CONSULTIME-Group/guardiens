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
  "Pour une garde de plusieurs jours chez vous, publiez une annonce de garde.";
export const SIT_MODE_AT_HOME_TEXT =
  "Les gardiens de votre secteur la reçoivent, et vous choisissez après les avoir rencontrés.";
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
