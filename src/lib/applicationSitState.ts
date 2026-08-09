/**
 * Etat de l'annonce vu depuis la candidature du gardien.
 *
 * Logique pure, testee unitairement : le gardien doit comprendre pourquoi
 * une candidature n'aboutira pas, plutot que de la voir disparaitre.
 *
 * Editorial : vouvoiement, aucun emoji, pas de tiret cadratin.
 */

export type SitLifecycleStatus =
  | "draft"
  | "published"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired"
  | "archived";

export const ACTIVE_SIT_STATUSES: readonly string[] = ["published", "confirmed", "in_progress"];

/** L'annonce est-elle encore active pour le gardien ? */
export function isActiveSitStatus(status: string | null | undefined): boolean {
  return ACTIVE_SIT_STATUSES.includes(String(status));
}

/** Le contenu de l'annonce peut-il etre expose ? Un brouillon reste masque. */
export function canShowSitContent(status: string | null | undefined): boolean {
  return String(status) !== "draft";
}

/**
 * Mention explicite de l'etat de l'annonce.
 * Renvoie null quand l'annonce est simplement ouverte, le badge de statut
 * de candidature suffit alors.
 */
export function sitStateNote(status: string | null | undefined): string | null {
  switch (String(status)) {
    case "cancelled":
      return "Annonce annulée par le propriétaire";
    case "archived":
      return "Annonce archivée";
    case "expired":
      return "Annonce expirée, les dates sont dépassées";
    case "in_progress":
      return "Garde en cours";
    case "completed":
      return "Garde terminée";
    case "draft":
      return "Annonce remise en brouillon par le propriétaire";
    case "confirmed":
      return "Un gardien a été retenu pour cette garde";
    default:
      return null;
  }
}

export interface ApplicationLike {
  sit_status: string | null;
}

/** Repartit les candidatures en deux sections lisibles. */
export function groupApplications<T extends ApplicationLike>(apps: readonly T[]): {
  active: T[];
  closed: T[];
} {
  const active: T[] = [];
  const closed: T[] = [];
  for (const a of apps) {
    if (isActiveSitStatus(a.sit_status)) active.push(a);
    else closed.push(a);
  }
  return { active, closed };
}
