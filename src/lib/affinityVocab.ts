/**
 * Vocabulaire d'affinité — SOURCE UNIQUE.
 *
 * Toutes les chaînes magiques utilisées par le moteur de score
 * (`src/lib/affinityScore.ts`) sont déclarées ici, une seule fois.
 * Objectif : casser le couplage implicite entre le scoring et les
 * formulaires (onboarding, édition de profil) qui utilisent les mêmes
 * libellés. Si un jour une valeur de formulaire dérive, le test
 * `src/lib/__tests__/affinityVocab.test.ts` casse au lieu que le score
 * se dégrade en silence.
 *
 * RÈGLE : ne JAMAIS renommer ces valeurs sans mettre à jour à la fois
 * les formulaires (`src/lib/profileMatchingOptions.ts`) et la donnée
 * déjà persistée en base.
 */

// -------------------- Rythme de vie --------------------

export const PACE_CALME = "calme";
export const PACE_EQUILIBRE = "equilibre";
export const PACE_ACTIF = "actif";

/** Ordre canonique du rythme de vie (utilisé pour détecter l'adjacence). */
export const PACE_ORDER = [PACE_CALME, PACE_EQUILIBRE, PACE_ACTIF] as const;

// -------------------- Présence attendue (owner) --------------------

export const PRESENCE_100 = "100% sur place";
export const PRESENCE_REMOTE_OK = "Télétravail OK";
export const PRESENCE_SHORT_ABSENCES = "Absences courtes OK";

/** Valeurs de `owner.presence_expected` prises en compte par le scoring. */
export const PRESENCE_EXPECTED_VALUES = [
  PRESENCE_100,
  PRESENCE_REMOTE_OK,
  PRESENCE_SHORT_ABSENCES,
] as const;

// -------------------- Rythme de travail (sitter) --------------------

export const WORK_FULL_REMOTE = "full_remote";
export const WORK_PARTIAL_REMOTE = "partial_remote";
export const WORK_ON_SITE = "on_site";
export const WORK_OUT_DAYTIME = "out_daytime";
export const WORK_FLEXIBLE = "flexible";

/** Valeurs de `sitter.work_during_sit` prises en compte par le scoring. */
export const WORK_DURING_SIT_VALUES = [
  WORK_FULL_REMOTE,
  WORK_PARTIAL_REMOTE,
  WORK_ON_SITE,
  WORK_OUT_DAYTIME,
  WORK_FLEXIBLE,
] as const;

// -------------------- Ambiance du foyer (owner) --------------------

export const AMBIANCE_COCON = "Cocon casanier";
export const AMBIANCE_CALME_POSE = "Calme et posé";
export const AMBIANCE_SPORTIF = "Sportif outdoor";
export const AMBIANCE_CAMPAGNE = "Campagne";
export const AMBIANCE_FAMILLE = "Famille animée";

/** Tags d'ambiance dont le scoring sait tirer de l'information. */
export const HOME_AMBIANCE_SCORED_TAGS = [
  AMBIANCE_COCON,
  AMBIANCE_CALME_POSE,
  AMBIANCE_SPORTIF,
  AMBIANCE_CAMPAGNE,
  AMBIANCE_FAMILLE,
] as const;

// -------------------- Intérêts (sitter) --------------------

/** Intérêts "sportif outdoor" utilisés par le matching d'ambiance. */
export const OUTDOOR_SPORT_INTERESTS = [
  "Randonnée",
  "Course à pied",
  "Vélo",
  "Ski",
  "Sports nautiques",
] as const;

/** Intérêts "campagne" utilisés par le matching d'ambiance. */
export const RURAL_INTERESTS = ["Randonnée", "Jardinage"] as const;

// -------------------- Espèces animales --------------------

/**
 * Normalisation des libellés d'espèce vers un code canonique EN.
 * `pets.species` utilise des codes EN (dog, cat…) ; `sitter_profiles.animal_types`
 * utilise des libellés FR pluriels ("Chiens", "NAC"…). On ramène tout au
 * code EN pour intersecter.
 */
export const SPECIES_NORMALIZE: Record<string, string> = {
  dog: "dog", chien: "dog", chiens: "dog",
  cat: "cat", chat: "cat", chats: "cat",
  bird: "bird", oiseau: "bird", oiseaux: "bird",
  rodent: "rodent", rongeur: "rodent", rongeurs: "rodent",
  reptile: "reptile", reptiles: "reptile",
  nac: "nac",
  horse: "horse", cheval: "horse", chevaux: "horse",
  farm_animal: "farm_animal",
  "animal de ferme": "farm_animal",
  "animaux de ferme": "farm_animal",
  tous: "all", all: "all",
};

/** Ombrelle NAC : un gardien "NAC" couvre toutes ces espèces owner. */
export const NAC_UMBRELLA = ["rodent", "reptile", "bird", "nac"] as const;

// -------------------- Sensibilités bloquantes --------------------

export const SENS_ALLERGIE_CHAT = "Allergie aux chats";
export const SENS_ALLERGIE_CHIEN = "Allergie aux chiens";
export const SENS_GRANDS_CHIENS = "Pas de très grands chiens";
export const SENS_CHIENS_CATEGORISES = "Pas de chiens catégorisés";
export const SENS_REPTILES = "Pas de reptiles";
export const SENS_NAC = "Pas de NAC";
export const SENS_CHEVAUX_FERME = "Pas de chevaux ou animaux de ferme";

/**
 * Libellés de sensibilités bloquantes par espèce (code canonique EN).
 * Si le gardien coche l'un des libellés listés pour une espèce présente
 * chez l'owner, le score est disqualifié.
 */
export const SENSITIVITY_BY_SPECIES: Record<string, string[]> = {
  cat: [SENS_ALLERGIE_CHAT],
  dog: [SENS_ALLERGIE_CHIEN, SENS_GRANDS_CHIENS, SENS_CHIENS_CATEGORISES],
  reptile: [SENS_REPTILES, SENS_NAC],
  rodent: [SENS_NAC],
  bird: [SENS_NAC],
  nac: [SENS_NAC],
  horse: [SENS_CHEVAUX_FERME],
  farm_animal: [SENS_CHEVAUX_FERME],
};

/** Ensemble plat de toutes les sensibilités bloquantes (utile pour tests). */
export const ALL_BLOCKING_SENSITIVITIES = Array.from(
  new Set(Object.values(SENSITIVITY_BY_SPECIES).flat()),
);
