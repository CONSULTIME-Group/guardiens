// Lot C2 (11/10/2026) : statut de compte qui interdit les emails non
// transactionnels (marketing, récapitulatifs, alertes).
//
// Un compte est bloqué s'il est suspendu (suspended_at posé et suspension
// sans fin ou pas encore terminée) ou si son account_status n'est pas
// « active ». Fonction pure, testée côté Vitest.

export interface AccountStatusRow {
  account_status?: string | null
  suspended_at?: string | null
  suspended_until?: string | null
}

export function isAccountBlockedForMarketing(row: AccountStatusRow | null | undefined, now: Date = new Date()): boolean {
  if (!row) return false
  const status = (row.account_status ?? '').trim().toLowerCase()
  if (status && status !== 'active') return true
  if (!row.suspended_at) return false
  if (!row.suspended_until) return true
  const until = new Date(row.suspended_until).getTime()
  return Number.isNaN(until) ? true : until > now.getTime()
}
