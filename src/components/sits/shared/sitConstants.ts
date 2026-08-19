/**
 * Constantes partagées par toutes les vues d'annonce de garde.
 * Source unique pour éviter la divergence entre SitDetail, PublicSitDetail et MonAnnonceCard.
 */

export const ENV_LABELS: Record<string, string> = {
  city_center: "Centre-ville",
  suburban: "Périurbain",
  countryside: "Campagne",
  mountain: "Montagne",
  seaside: "Bord de mer",
  forest: "Forêt",
};

export const TYPE_LABELS: Record<string, string> = {
  apartment: "Appartement",
  house: "Maison",
  farm: "Ferme",
  chalet: "Chalet",
  other: "Autre",
};

export const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  horse: "🐴",
  bird: "🐦",
  rodent: "🐹",
  fish: "🐠",
  reptile: "🦎",
  farm_animal: "🐄",
  nac: "🐾",
};

// Les libellés français des enums animaux vivent dans src/lib/petLabels.ts
// (module unique, aligné sur les enums Postgres). Ré-exportés ici pour
// compatibilité avec les imports existants : ne pas recréer de mapping local.
export {
  PET_SPECIES_LABELS_LOWER as SPECIES_LABEL,
  PET_WALK_LABELS as WALK_LABELS,
  PET_ALONE_LABELS as ALONE_LABELS,
  PET_ACTIVITY_LABELS as ACTIVITY_LABELS,
} from "@/lib/petLabels";

export interface SitStatusConfig {
  label: string;
  className: string;
}

/**
 * Source UNIQUE pour les badges de statut. Couvre tous les statuts du cycle de vie.
 * Utilisé par SitDetail, MonAnnonceCard, ApplicationsList, etc.
 */
export const SIT_STATUS_CONFIG: Record<string, SitStatusConfig> = {
  draft: { label: "Brouillon", className: "bg-muted text-foreground" },
  published: { label: "En ligne", className: "bg-primary/10 text-primary" },
  confirmed: { label: "Confirmée", className: "bg-primary/15 text-primary" },
  in_progress: { label: "En cours", className: "bg-accent text-accent-foreground" },
  completed: { label: "Terminée", className: "bg-muted text-foreground" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive-text" },
  expired: { label: "Expirée", className: "bg-muted text-foreground" },
  archived: { label: "Archivée", className: "bg-muted text-foreground" },
};

export function getSitStatusConfig(status: string | null | undefined): SitStatusConfig {
  if (!status) return SIT_STATUS_CONFIG.draft;
  return SIT_STATUS_CONFIG[status] || SIT_STATUS_CONFIG.draft;
}
