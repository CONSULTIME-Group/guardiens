/**
 * Constantes / helpers partagés par les onglets de SitImmersiveContent.
 * Extrait de SitImmersiveContent.tsx pour alléger le composant.
 */
import {
  Building2,
  Trees,
  Mountain,
  Waves,
  Wifi,
  WashingMachine,
  Bike,
  Coffee,
  Flame,
  Sun,
  Sunset,
  Moon,
} from "lucide-react";
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

export const ENV_META: Record<string, { label: string; icon: any }> = {
  ville: { label: "Ville", icon: Building2 },
  centre_ville: { label: "Centre-ville", icon: Building2 },
  periurbain: { label: "Périurbain", icon: Building2 },
  campagne: { label: "Campagne", icon: Trees },
  foret: { label: "Forêt", icon: Trees },
  jardin: { label: "Jardin", icon: Trees },
  vignes: { label: "Vignes", icon: Trees },
  montagne: { label: "Montagne", icon: Mountain },
  lac: { label: "Lac", icon: Waves },
  bord_de_mer: { label: "Bord de mer", icon: Waves },
  mer: { label: "Bord de mer", icon: Waves },
  city: { label: "Ville", icon: Building2 },
  city_center: { label: "Centre-ville", icon: Building2 },
  suburban: { label: "Périurbain", icon: Building2 },
  countryside: { label: "Campagne", icon: Trees },
  forest: { label: "Forêt", icon: Trees },
  garden: { label: "Jardin", icon: Trees },
  mountain: { label: "Montagne", icon: Mountain },
  lake: { label: "Lac", icon: Waves },
  seaside: { label: "Bord de mer", icon: Waves },
};

const formatEnvLabel = (key: string): string =>
  key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const getEnvMeta = (key: string) =>
  ENV_META[key] || { label: formatEnvLabel(key), icon: Trees };

export const AMENITY_META: Record<string, { label: string; icon: any }> = {
  wifi: { label: "Wifi", icon: Wifi },
  garden: { label: "Jardin", icon: Trees },
  washing_machine: { label: "Lave-linge", icon: WashingMachine },
  bikes: { label: "Vélos", icon: Bike },
  coffee_machine: { label: "Machine à café", icon: Coffee },
  lake_view: { label: "Vue lac", icon: Waves },
  wood_stove: { label: "Poêle à bois", icon: Flame },
  kayak: { label: "Kayak", icon: Waves },
  balcony: { label: "Balcon", icon: Sun },
  dishwasher: { label: "Lave-vaisselle", icon: WashingMachine },
  elevator: { label: "Ascenseur", icon: Building2 },
};

export const ROUTINE_ICONS: Record<string, { icon: any; bg: string; fg: string }> = {
  Matin: { icon: Sun, bg: "bg-amber-100", fg: "text-amber-700" },
  Midi: { icon: Sun, bg: "bg-orange-100", fg: "text-orange-700" },
  "Après-midi": { icon: Sunset, bg: "bg-sky-100", fg: "text-sky-700" },
  Soir: { icon: Moon, bg: "bg-indigo-100", fg: "text-indigo-700" },
  Nuit: { icon: Moon, bg: "bg-slate-100", fg: "text-slate-700" },
};

export const formatDate = (d: string | null) =>
  d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";
