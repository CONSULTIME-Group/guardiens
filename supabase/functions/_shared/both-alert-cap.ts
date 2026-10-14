// Alertes « nouvelle annonce » des comptes double rôle jamais publiés
// (lot W0, point 11, 14/10/2026).
//
// Constat de l'audit du 14/10 : l'essentiel du dépassement de pression chez
// les propriétaires jamais publiés vient des alertes gardien envoyées aux
// comptes « both ». Règle : au plus une alerte immédiate nearby-sit-alert par
// jour (heure de Paris) ; les suivantes rejoignent le récapitulatif gardien
// existant (sitter_digest_queue), aucune n'est perdue. Module sans
// dépendance, importé par notify-sitters-on-publish et par les tests Vitest.

export const BOTH_NEVER_PUBLISHED_IMMEDIATE_PER_DAY = 1

export type BothAlertRoute = 'immediate' | 'digest'

export interface BothAlertFacts {
  role: string | null | undefined
  /** Le compte a déjà publié une annonce (published_at renseigné). */
  hasPublished: boolean
  /** Alertes immédiates déjà parties aujourd'hui (heure de Paris) vers ce compte. */
  immediateToday: number
}

/** Concerné par le plafond : rôle both et jamais publié. */
export function isBothNeverPublished(role: string | null | undefined, hasPublished: boolean): boolean {
  return (role ?? '').trim().toLowerCase() === 'both' && !hasPublished
}

/** Voie de l'alerte : immédiate, ou récapitulatif quand le plafond du jour est atteint. */
export function routeBothAlert(f: BothAlertFacts): BothAlertRoute {
  if (!isBothNeverPublished(f.role, f.hasPublished)) return 'immediate'
  return f.immediateToday >= BOTH_NEVER_PUBLISHED_IMMEDIATE_PER_DAY ? 'digest' : 'immediate'
}

/** Jour calendaire de Paris (AAAA-MM-JJ), même règle que sit_notification_log.notification_date. */
export function parisDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now)
}
