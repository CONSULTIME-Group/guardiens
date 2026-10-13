/**
 * Lot Z2 (audit A-12 du 13/10/2026) : garde déjà commencée, toujours ouverte.
 *
 * Une annonce publiée dont la date de début est passée reste en ligne tant
 * que sa date de fin n'est pas dépassée (expiration de sit-expiry.ts, liste
 * publique filtrée sur la fin, applyOpenSitFilter). Publiée veut dire qu'aucun
 * gardien n'est retenu : l'acceptation passe l'annonce en confirmed. Le
 * gardien qui la lit doit comprendre qu'il arrivera en cours de séjour.
 *
 * Cas réel : annonce 2c79fa88, début le 09/10, fin le 01/11, 4 candidatures
 * ouvertes, aucune retenue (base, 13/10/2026).
 */
import { parisTodayIso } from "@/lib/sitSearchRules";

/** Texte affiché sur la fiche et sur la carte. */
export const STARTED_SIT_NOTICE = "Garde déjà commencée, arrivée possible en cours de séjour";

export interface StartedSitInput {
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

const day = (v: string | null | undefined): string | null => {
  if (typeof v !== "string") return null;
  const d = v.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
};

/**
 * Vrai pour une annonce publiée dont le début est strictement avant aujourd'hui
 * (jour calendaire à Paris) et dont la fin n'est pas encore passée.
 * Une garde qui commence aujourd'hui n'est pas « déjà commencée ».
 */
export function isStartedOpenSit(sit: StartedSitInput | null | undefined, today: string = parisTodayIso()): boolean {
  if (!sit || sit.status !== "published") return false;
  const start = day(sit.start_date);
  if (!start || start >= today) return false;
  const end = day(sit.end_date);
  if (end && end < today) return false;
  return true;
}
