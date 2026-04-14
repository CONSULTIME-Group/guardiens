export const SPECIES_LABEL: Record<string, string> = {
  dog: "Chien", cat: "Chat", horse: "Cheval", bird: "Oiseau",
  rodent: "Rongeur", fish: "Poisson", reptile: "Reptile",
  farm_animal: "Animal de ferme", nac: "NAC",
};

export const PROPRIO_SPECIAL_IDS = ["fondateur", "id_verifiee", "courant_passe"];

export const capitalize = (s: string | null | undefined) => {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export const capitalizeWords = (s: string | null | undefined) => {
  if (!s) return "";
  return s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
};

export const BANNER_STYLES: Record<string, string> = {
  warning: "bg-destructive/10 border-destructive/30 text-destructive",
  success: "bg-primary/10 border-primary/30 text-primary",
  info: "bg-accent border-accent-foreground/20 text-accent-foreground",
};
