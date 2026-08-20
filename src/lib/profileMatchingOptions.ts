/**
 * Options partagées pour le matching propriétaire ↔ gardien.
 * Utilisées dans les étapes d'édition de profil (gardien + propriétaire),
 * l'étape d'onboarding obligatoire d'affinité, et l'affichage sur les
 * profils publics. Source unique.
 */

/** Présence attendue par le propriétaire pendant la garde (single). */
export const PRESENCE_EXPECTED_OPTIONS = [
  "100% sur place",
  "Télétravail OK",
  "Absences courtes OK",
];

/** Types d'animaux acceptés par le gardien (multi). */
export const SITTER_ANIMAL_TYPES_OPTIONS = [
  "Tous",
  "Chiens",
  "Chats",
  "Chevaux",
  "Oiseaux",
  "Animaux de ferme",
  "NAC",
];

/** Type de gardien (single). */
export const SITTER_TYPE_OPTIONS = ["Solo", "Couple", "Famille", "Retraité"];

/**
 * Options partagées pour le matching propriétaire ↔ gardien.
 * Utilisées dans les étapes d'édition de profil (gardien + propriétaire)
 * et dans l'affichage sur les profils publics.
 *
 * Garder ces listes synchronisées des deux côtés permet d'afficher
 * des compatibilités lisibles (langues, intérêts, rythme, foyer).
 */

export const LANGUAGE_OPTIONS = [
  "Français",
  "Anglais",
  "Espagnol",
  "Italien",
  "Allemand",
  "Portugais",
  "Arabe",
  "Russe",
  "Mandarin",
  "Autre",
];

export const INTEREST_OPTIONS = [
  "Randonnée",
  "Vélo",
  "Course à pied",
  "Yoga",
  "Méditation",
  "Jardinage",
  "Lecture",
  "Cuisine",
  "Photo",
  "Musique",
  "Bricolage",
  "Sports nautiques",
  "Ski",
  "Voyage",
  "Cinéma",
  "Art",
  "Bénévolat",
];

/** Rythme de vie au quotidien (single choice). Aide à matcher avec l'énergie de l'animal. */
export const LIFE_PACE_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "calme", label: "Calme", description: "Plutôt casanier·ère, peu de sorties" },
  { value: "equilibre", label: "Équilibré", description: "Sorties régulières, vie posée" },
  { value: "actif", label: "Actif", description: "Souvent dehors, sportif·ve" },
];

/**
 * Composition du foyer présent pendant la garde (multi-select).
 * Important pour les animaux craintifs des enfants, les chats territoriaux, etc.
 */
export const HOUSEHOLD_COMPOSITION_OPTIONS = [
  "Seul·e",
  "En couple",
  "Avec enfants en bas âge",
  "Avec enfants",
  "Avec adolescents",
  "Avec un chien",
  "Avec un chat",
  "Avec d'autres animaux",
];

export function lifePaceLabel(value: string | null | undefined): string {
  if (!value) return "";
  return LIFE_PACE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/**
 * Compétences pointues côté gardien (multi). Rassure les propriétaires
 * qui ont un animal avec un besoin particulier.
 */
export const SPECIAL_ANIMAL_SKILLS_OPTIONS = [
  "Administration de médicaments",
  "Injection insuline / diabète",
  "Animal âgé ou en fin de vie",
  "Chiot / chaton non propre",
  "Chien réactif ou peureux",
  "Chat FIV / FeLV",
  "Premiers secours animaux",
  "Soin post-opératoire",
  "NAC (rongeurs, reptiles, oiseaux)",
  "Cheval / poney",
  "Animaux de ferme",
  "Éducation positive",
];

/**
 * Présence pendant la garde (single choice). Critère décisif pour beaucoup
 * de propriétaires : un animal anxieux ne supporte pas d'être seul 8h.
 */
export const WORK_DURING_SIT_OPTIONS: { value: string; label: string }[] = [
  { value: "full_remote", label: "Télétravail 100 %, présent toute la journée" },
  { value: "partial_remote", label: "Télétravail partiel, quelques sorties" },
  { value: "on_site", label: "Sur place, congés ou retraite" },
  { value: "out_daytime", label: "Absences en journée (travail extérieur)" },
  { value: "flexible", label: "Variable selon la garde" },
];

export function workDuringSitLabel(value: string | null | undefined): string {
  if (!value) return "";
  return WORK_DURING_SIT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/**
 * Sensibilités / non acceptés (multi). Évite les fausses correspondances
 * en amont (allergies, espèces refusées, etc.).
 */
export const SENSITIVITIES_OPTIONS = [
  "Allergie aux chats",
  "Allergie aux chiens",
  "Pas de reptiles",
  "Pas de NAC",
  "Pas de chevaux ou animaux de ferme",
  "Pas plus de 2 animaux",
  "Pas de très grands chiens",
  "Pas de chiens catégorisés",
  "Pas de garde sans jardin",
];

/**
 * Profil de gardien idéal vu côté propriétaire (multi).
 * Liste enrichie pour mieux nourrir le matching (présence, expérience, situation de vie).
 * Stockée dans `owner_profiles.preferred_sitter_types`.
 */
/**
 * RÈGLE DES DEUX CÔTÉS (20/08/2026) : les valeurs scorables ont un
 * équivalent déclarable côté gardien (sitter_type, experience_years,
 * work_during_sit). « Sans préférence » est une sortie explicite du
 * critère. Les valeurs sans équivalent gardien sont DESCRIPTIVES :
 * affichées sur la fiche, jamais présentées comme un critère de matching.
 * Miroir des registres PREF_SITTER_* dans affinityVocab, verrouillé par
 * `affinity-exhaustiveness.test.ts`.
 */
export const IDEAL_SITTER_SCORED_OPTIONS = [
  "Sans préférence",
  "Couple",
  "Famille",
  "Retraité·e",
  "Actif·ve solo",
  "Télétravailleur·euse",
  "Gardien·ne expérimenté·e",
  "Débutant·e motivé·e",
];

/** Descriptif uniquement : aucun champ gardien correspondant, aucun score. */
export const IDEAL_SITTER_DESCRIPTIVE_OPTIONS = [
  "Étudiant·e",
  "Indépendant·e",
];

export const IDEAL_SITTER_PROFILE_OPTIONS = [
  ...IDEAL_SITTER_SCORED_OPTIONS,
  ...IDEAL_SITTER_DESCRIPTIVE_OPTIONS,
];

/**
 * Tags d'ambiance du foyer côté propriétaire (multi).
 * Stockés dans `owner_profiles.home_ambiance`.
 *
 * RÈGLE DES DEUX CÔTÉS (20/08/2026) : deux groupes explicitement séparés
 * dans les formulaires. Le premier alimente le score d'affinité, le second
 * est DESCRIPTIF (affiché pour que les gardiens se projettent, sans effet
 * sur le calcul). Miroir de HOME_AMBIANCE_SCORED_TAGS et
 * HOME_AMBIANCE_DISPLAY_ONLY dans affinityVocab : le test
 * `affinity-exhaustiveness.test.ts` casse si les listes divergent.
 */

/** Groupe 1, « Ambiance du foyer » : scoré par le moteur d'affinité. */
export const HOME_AMBIANCE_SCORED_OPTIONS = [
  "Calme et posé",
  "Cocon casanier",
  "Sportif outdoor",
  "Campagne",
  "Famille animée",
];

/**
 * Groupe 2, « Environnement » : descriptif uniquement. Ne JAMAIS présenter
 * ces tags comme un critère de matching.
 */
export const HOME_AMBIANCE_ENVIRONMENT_OPTIONS = [
  "Urbain",
  "Montagne",
  "Bord de mer",
  "Maison de vacances",
  "Invités fréquents",
];

/** Union des deux groupes (affichage fiche publique, tests de cohérence). */
export const HOME_AMBIANCE_OPTIONS = [
  ...HOME_AMBIANCE_SCORED_OPTIONS,
  ...HOME_AMBIANCE_ENVIRONMENT_OPTIONS,
];


