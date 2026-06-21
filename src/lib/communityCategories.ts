export type CommunityCategory = "animaux" | "jardin" | "maison" | "garde" | "autre";

export const COMMUNITY_CATEGORIES: { key: CommunityCategory; label: string; hint: string }[] = [
  { key: "animaux", label: "Animaux", hint: "Comportement, santé, garde" },
  { key: "jardin", label: "Jardin", hint: "Plantes, potager, arrosage" },
  { key: "maison", label: "Maison", hint: "Bricolage, entretien" },
  { key: "garde", label: "Garde de maison", hint: "Vie pratique entre gardiens et propriétaires" },
  { key: "autre", label: "Autre", hint: "Tout le reste" },
];

export const CATEGORY_LABEL: Record<CommunityCategory, string> = COMMUNITY_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.label }),
  {} as Record<CommunityCategory, string>,
);
