/**
 * Libellés uniques des associations présentées par Guardiens : protection
 * animale d'abord, puis chantiers, nature, partage, solidarité et randonnées.
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
  "chantier",
  "nature",
  "partage",
  "solidarite",
  "randonnee",
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
  "participants",
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
  chantier: "Chantiers participatifs",
  nature: "Nature et environnement",
  partage: "Partage, réemploi et jardins",
  solidarite: "Solidarité",
  randonnee: "Randonnées et sorties",
};

/**
 * Thèmes du filtre de la page /associations. Les animaux restent en premier ;
 * chaque thème regroupe les types de structure qui lui appartiennent.
 */
export const ASSOCIATION_THEMES = [
  {
    key: "animaux",
    label: "Animaux",
    types: ["refuge", "sanctuaire", "familles_accueil", "faune_sauvage", "autre"],
  },
  { key: "chantiers-nature", label: "Chantiers et nature", types: ["chantier", "nature"] },
  { key: "partage-solidarite", label: "Partage et solidarité", types: ["partage", "solidarite"] },
  { key: "randonnees", label: "Randonnées et sorties", types: ["randonnee"] },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  types: ReadonlyArray<AssociationType>;
}>;

export type AssociationThemeKey = (typeof ASSOCIATION_THEMES)[number]["key"];

/** Rang du thème d'un type (0 = animaux) ; un type inconnu rejoint les animaux. */
export const associationThemeRank = (type: string): number => {
  const i = ASSOCIATION_THEMES.findIndex((t) => (t.types as readonly string[]).includes(type));
  return i === -1 ? 0 : i;
};

/** Vrai pour les structures de protection animale (espèces, adoption, familles d'accueil). */
export const isAnimalAssociationType = (type: string): boolean => associationThemeRank(type) === 0;

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
  participants: "Participants",
};

/**
 * Valeurs autorisées dans `needs_details[].need`. Ce jeu ajoute « autre » aux
 * besoins cochables, la contrainte CHECK de la colonne `needs` restant limitée
 * aux quatre besoins historiques.
 */
export const ASSOCIATION_NEED_DETAIL_VALUES = [
  ...ASSOCIATION_NEEDS_VALUES,
  "autre",
] as const;

export type AssociationNeedDetailKey = (typeof ASSOCIATION_NEED_DETAIL_VALUES)[number];

export const associationNeedDetailLabel = (value: string): string =>
  value === "autre" ? "Autre besoin" : associationNeedLabel(value);

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

/** Puce affichée sur la carte de liste, à partir du premier besoin déclaré. */
export const ASSOCIATION_NEED_CHIP_LABELS: Record<string, string> = {
  familles_accueil: "Cherche des familles d'accueil",
  benevoles: "Cherche des bénévoles",
  dons: "Accepte vos dons",
  materiel: "Cherche du matériel",
  participants: "Accueille de nouveaux participants",
};

export const associationNeedChipLabel = (value: string): string =>
  ASSOCIATION_NEED_CHIP_LABELS[value] ?? "";

/** Libellé du bouton d'action pour un besoin détaillé de la fiche. */
export const ASSOCIATION_NEED_CTA_LABELS: Record<string, string> = {
  familles_accueil: "Devenir famille d'accueil",
  benevoles: "Devenir bénévole",
  dons: "Faire un don",
  materiel: "Voir ce qui manque",
  participants: "Rejoindre une sortie",
  autre: "En savoir plus",
};

export const associationNeedCtaLabel = (value: string): string =>
  ASSOCIATION_NEED_CTA_LABELS[value] ?? ASSOCIATION_NEED_CTA_LABELS.autre;

/** Lieu affiché : la ville seule quand elle porte le nom du département (Paris). */
export const associationPlaceLabel = (city: string, departementName: string): string =>
  !departementName || city.trim().toLowerCase() === departementName.trim().toLowerCase()
    ? city
    : `${city}, ${departementName}`;
