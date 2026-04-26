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

export const SPECIES_LABEL: Record<string, string> = {
  dog: "chien",
  cat: "chat",
  horse: "cheval",
  bird: "oiseau",
  rodent: "rongeur",
  fish: "poisson",
  reptile: "reptile",
  farm_animal: "animal de ferme",
  nac: "NAC",
};

export const WALK_LABELS: Record<string, string> = {
  none: "Aucune balade",
  "30min": "30 min/jour",
  "1h": "1h/jour",
  "2h_plus": "2h+/jour",
};

export const ALONE_LABELS: Record<string, string> = {
  never: "Jamais seul",
  "2h": "2h max seul",
  "6h": "6h max seul",
  all_day: "Peut rester seul toute la journée",
};

export const ACTIVITY_LABELS: Record<string, string> = {
  calm: "Calme",
  moderate: "Modéré",
  sportive: "Sportif",
};

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
};

export function getSitStatusConfig(status: string | null | undefined): SitStatusConfig {
  if (!status) return SIT_STATUS_CONFIG.draft;
  return SIT_STATUS_CONFIG[status] || SIT_STATUS_CONFIG.draft;
}
