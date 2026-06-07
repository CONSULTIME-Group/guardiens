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
  /** Tailwind classes for the placeholder background when no logo is uploaded */
  placeholderClass: string;
}> = [
  {
    value: "veterinaire",
    label: "Vétérinaire",
    slug: "veterinaires",
    shortDesc: "Soins, consultations, urgences, NAC",
    requiresOrdre: true,
    placeholderClass: "bg-rose-100 text-rose-700",
  },
  {
    value: "pet_sitter_pro",
    label: "Pet-sitter professionnel / pension",
    slug: "pet-sitters-pro",
    shortDesc: "Garde déclarée avec SIRET et ACACED",
    requiresDiplome: true,
    placeholderClass: "bg-amber-100 text-amber-700",
  },
  {
    value: "educateur",
    label: "Éducateur canin / comportementaliste",
    slug: "educateurs-canins",
    shortDesc: "Éducation positive, comportement, rééducation",
    placeholderClass: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "toiletteur",
    label: "Toiletteur",
    slug: "toiletteurs",
    shortDesc: "Toilettage chien, chat, NAC",
    placeholderClass: "bg-sky-100 text-sky-700",
  },
  {
    value: "osteopathe",
    label: "Ostéopathe / physio animalier",
    slug: "osteopathes",
    shortDesc: "Soins manuels, rééducation, posture",
    requiresDiplome: true,
    placeholderClass: "bg-violet-100 text-violet-700",
  },
  {
    value: "dresseur_sportif",
    label: "Dresseur sportif",
    slug: "dresseurs-sportifs",
    shortDesc: "Agility, mantrailing, cani-cross, obé-rythmée",
    placeholderClass: "bg-lime-100 text-lime-700",
  },
  {
    value: "transporteur",
    label: "Transporteur / taxi animalier",
    slug: "transporteurs",
    shortDesc: "Trajets vétérinaire, voyages, déménagements",
    placeholderClass: "bg-orange-100 text-orange-700",
  },
  {
    value: "photographe",
    label: "Photographe animalier",
    slug: "photographes",
    shortDesc: "Portraits, séances famille, reportages",
    placeholderClass: "bg-fuchsia-100 text-fuchsia-700",
  },
];

export const getCategoryByValue = (value: string) =>
  PRO_CATEGORIES.find((c) => c.value === value);

export const getCategoryBySlug = (slug: string) =>
  PRO_CATEGORIES.find((c) => c.slug === slug);

/** Initials used for the colored placeholder when no logo is uploaded. */
export function getProInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}
