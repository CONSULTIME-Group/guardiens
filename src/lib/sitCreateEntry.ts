/**
 * Lot ENT1 (12/11/2026) : le formulaire « Publier une annonce » s'ouvre
 * toujours. Ce qui manque au profil (logement, commune, prénom) se demande
 * dans l'étape « L'essentiel », à l'endroit où cela sert.
 *
 * Règles pures, partagées par le formulaire et ses tests.
 */

export type EntryMissingId = "property" | "city" | "first_name";

export interface EntryStateInput {
  hasProperty: boolean;
  /** Commune du profil du propriétaire. */
  ownerCity: string | null | undefined;
  /** Prénom du profil du propriétaire. */
  firstName: string | null | undefined;
}

export const FIRST_NAME_MIN_LENGTH = 2;

export const isFirstNameUsable = (firstName: string | null | undefined): boolean =>
  (firstName ?? "").trim().length >= FIRST_NAME_MIN_LENGTH;

/** Ce qui manque au profil à l'ouverture du formulaire, dans l'ordre d'affichage. */
export const entryMissing = (input: EntryStateInput): EntryMissingId[] => {
  const missing: EntryMissingId[] = [];
  if (!input.hasProperty) missing.push("property");
  if (!(input.ownerCity ?? "").trim()) missing.push("city");
  if (!isFirstNameUsable(input.firstName)) missing.push("first_name");
  return missing;
};

/** Les cinq types de logement proposés, dans l'ordre de la spécification. */
export const HOUSING_TYPE_CHOICES = [
  { value: "house", label: "Maison" },
  { value: "apartment", label: "Appartement" },
  { value: "farm", label: "Ferme" },
  { value: "chalet", label: "Chalet" },
  { value: "other", label: "Autre" },
] as const;

export type HousingTypeValue = (typeof HOUSING_TYPE_CHOICES)[number]["value"];

/** Ligne properties créée par le choix du type seul, comme l'écran P1 de l'arrivée. */
export const buildInlineHousingInsert = (userId: string, type: HousingTypeValue) => ({
  user_id: userId,
  type,
  environment: null,
  rooms_count: null,
  bedrooms_count: null,
});

export const HOUSING_HELP_TEXT =
  "Un seul choix suffit, vous complétez la description plus tard depuis votre profil.";

export type HousingNotice = "save" | "publish" | "next";

export const HOUSING_NOTICE_TEXT: Record<HousingNotice, string> = {
  save: "Indiquez votre type de logement pour enregistrer votre brouillon",
  publish: "Indiquez votre type de logement pour enregistrer votre brouillon",
  next: "Indiquez votre type de logement pour continuer",
};

export interface Step0EntryInput extends EntryStateInput {
  /** Commune saisie pour cette annonce (lieu de garde distinct du profil). */
  sitCity: string | null | undefined;
  /** Le champ prénom est affiché pour cette visite. */
  firstNameAsked: boolean;
  /** Valeur courante du champ prénom. */
  firstNameValue: string | null | undefined;
}

/**
 * Champs du profil contrôlés au clic sur « Suivant » de l'étape 0. Ils ne
 * conditionnent jamais l'enregistrement du brouillon : seul le logement le
 * fait, par contrainte de la base (sits.property_id non nul).
 */
export const step0EntryErrors = (input: Step0EntryInput): Array<{ field: EntryMissingId; anchor: string }> => {
  const errors: Array<{ field: EntryMissingId; anchor: string }> = [];
  if (!input.hasProperty) errors.push({ field: "property", anchor: "sit-housing-field" });
  if (!(input.ownerCity ?? "").trim() && !(input.sitCity ?? "").trim()) {
    errors.push({ field: "city", anchor: "sit-city-field" });
  }
  const name = input.firstNameAsked ? input.firstNameValue : input.firstName;
  if (!isFirstNameUsable(name)) errors.push({ field: "first_name", anchor: "sit-first-name-field" });
  return errors;
};

/** Prénom proposé d'office depuis les métadonnées du compte, comme P1. */
export const firstNameFromAccount = (meta: Record<string, unknown> | null | undefined): string => {
  const m = (meta ?? {}) as Record<string, string | undefined>;
  const full = (m.full_name || m.name || "").split(" ")[0] || "";
  return (m.given_name || m.first_name || full || "").trim();
};
