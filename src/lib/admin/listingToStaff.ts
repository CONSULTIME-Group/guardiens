/**
 * Lot ADM12 (arène admin du 09/11/2026) : une seule définition de
 * « annonce sans candidature », partagée par la pastille du menu
 * (admin_menu_badges), le signal du matin (detect_stale_sits), la ligne
 * « Diffuser » de la vue d'ensemble et le filtre de /admin/listings :
 * annonce publiée depuis 48 heures au moins, départ à venir, aucune
 * candidature active (refusées et annulées ne comptent pas).
 *
 * Avant ce lot, la pastille comptait dès la publication et jusqu'à la fin de
 * la garde, le signal comptait aussi les candidatures refusées et la vue
 * d'ensemble écartait les annonces sans gardien dans le rayon : 8, 6 et 3
 * pour la même file le 09/11/2026.
 */
import { isPastDay } from "@/lib/calendarDate";

export const TO_STAFF_AFTER_HOURS = 48;

export interface ToStaffInput {
  status?: string | null;
  published_at?: string | null;
  start_date?: string | null;
  activeApplications: number | null | undefined;
}

export function isListingToStaff(l: ToStaffInput, now: Date = new Date()): boolean {
  if (l.status !== "published") return false;
  if (l.activeApplications !== 0) return false;
  if (!l.published_at) return false;
  const publishedAt = Date.parse(l.published_at);
  if (!Number.isFinite(publishedAt)) return false;
  if (now.getTime() - publishedAt < TO_STAFF_AFTER_HOURS * 3_600_000) return false;
  if (l.start_date && isPastDay(l.start_date, now)) return false;
  return true;
}
