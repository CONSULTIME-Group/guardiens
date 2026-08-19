/**
 * Module UNIQUE de traduction des enums animaux vers le français.
 *
 * Source de vérité des valeurs : les types Postgres en base, vérifiés le
 * 19/08/2026 via pg_enum :
 *   - activity_level : calm, moderate, sportive
 *   - alone_duration : never, 2h, 6h, all_day
 *   - walk_duration  : none, 30min, 1h, 2h_plus
 *   - pet_species    : dog, cat, horse, bird, rodent, fish, reptile,
 *                      farm_animal, nac
 *
 * Règle d'affichage : une valeur inconnue ne doit JAMAIS être rendue brute
 * à l'écran (un visiteur verrait « moderate » ou « all_day »). Les accesseurs
 * retournent `null` pour toute valeur inconnue : l'appelant masque le bloc
 * ou utilise un terme générique français (« animal »), jamais la valeur DB.
 *
 * Tout composant qui affiche un de ces champs DOIT passer par ce module.
 * Le test src/__tests__/pet-enum-labels.test.ts bloque les rendus directs.
 */

export const PET_ACTIVITY_LABELS: Record<string, string> = {
  calm: "Calme",
  moderate: "Modéré",
  sportive: "Sportif",
};

export const PET_WALK_LABELS: Record<string, string> = {
  none: "Aucune balade",
  "30min": "30 min/jour",
  "1h": "1h/jour",
  "2h_plus": "2h+/jour",
};

export const PET_ALONE_LABELS: Record<string, string> = {
  never: "Jamais seul",
  "2h": "2h max seul",
  "6h": "6h max seul",
  all_day: "Peut rester seul toute la journée",
};

/** Espèces, capitale initiale : chips, cartes, titres. */
export const PET_SPECIES_LABELS: Record<string, string> = {
  dog: "Chien",
  cat: "Chat",
  horse: "Cheval",
  bird: "Oiseau",
  rodent: "Rongeur",
  fish: "Poisson",
  reptile: "Reptile",
  farm_animal: "Animal de ferme",
  nac: "NAC",
};

/** Espèces, minuscules : phrases courantes, meta descriptions, pitches. */
export const PET_SPECIES_LABELS_LOWER: Record<string, string> = {
  dog: "chien",
  cat: "chat",
  horse: "cheval",
  bird: "oiseau",
  rodent: "rongeur",
  fish: "poisson",
  reptile: "reptile",
  farm_animal: "animal de ferme",
  nac: "NAC",
};

const lookup = (map: Record<string, string>, value: string | null | undefined): string | null => {
  if (!value) return null;
  return map[value] ?? null;
};

/** Libellé d'activité, ou null si valeur inconnue (ne rien afficher). */
export const petActivityLabel = (value: string | null | undefined): string | null =>
  lookup(PET_ACTIVITY_LABELS, value);

/** Libellé de balade, ou null si valeur inconnue (ne rien afficher). */
export const petWalkLabel = (value: string | null | undefined): string | null =>
  lookup(PET_WALK_LABELS, value);

/** Libellé de tolérance à la solitude, ou null si inconnue. */
export const petAloneLabel = (value: string | null | undefined): string | null =>
  lookup(PET_ALONE_LABELS, value);

/** Espèce avec capitale, ou null si inconnue. */
export const petSpeciesLabel = (value: string | null | undefined): string | null =>
  lookup(PET_SPECIES_LABELS, value);

/** Espèce en minuscules pour les phrases, ou null si inconnue. */
export const petSpeciesLabelLower = (value: string | null | undefined): string | null =>
  lookup(PET_SPECIES_LABELS_LOWER, value);
