/**
 * Définition centralisée des filtres mass-email.
 * Ce fichier sert de contrat entre le frontend et l'edge function send-mass-email.
 */

export type Segment = "tous" | "gardiens" | "proprios" | "fondateurs";

export interface MassEmailFilters {
  // Géographique
  postal_prefix?: string;        // ex: "69" (département) ou "75001" (CP exact)
  city?: string;                 // recherche insensible à la casse

  // Activité
  abonnes_actifs?: boolean;
  id_verifiee?: boolean;
  onboarding_complete?: boolean;
  profile_completion_min?: number; // 0-100
  has_completed_sits?: "any" | "yes" | "no"; // a déjà gardé / pas encore

  // Cycle de vie
  inscrits_depuis_jours?: number;     // < N jours (nouveaux)
  inscrits_avant_jours?: number;      // > N jours (anciens)

  // Réputation
  fondateur_only?: boolean;
  min_completed_sits?: number;        // ≥ N gardes terminées
}

export const SEGMENT_OPTIONS: { value: Segment; label: string; description: string }[] = [
  { value: "tous", label: "Tous les inscrits", description: "Tous rôles confondus" },
  { value: "gardiens", label: "Gardiens", description: "Rôle gardien ou les deux" },
  { value: "proprios", label: "Proprios", description: "Rôle proprio ou les deux" },
  { value: "fondateurs", label: "Fondateurs", description: "Membres fondateurs uniquement" },
];

export const SEGMENT_LABELS: Record<string, string> = {
  tous: "Tous",
  gardiens: "Gardiens",
  proprios: "Proprios",
  fondateurs: "Fondateurs",
};

/** Compte le nombre de filtres actifs (autres que segment) — pour affichage UI. */
export function countActiveFilters(f: MassEmailFilters): number {
  let n = 0;
  if (f.postal_prefix) n++;
  if (f.city) n++;
  if (f.abonnes_actifs) n++;
  if (f.id_verifiee) n++;
  if (f.onboarding_complete) n++;
  if (f.profile_completion_min) n++;
  if (f.has_completed_sits && f.has_completed_sits !== "any") n++;
  if (f.inscrits_depuis_jours) n++;
  if (f.inscrits_avant_jours) n++;
  if (f.fondateur_only) n++;
  if (f.min_completed_sits) n++;
  return n;
}
