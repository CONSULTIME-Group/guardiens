/**
 * Libellés uniques des associations de protection animale.
 * Source de vérité partagée par les pages publiques, l'admin et les tests.
 * Chaque clé correspond exactement à une valeur autorisée en base
 * (contraintes CHECK de la table `animal_associations`).
 */

export const ASSOCIATION_TYPE_VALUES = [
  "refuge",
  "sanctuaire",
  "familles_accueil",
  "faune_sauvage",
  "autre",
] as const;

export const ASSOCIATION_SPECIES_VALUES = [
  "chiens",
  "chats",
  "equides",
  "animaux_de_ferme",
  "nac",
  "oiseaux",
  "faune_sauvage",
] as const;

export const ASSOCIATION_NEEDS_VALUES = [
  "benevoles",
  "familles_accueil",
  "dons",
  "materiel",
] as const;

export type AssociationType = (typeof ASSOCIATION_TYPE_VALUES)[number];
export type AssociationSpecies = (typeof ASSOCIATION_SPECIES_VALUES)[number];
export type AssociationNeed = (typeof ASSOCIATION_NEEDS_VALUES)[number];

export const ASSOCIATION_TYPE_LABELS: Record<AssociationType, string> = {
  refuge: "Refuge",
  sanctuaire: "Sanctuaire",
  familles_accueil: "Réseau de familles d'accueil",
  faune_sauvage: "Centre de soins faune sauvage",
  autre: "Association",
};

export const ASSOCIATION_SPECIES_LABELS: Record<AssociationSpecies, string> = {
  chiens: "Chiens",
  chats: "Chats",
  equides: "Équidés",
  animaux_de_ferme: "Animaux de ferme",
  nac: "NAC",
  oiseaux: "Oiseaux",
  faune_sauvage: "Faune sauvage",
};

export const ASSOCIATION_NEEDS_LABELS: Record<AssociationNeed, string> = {
  benevoles: "Bénévoles",
  familles_accueil: "Familles d'accueil",
  dons: "Dons",
  materiel: "Matériel et nourriture",
};

export const associationTypeLabel = (value: string): string =>
  ASSOCIATION_TYPE_LABELS[value as AssociationType] ?? ASSOCIATION_TYPE_LABELS.autre;

export const associationSpeciesLabel = (value: string): string =>
  ASSOCIATION_SPECIES_LABELS[value as AssociationSpecies] ?? value;

export const associationNeedLabel = (value: string): string =>
  ASSOCIATION_NEEDS_LABELS[value as AssociationNeed] ?? value;

/** Initiales affichées quand aucune photo ne charge. */
export const associationInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
