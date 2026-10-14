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
export interface SitStateNoteContext {
  /** Statut de la candidature du gardien. */
  appStatus?: string | null;
  /** Candidature née d'une proposition privée (lot I2). */
  fromProposal?: boolean;
  /** Le gardien a lui-même annulé sa participation (get_my_applications). */
  cancelledByMe?: boolean;
}

export function sitStateNote(status: string | null | undefined, ctx: SitStateNoteContext = {}): string | null {
  // Lot X3a (B-02) : le gardien qui a annulé lit sa propre action.
  if (ctx.cancelledByMe) return "Vous avez annulé votre participation";
  // Lot X3a (B-07) : oui à une proposition privée, la garde reste en brouillon
  // jusqu'à la confirmation du propriétaire.
  if (String(status) === "draft" && ctx.fromProposal && isOpenApplicationStatus(ctx.appStatus)) {
    return "Vous avez dit oui. Le propriétaire confirme la garde avec vous.";
  }
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
  status?: string | null;
  sit_end_date?: string | null;
  /**
   * Lot Z2 : verdict serveur public.sit_is_reviewable(sit_id), renvoyé par
   * get_my_applications. Quand il est présent, il fait foi (même règle que
   * l'insertion d'un avis) ; absent, la règle d'écran ci-dessous s'applique.
   */
  sit_reviewable?: boolean | null;
}

/** Jour local au format AAAA-MM-JJ. */
function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Lot Z : garde réalisée par le gardien. Candidature acceptée sur une annonce
 * terminée, ou archivée après sa date de fin (même règle que isSitReviewable).
 * Lot Z2 : sit_reviewable, quand get_my_applications le fournit, tranche.
 * Avant ce lot, ces gardes apparaissaient sous « Candidatures sans suite ».
 */
export function isCompletedSitForSitter(a: ApplicationLike, now: Date = new Date()): boolean {
  if (a.status !== "accepted") return false;
  // Lot Z2 : le serveur sait si l'annonce archivée est passée par « terminée ».
  if (typeof a.sit_reviewable === "boolean") return a.sit_reviewable;
  if (a.sit_status === "completed") return true;
  if (a.sit_status !== "archived" || !a.sit_end_date) return false;
  return String(a.sit_end_date).slice(0, 10) < localDay(now);
}

/**
 * Repartit les candidatures en trois sections lisibles : en cours, gardes
 * réalisées (lot Z), sans suite.
 * Lot X3a (B-07) : une candidature ouverte née d'une proposition privée
 * (annonce en brouillon) reste « en cours », le propriétaire doit confirmer.
 */
export function groupApplications<T extends ApplicationLike>(
  apps: readonly T[],
  opts: { isProposal?: (a: T) => boolean; now?: Date } = {},
): {
  active: T[];
  done: T[];
  closed: T[];
} {
  const active: T[] = [];
  const done: T[] = [];
  const closed: T[] = [];
  const now = opts.now ?? new Date();
  for (const a of apps) {
    if (isActiveSitStatus(a.sit_status)) active.push(a);
    else if (String(a.sit_status) === "draft" && isOpenApplicationStatus(a.status) && opts.isProposal?.(a)) active.push(a);
    else if (isCompletedSitForSitter(a, now)) done.push(a);
    else closed.push(a);
  }
  return { active, done, closed };
}

/**
 * Lot X3a (B-04) : libellé d'une candidature passée en cancelled. Une
 * clôture système (annonce expirée, archivée, annulée) n'est jamais
 * présentée comme un retrait du gardien.
 */
export function cancelledApplicationLabel(
  sitStatus: string | null | undefined,
  cancelledByMe = false,
): string {
  if (cancelledByMe) return "Participation annulée";
  switch (String(sitStatus)) {
    case "expired":
      return "Annonce expirée";
    case "archived":
    case "cancelled":
    case "completed":
    case "draft":
      return "Annonce close";
    default:
      return "Retirée";
  }
}

/**
 * Candidature encore ouverte, donc acceptable par le propriétaire :
 * pending, viewed ou discussing (même ensemble que la RPC accept_application).
 */
export function isOpenApplicationStatus(status: string | null | undefined): boolean {
  return status === "pending" || status === "viewed" || status === "discussing";
}
