/**
 * Lot ALMA4b (13/11/2026) : mesure de « l'aperçu qui se répond » pour
 * /admin/alma, logique pure. Un aperçu compte quand il a été rendu avec une
 * puce (alma_whisper_peek_shown, metadata.chip), une réponse quand la puce a
 * été touchée (alma_whisper_reply_clicked). Les comptes de l'équipe sortent
 * du calcul : leurs recettes fausseraient un taux mesuré sur peu de membres.
 */
export const REPLY_CHIP_PEEK_EVENT = "alma_whisper_peek_shown";
export const REPLY_CHIP_CLICK_EVENT = "alma_whisper_reply_clicked";
export const REPLY_CHIP_EVENTS = [REPLY_CHIP_PEEK_EVENT, REPLY_CHIP_CLICK_EVENT] as const;

/** Prédiction de l'arène du 10/11/2026 : puce touchée sur 3 % des aperçus à J+14. */
export const REPLY_CHIP_TARGET = 0.03;
/** Mise en production du lot ALMA4 : aucune mesure avant cette date. */
export const REPLY_CHIP_MEASURED_SINCE = "2026-11-13";

export type ReplyChipKind = "another" | "tell";
export const REPLY_CHIP_KIND_LABELS: Readonly<Record<ReplyChipKind, string>> = {
  another: "Une autre !",
  tell: "Raconte",
};

export interface ReplyChipEventRow {
  user_id: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
}

export interface ReplyChipKindMeasure { peeks: number; clicks: number }

export interface ReplyChipMeasure {
  peeks: number;
  peekPeople: number;
  clicks: number;
  clickPeople: number;
  /** null tant qu'aucun aperçu avec puce n'a été rendu. */
  rate: number | null;
  byKind: Record<ReplyChipKind, ReplyChipKindMeasure>;
}

function chipOf(row: ReplyChipEventRow): ReplyChipKind | null {
  const chip = row.metadata?.chip;
  return chip === "another" || chip === "tell" ? chip : null;
}

export function replyChipMeasure(rows: readonly ReplyChipEventRow[], teamIds: Iterable<string> = []): ReplyChipMeasure {
  const team = new Set(teamIds);
  const peekPeople = new Set<string>();
  const clickPeople = new Set<string>();
  const byKind: Record<ReplyChipKind, ReplyChipKindMeasure> = {
    another: { peeks: 0, clicks: 0 },
    tell: { peeks: 0, clicks: 0 },
  };
  let peeks = 0;
  let clicks = 0;
  for (const row of rows) {
    if (!row.user_id || team.has(row.user_id)) continue;
    const chip = chipOf(row);
    if (!chip) continue;
    if (row.event_type === REPLY_CHIP_PEEK_EVENT) {
      peeks++; byKind[chip].peeks++; peekPeople.add(row.user_id);
    } else if (row.event_type === REPLY_CHIP_CLICK_EVENT) {
      clicks++; byKind[chip].clicks++; clickPeople.add(row.user_id);
    }
  }
  return {
    peeks, peekPeople: peekPeople.size, clicks, clickPeople: clickPeople.size,
    rate: peeks > 0 ? clicks / peeks : null,
    byKind,
  };
}

/** « 2,4 % », une décimale sous 10 %. */
export function replyChipRateLabel(rate: number | null): string {
  if (rate === null) return "En attente du premier aperçu";
  const pct = rate * 100;
  return `${pct < 10 ? pct.toFixed(1).replace(".", ",") : Math.round(pct)} %`;
}
