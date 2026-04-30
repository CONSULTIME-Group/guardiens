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
  profile_completion_min?: number; // 0-100 (≥)
  profile_completion_max?: number; // 0-100 (≤) — cibler profils peu remplis
  has_completed_sits?: "any" | "yes" | "no"; // a déjà gardé / pas encore

  // Cycle de vie
  inscrits_depuis_jours?: number;     // < N jours (nouveaux)
  inscrits_avant_jours?: number;      // > N jours (anciens)

  // Réputation
  fondateur_only?: boolean;
  min_completed_sits?: number;        // ≥ N gardes terminées

  // Dormants / inactifs
  no_signin_since_days?: number;      // last_sign_in_at < now - N jours (ou null)
  no_application_ever?: boolean;      // gardien n'ayant jamais postulé
  no_sit_published_ever?: boolean;    // proprio n'ayant jamais publié d'annonce
  no_conversation_ever?: boolean;     // n'a jamais initié de conversation

  // Exclusions explicites — ex: ne pas envoyer au propriétaire d'une annonce mise en avant
  exclude_user_ids?: string[];
}

/** Présets rapides "dormants" — un clic pour appliquer un combo de filtres. */
export interface DormantPreset {
  key: string;
  label: string;
  description: string;
  segment: Segment;
  filters: MassEmailFilters;
}

export const DORMANT_PRESETS: DormantPreset[] = [
  {
    key: "profil_incomplet",
    label: "Profils incomplets",
    description: "Profil rempli à moins de 30% (à relancer en priorité)",
    segment: "tous",
    filters: { profile_completion_max: 30 },
  },
  {
    key: "inactifs_30j",
    label: "Inactifs 30j",
    description: "N'ont pas ouvert l'app depuis 30 jours",
    segment: "tous",
    filters: { no_signin_since_days: 30 },
  },
  {
    key: "gardiens_jamais_postule",
    label: "Gardiens silencieux",
    description: "Inscrits comme gardiens mais n'ont jamais postulé",
    segment: "gardiens",
    filters: { no_application_ever: true },
  },
  {
    key: "proprios_sans_annonce",
    label: "Proprios sans annonce",
    description: "Inscrits comme proprios mais n'ont jamais publié de garde",
    segment: "proprios",
    filters: { no_sit_published_ever: true },
  },
  {
    key: "jamais_engage",
    label: "Jamais engagés",
    description: "N'ont jamais initié ni reçu de conversation",
    segment: "tous",
    filters: { no_conversation_ever: true },
  },
  {
    key: "fondateurs_dormants",
    label: "Fondateurs dormants",
    description: "Fondateurs sans aucune garde réalisée",
    segment: "fondateurs",
    filters: { has_completed_sits: "no" },
  },
];

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
  if (f.profile_completion_max !== undefined && f.profile_completion_max < 100) n++;
  if (f.has_completed_sits && f.has_completed_sits !== "any") n++;
  if (f.inscrits_depuis_jours) n++;
  if (f.inscrits_avant_jours) n++;
  if (f.fondateur_only) n++;
  if (f.min_completed_sits) n++;
  if (f.no_signin_since_days) n++;
  if (f.no_application_ever) n++;
  if (f.no_sit_published_ever) n++;
  if (f.no_conversation_ever) n++;
  if (f.exclude_user_ids && f.exclude_user_ids.length > 0) n++;
  return n;
}
