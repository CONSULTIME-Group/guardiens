// Lot E17 « La boucle tenue » : relance du demandeur quand une réponse
// attend son choix. Logique pure et testable (send-mission-nudges).

/** Délai avant la relance : 24 h (48 h avant le lot E17). */
export const RESPONSE_WAITING_HOURS = 24;

export interface DueResponseRow {
  id: string;
  mission_id: string;
  responder_id: string;
  created_at: string;
  choose_prompt_sent_at?: string | null;
  mission?: { id: string; user_id: string; title: string; status: string } | null;
}

export interface DueGroup {
  missionId: string;
  mission: DueResponseRow["mission"];
  responseIds: string[];
  responderIds: string[];
}

/** Réponse due : en attente depuis 24 h au moins, jamais relancée. */
export function isResponseWaitingDue(
  row: Pick<DueResponseRow, "created_at" | "choose_prompt_sent_at">,
  now: Date,
): boolean {
  if (row.choose_prompt_sent_at) return false;
  const created = Date.parse(row.created_at);
  if (!Number.isFinite(created)) return false;
  return now.getTime() - created >= RESPONSE_WAITING_HOURS * 3600 * 1000;
}

/**
 * Regroupe les réponses dues par besoin, dans l'ordre d'arrivée : un seul
 * email par besoin et par passage, chaque réponse relancée une fois.
 */
export function groupDueResponses(rows: DueResponseRow[]): DueGroup[] {
  const byMission = new Map<string, DueGroup>();
  for (const r of rows) {
    if (r.choose_prompt_sent_at) continue;
    let g = byMission.get(r.mission_id);
    if (!g) {
      g = { missionId: r.mission_id, mission: r.mission ?? null, responseIds: [], responderIds: [] };
      byMission.set(r.mission_id, g);
    }
    if (!g.responseIds.includes(r.id)) {
      g.responseIds.push(r.id);
      g.responderIds.push(r.responder_id);
    }
  }
  return [...byMission.values()];
}
