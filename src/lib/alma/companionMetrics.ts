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

/**
 * Définition unique de la répétition des amorces, partagée par les onglets
 * Conversations et Pilotage : cinq premiers mots normalisés (openerOf),
 * amorces d'au moins trois mots, part des réponses dont l'amorce revient.
 */
export function openerGroups(answers: Array<string | null | undefined>): { total: number; repeated: number; groups: Array<{ opening: string; count: number }> } {
  const counts = new Map<string, number>();
  let total = 0;
  for (const a of answers) {
    if (typeof a !== "string" || !a.trim()) continue;
    total++;
    const k = openerOf(a);
    if (k.split(" ").length >= 3) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const groups = [...counts.entries()].filter(([, c]) => c > 1)
    .map(([opening, count]) => ({ opening, count }))
    .sort((a, b) => b.count - a.count || a.opening.localeCompare(b.opening));
  return { total, repeated: groups.reduce((s, g) => s + g.count, 0), groups };
}

export function measureCompanion(rows: CompanionRow[]): CompanionMeasure {
  const answered = rows.filter((r) => typeof r.answer === "string" && r.answer.trim());
  const sharedOpeners = openerGroups(answered.map((r) => r.answer)).repeated;
  const flagged = answered.filter((r) => r.classification && typeof r.classification.fallback_template === "boolean");
  return {
    answers: answered.length,
    sharedOpeners,
    fallbacks: flagged.filter((r) => r.classification!.fallback_template === true).length,
    lockedChecked: flagged.length,
  };
}

export const SHARED_OPENER_TARGET = 0.05;
