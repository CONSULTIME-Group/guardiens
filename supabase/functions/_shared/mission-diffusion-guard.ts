/**
 * Garde-fou de diffusion de proximité d'une entraide (audit admin du 10/10/2026).
 * Source unique, pure, partagée par l'écran admin et send-mass-email-proximity.
 * Refuse une publication annulée, terminée, masquée, clôturée, ou dont la date
 * d'échéance est dépassée. Une offre durable sans échéance reste diffusable.
 */
export interface DiffusableMission {
  status?: string | null;
  mission_type?: string | null;
  hidden_by?: string | null;
  hidden_at?: string | null;
  moderation_hidden_at?: string | null;
  closed_at?: string | null;
  date_needed?: string | null;
  end_date?: string | null;
}

import { parisDateKey } from "./paris-hour";

/**
 * Clé de date Paris (AAAA-MM-JJ) de l'échéance. La fin de journée est
 * 23:59:59 heure de Paris, été comme hiver : on compare les dates civiles
 * de Paris, pas les timestamps UTC. Une date invalide garde le comportement
 * actuel : jamais dépassée.
 */
const parisDayOf = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "9999-12-31";
  return parisDateKey(d);
};

/** Motif lisible du refus, ou null si la diffusion est permise. */
export function proximityBlockReason(m: DiffusableMission, now: Date = new Date()): string | null {
  if (m.hidden_by || m.hidden_at || m.moderation_hidden_at) return "Publication masquée, diffusion impossible.";
  if (m.status === "cancelled") return "Publication annulée, diffusion impossible.";
  if (m.status === "completed") return "Publication terminée, diffusion impossible.";
  if (m.closed_at) return "Publication clôturée, diffusion impossible.";
  if (m.status === "in_progress") return "Une personne est déjà retenue, diffusion impossible.";
  if (m.status !== "open") return "Publication non ouverte, diffusion impossible.";
  const today = parisDateKey(now);
  if (m.end_date && parisDayOf(m.end_date) < today) return "Date de fin dépassée, diffusion impossible.";
  if (m.mission_type !== "offre" && m.date_needed && parisDayOf(m.date_needed) < today) {
    return "Date de besoin dépassée, diffusion impossible.";
  }
  return null;
}
