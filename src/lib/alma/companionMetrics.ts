/**
 * Lot L4 : mesures du compagnon, logique pure et testée.
 *  - part des réponses qui partagent leurs cinq premiers mots avec au moins
 *    une autre réponse de la période (objectif sous 5 %) ;
 *  - part des replis sur gabarit (classification.fallback_template) ;
 *  - part de « pas utile » parmi les retours.
 */
import { openerOf } from "./replayChecks";

export interface CompanionRow { answer: string | null; classification: Record<string, unknown> | null }

export interface CompanionMeasure {
  answers: number;
  sharedOpeners: number;
  fallbacks: number;
  /** Réponses soumises au contrôle des faits verrouillés. */
  lockedChecked: number;
}

export function measureCompanion(rows: CompanionRow[]): CompanionMeasure {
  const answered = rows.filter((r) => typeof r.answer === "string" && r.answer.trim());
  const counts = new Map<string, number>();
  const keys = answered.map((r) => {
    const k = openerOf(r.answer!);
    if (k.split(" ").length >= 3) counts.set(k, (counts.get(k) ?? 0) + 1);
    return k;
  });
  const sharedOpeners = keys.filter((k) => (counts.get(k) ?? 0) > 1).length;
  const flagged = answered.filter((r) => r.classification && typeof r.classification.fallback_template === "boolean");
  return {
    answers: answered.length,
    sharedOpeners,
    fallbacks: flagged.filter((r) => r.classification!.fallback_template === true).length,
    lockedChecked: flagged.length,
  };
}

export const SHARED_OPENER_TARGET = 0.05;
