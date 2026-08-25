import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

export type SitStatus = Database["public"]["Enums"]["sit_status"];

/**
 * Liste canonique des statuts de garde, lue directement depuis l'enum de la base.
 * Ne jamais recopier cette liste à la main : tout statut ajouté en base doit
 * apparaître ici automatiquement.
 */
export const SIT_STATUSES: readonly SitStatus[] = Constants.public.Enums.sit_status;

export type SitStatusBadgeVariant = "default" | "secondary" | "outline" | "destructive";

export type SitStatusBadge = { label: string; variant: SitStatusBadgeVariant };

/** Libellés admin, un par statut existant. Vouvoiement, pas d'emoji. */
export const SIT_STATUS_LABELS: Record<SitStatus, SitStatusBadge> = {
  draft: { label: "Brouillon", variant: "outline" },
  published: { label: "En ligne", variant: "default" },
  confirmed: { label: "Confirmée", variant: "secondary" },
  in_progress: { label: "En cours", variant: "default" },
  completed: { label: "Terminée", variant: "secondary" },
  cancelled: { label: "Annulée (auteur)", variant: "outline" },
  archived: { label: "Archivée", variant: "secondary" },
  expired: { label: "Expirée", variant: "outline" },
};

/** Libellés courts pour les compteurs et tableaux de bord. */
export const SIT_STATUS_SHORT_LABELS: Record<SitStatus, string> = {
  draft: "Brouillons",
  published: "Publiées",
  confirmed: "Confirmées",
  in_progress: "En cours",
  completed: "Terminées",
  cancelled: "Annulées",
  archived: "Archivées",
  expired: "Expirées",
};

export const isSitStatus = (value: unknown): value is SitStatus =>
  typeof value === "string" && (SIT_STATUSES as readonly string[]).includes(value);

/**
 * Un statut non reconnu n'emprunte jamais l'identité d'un autre statut :
 * on affiche la valeur brute pour qu'elle saute aux yeux.
 */
export const resolveSitStatusBadge = (status: unknown): SitStatusBadge => {
  if (isSitStatus(status)) return SIT_STATUS_LABELS[status];
  const raw = typeof status === "string" && status.trim() ? status : "non renseigné";
  return { label: `Statut inconnu : ${raw}`, variant: "destructive" };
};
