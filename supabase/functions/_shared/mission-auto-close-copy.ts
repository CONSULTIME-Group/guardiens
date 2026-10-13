// Lot Z2 (audit C-14 du 13/10/2026) : le texte d'une clôture automatique suit
// son motif réel. Avant, tout besoin clos par auto-close-small-missions lisait
// « clôturée après N jours sans activité », y compris un besoin publié et clos
// le même jour parce que sa date était passée (15 notifications et 12 emails
// au 13/10/2026).
//
// Module pur, sans Deno : lu par auto-close-small-missions, par le gabarit
// mission-auto-closed et par les tests vitest.

/** Motifs posés par la phase 2 d'auto-close-small-missions. */
export type MissionAutoCloseReason = 'end_date_past' | 'date_needed_past' | 'dormant_45d'

/** Vrai quand la clôture vient de la date du besoin (fin, sinon date souhaitée). */
export function isDateAutoClose(reason: string | null | undefined): boolean {
  return reason === 'end_date_past' || reason === 'date_needed_past'
}

/** Phrase de cause, sans majuscule ni point final : « sa date est passée ». */
export function missionAutoCloseCause(reason: string | null | undefined, ageDays?: number | null): string {
  if (isDateAutoClose(reason)) return 'sa date est passée'
  const days = typeof ageDays === 'number' && Number.isFinite(ageDays) && ageDays > 0 ? Math.floor(ageDays) : null
  return days ? `elle est restée en ligne ${days} jours` : 'elle est restée en ligne plusieurs semaines'
}

/** Corps de la notification in-app. */
export function missionAutoClosedNoticeBody(
  title: string,
  reason: string | null | undefined,
  ageDays?: number | null,
): string {
  const invite = isDateAutoClose(reason)
    ? 'Vous pouvez la republier avec une nouvelle date.'
    : 'Vous pouvez la republier pour relancer les personnes du coin.'
  return `« ${title} » a été clôturée, ${missionAutoCloseCause(reason, ageDays)}. ${invite}`
}
