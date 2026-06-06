export type ProCategory =
  | "veterinaire"
  | "pet_sitter_pro"
  | "educateur"
  | "toiletteur"
  | "osteopathe"
  | "dresseur_sportif"
  | "transporteur"
  | "photographe";

export const PRO_CATEGORIES: Array<{
  value: ProCategory;
  label: string;
  slug: string;
  shortDesc: string;
  requiresOrdre?: boolean;
  requiresDiplome?: boolean;
}> = [
  {
    value: "veterinaire",
    label: "Vétérinaire",
    slug: "veterinaires",
    shortDesc: "Soins, consultations, urgences, NAC",
    requiresOrdre: true,
  },
  {
    value: "pet_sitter_pro",
    label: "Pet-sitter professionnel / pension",
    slug: "pet-sitters-pro",
    shortDesc: "Garde déclarée avec SIRET et ACACED",
    requiresDiplome: true,
  },
  {
    value: "educateur",
    label: "Éducateur canin / comportementaliste",
    slug: "educateurs-canins",
    shortDesc: "Éducation positive, comportement, rééducation",
  },
  {
    value: "toiletteur",
    label: "Toiletteur",
    slug: "toiletteurs",
    shortDesc: "Toilettage chien, chat, NAC",
  },
  {
    value: "osteopathe",
    label: "Ostéopathe / physio animalier",
    slug: "osteopathes",
    shortDesc: "Soins manuels, rééducation, posture",
    requiresDiplome: true,
  },
  {
    value: "dresseur_sportif",
    label: "Dresseur sportif",
    slug: "dresseurs-sportifs",
    shortDesc: "Agility, mantrailing, cani-cross, obé-rythmée",
  },
  {
    value: "transporteur",
    label: "Transporteur / taxi animalier",
    slug: "transporteurs",
    shortDesc: "Trajets vétérinaire, voyages, déménagements",
  },
  {
    value: "photographe",
    label: "Photographe animalier",
    slug: "photographes",
    shortDesc: "Portraits, séances famille, reportages",
  },
];

export const getCategoryByValue = (value: string) =>
  PRO_CATEGORIES.find((c) => c.value === value);

export const getCategoryBySlug = (slug: string) =>
  PRO_CATEGORIES.find((c) => c.slug === slug);
