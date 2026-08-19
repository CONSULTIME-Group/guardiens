/**
 * Constantes / helpers partagés par les onglets de SitImmersiveContent.
 * Extrait de SitImmersiveContent.tsx pour alléger le composant.
 * Aucune icône Lucide ici (mem://constraints/no-icons-in-content), labels seuls.
 */
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Libellés FR des espèces : module unique src/lib/petLabels.ts (aligné sur
// l'enum Postgres pet_species). Ré-export pour compatibilité, ne pas recréer
// de mapping local. Le repli « Animal » reste un terme générique français,
// jamais la valeur brute de la base.
import { PET_SPECIES_LABELS } from "@/lib/petLabels";

export const SPECIES_LABEL = PET_SPECIES_LABELS;
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
