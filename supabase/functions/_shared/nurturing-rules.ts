// Regles pures du moteur de nurturing, extraites pour etre testables.
//
// Lot 2 (26/07/2026) : borne superieure `max_age_days` sur les regles
// d'inscription. Sans borne, une sequence activee aujourd'hui aspire toute la
// base historique (pic de 569 envois le 20/07).
//
// Lot 7 (26/07/2026) : une seule sequence de nurturing active par personne.
// La priorite tranche quand deux sequences sont eligibles au meme moment
// (plus petit nombre = gagne).

export interface AgeWindowRule {
  min_age_days?: number
  max_age_days?: number
  window_days?: number
}

export interface AgeWindow {
  /** Borne basse ISO (candidat cree APRES cette date). */
  lowerBound: string
  /** Borne haute ISO (candidat cree AVANT cette date). */
  upperBound: string
}

/**
 * Fenetre d'anciennete d'un candidat, en dates absolues.
 *
 * - `min_age_days` : anciennete minimale (borne haute des dates de creation).
 * - `max_age_days` : anciennete maximale, PRIORITAIRE sur `window_days`.
 * - `window_days`  : largeur de fenetre si `max_age_days` est absent.
 *
 * Exemple : min_age_days 7, max_age_days 14 -> profils crees entre 14 et 7
 * jours avant maintenant. Un profil de 2021 n'est jamais candidat.
 */
export function ageWindow(rule: AgeWindowRule, nowMs: number, defaults?: { minAgeDays?: number; windowDays?: number }): AgeWindow {
  const minAge = rule.min_age_days ?? defaults?.minAgeDays ?? 0
  const maxAge = rule.max_age_days ?? (minAge + (rule.window_days ?? defaults?.windowDays ?? 7))
  const safeMax = Math.max(maxAge, minAge)
  return {
    lowerBound: new Date(nowMs - safeMax * 86400_000).toISOString(),
    upperBound: new Date(nowMs - minAge * 86400_000).toISOString(),
  }
}

/** Vrai si la regle n'a aucune borne superieure exploitable. */
export function isUnboundedRule(rule: AgeWindowRule): boolean {
  return rule.max_age_days == null && rule.window_days == null
}

/**
 * Priorite entre sequences. L'onboarding prime toujours sur les sequences de
 * reactivation ou de rattrapage. Toute sequence inconnue prend 500.
 */
export const SEQUENCE_PRIORITY: Record<string, number> = {
  'onboarding-owner': 10,
  'onboarding-sitter': 10,
  'owner-no-sit-relance': 20,
  'sitter-encourage-candidature': 30,
  'complete-affinity-owner': 40,
  'complete-affinity-sitter': 40,
  'helper-to-guard': 50,
  'discover-mutual-aid': 60,
  'referral-boost-monthly': 70,
  'reactivation-d30': 80,
}

export function sequencePriority(key: string): number {
  return SEQUENCE_PRIORITY[key] ?? 500
}

export interface JourneyRow {
  id: string
  user_id: string
  sequence_key: string
  created_at?: string | null
}

/**
 * Parmi plusieurs parcours actifs d'un meme utilisateur, retourne celui qui
 * doit etre conserve (priorite la plus forte, puis le plus ancien) et la liste
 * de ceux a sortir.
 */
export function pickWinningJourney(rows: JourneyRow[]): { keep: JourneyRow | null; exit: JourneyRow[] } {
  if (rows.length === 0) return { keep: null, exit: [] }
  const sorted = [...rows].sort((a, b) => {
    const pa = sequencePriority(a.sequence_key)
    const pb = sequencePriority(b.sequence_key)
    if (pa !== pb) return pa - pb
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return ta - tb
  })
  return { keep: sorted[0], exit: sorted.slice(1) }
}
