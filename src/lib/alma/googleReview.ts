/**
 * Lot ALMA3 (10/11/2026, demande de Jérémie) : Alma invite les membres actifs
 * à donner leur avis sur Google, dans son aperçu, son panneau et la cloche.
 *
 * Fiche Google vérifiée le 10/11/2026 : « Guardiens », Vieux-Lyon (même
 * identifiant que la recherche « guardiens.fr Lyon »). Le lien ouvre
 * directement le formulaire d'avis.
 *
 * Règle Google : la demande va à tous les membres qui ont utilisé Guardiens,
 * sans tri par satisfaction (un tri serait de la sélection d'avis).
 */
import { GOOGLE_REVIEW_URL } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export { GOOGLE_REVIEW_URL };

/** Type de la notification posée dans la cloche, et condition du murmure. */
export const GOOGLE_REVIEW_NOTIFICATION_TYPE = "google_review_invite";

/** Liens externes qu'Alma et la cloche ont le droit d'ouvrir (liste fermée). */
export const ALLOWED_EXTERNAL_LINKS: readonly string[] = [GOOGLE_REVIEW_URL];

export function isAllowedExternalLink(href: string | null | undefined): href is string {
  return typeof href === "string" && ALLOWED_EXTERNAL_LINKS.includes(href.trim());
}

/** Aperçu : une ligne, le panneau porte le lien. */
export const GOOGLE_REVIEW_PEEK = "Votre avis aide la communauté à grandir";

/** Panneau d'Alma : le mot « avis » porte le lien vers le formulaire Google. */
export const GOOGLE_REVIEW_PANEL_MESSAGE =
  `Vous faites vivre Guardiens près de chez vous. Ce serait super d'aider la communauté à grandir : un mot de votre part sur Google, tout simplement, avec votre [avis](${GOOGLE_REVIEW_URL}).`;

/** Cloche : toute la notification ouvre le formulaire Google. */
export const GOOGLE_REVIEW_NOTIFICATION = {
  title: "Votre avis compte",
  body: "Vous faites vivre Guardiens près de chez vous. Ce serait super d'aider la communauté à grandir : donnez votre avis sur Google, tout simplement.",
} as const;

export type GoogleReviewSource = "alma_panel" | "notification_bell" | "notification_page";

export function googleReviewDoneKey(userId: string): string {
  return `alma_google_review_shown:${userId}`;
}

/** Ouvre le formulaire Google dans un nouvel onglet et mesure le clic. */
export function openGoogleReview(source: GoogleReviewSource): void {
  trackEvent("google_review_link_clicked", { metadata: { source } });
  if (typeof window !== "undefined") window.open(GOOGLE_REVIEW_URL, "_blank", "noopener,noreferrer");
}

/** Un clic depuis Alma vaut lecture de l'invitation dans la cloche. */
export async function markGoogleReviewInviteRead(userId: string): Promise<void> {
  try {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("type", GOOGLE_REVIEW_NOTIFICATION_TYPE)
      .is("read_at", null);
  } catch {
    /* la cloche reste non lue, sans effet sur l'avis */
  }
}
