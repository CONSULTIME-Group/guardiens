/**
 * Constantes / helpers partagés par les onglets de SitImmersiveContent.
 * Extrait de SitImmersiveContent.tsx pour alléger le composant.
 * Aucune icône Lucide ici (mem://constraints/no-icons-in-content) — labels seuls.
 */
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Libellés FR des espèces — remplace les emojis (règle no-emoji dans le contenu).
export const SPECIES_LABEL: Record<string, string> = {
  dog: "Chien",
  cat: "Chat",
  farm_animal: "Animal de ferme",
  rabbit: "Lapin",
  bird: "Oiseau",
  fish: "Poisson",
  rodent: "Rongeur",
  horse: "Cheval",
  nac: "NAC",
  reptile: "Reptile",
};
export const speciesLabel = (s?: string | null) => (s && SPECIES_LABEL[s]) || "Animal";

export const ENV_META: Record<string, { label: string }> = {
  ville: { label: "Ville" },
  centre_ville: { label: "Centre-ville" },
  periurbain: { label: "Périurbain" },
  campagne: { label: "Campagne" },
  foret: { label: "Forêt" },
  jardin: { label: "Jardin" },
  vignes: { label: "Vignes" },
  montagne: { label: "Montagne" },
  lac: { label: "Lac" },
  bord_de_mer: { label: "Bord de mer" },
  mer: { label: "Bord de mer" },
  city: { label: "Ville" },
  city_center: { label: "Centre-ville" },
  suburban: { label: "Périurbain" },
  countryside: { label: "Campagne" },
  forest: { label: "Forêt" },
  garden: { label: "Jardin" },
  mountain: { label: "Montagne" },
  lake: { label: "Lac" },
  seaside: { label: "Bord de mer" },
};

const formatEnvLabel = (key: string): string =>
  key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const getEnvMeta = (key: string): { label: string } =>
  ENV_META[key] || { label: formatEnvLabel(key) };

export const AMENITY_META: Record<string, { label: string }> = {
  wifi: { label: "Wifi" },
  garden: { label: "Jardin" },
  washing_machine: { label: "Lave-linge" },
  bikes: { label: "Vélos" },
  coffee_machine: { label: "Machine à café" },
  lake_view: { label: "Vue lac" },
  wood_stove: { label: "Poêle à bois" },
  kayak: { label: "Kayak" },
  balcony: { label: "Balcon" },
  dishwasher: { label: "Lave-vaisselle" },
  elevator: { label: "Ascenseur" },
};

export const formatDate = (d: string | null) =>
  d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";
