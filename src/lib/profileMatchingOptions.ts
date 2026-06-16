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
