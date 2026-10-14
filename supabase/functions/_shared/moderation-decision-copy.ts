// Lot J2c (14/10/2026) : texte de l'email moderation-decision (CGU 11.3,
// 11.4, 14.5). Module pur, sans dépendance Deno, rendu par le gabarit et
// vérifié par les tests.
//
// Une décision donne : la mesure, sa durée et son étendue, les faits et
// l'origine, l'usage éventuel d'un outil automatisé, la règle appliquée et
// les voies de recours. Un avertissement préalable (procédure ordinaire de
// l'article 11.3) donne les faits, la règle, la mesure envisagée et le délai
// pour présenter ses observations.
//
// Toute donnée vient de l'appelant : un élément absent n'est jamais inventé,
// sa section est omise. Seules les phrases fixes des CGU (étendue d'une
// mesure de compte, voies de recours) sont écrites ici.

import { RECOURSE_LINES } from './moderation-rules.ts'

export type ModerationAction = 'warn' | 'hide' | 'suspend' | 'delete' | 'terminate'
export type ModerationTarget = 'profile' | 'listing' | 'review' | 'message' | 'small_mission'
export type ModerationOrigin = 'report' | 'initiative'
export type ModerationAutomation = 'none' | 'detection' | 'decision'

export interface ModerationDecisionData {
  firstName?: string
  /** decision (défaut) ou notice : avertissement avant suspension ou résiliation. */
  kind?: 'decision' | 'notice'
  action?: ModerationAction
  targetType?: ModerationTarget
  /** Message rédigé par l'équipe pour le membre (lot A9). */
  memberMessage?: string
  /** Faits retenus, en une phrase. */
  facts?: string
  origin?: ModerationOrigin
  automated?: ModerationAutomation
  /** Phrase de la règle appliquée, article compris (moderation-rules.ts). */
  ruleStatement?: string
  /** Suspension : nombre de jours, null pour le temps de l'examen. */
  durationDays?: number | null
  /** Dernier jour de la suspension, AAAA-MM-JJ. */
  untilDate?: string
  /** Avertissement : délai pour présenter ses observations. */
  observationDays?: number
  /** Avertissement : dernier jour du délai, AAAA-MM-JJ. */
  observationUntil?: string
  /** Suspension à titre conservatoire (article 11.4) : observations attendues. */
  conservatory?: boolean
}

export interface CopySection {
  key: 'measure' | 'duration' | 'scope' | 'facts' | 'origin' | 'automation' | 'rule' | 'observations' | 'recourse'
  label: string
  lines: string[]
}

export interface ModerationDecisionCopy {
  subject: string
  preview: string
  heading: string
  greeting: string
  sections: CopySection[]
  memberMessage?: string
  closing: string
}

const ABOUT: Record<ModerationTarget, string> = {
  profile: 'votre profil',
  listing: 'votre annonce',
  review: 'votre avis',
  message: 'un de vos messages',
  small_mission: "votre demande d'entraide",
}

export function moderationDecisionLine(action?: ModerationAction, target?: ModerationTarget): string {
  const t = target ?? 'profile'
  const hidden: Record<ModerationTarget, string> = {
    profile: 'Votre profil a été masqué par la modération.',
    listing: 'Votre annonce a été masquée par la modération.',
    review: 'Votre avis a été masqué par la modération.',
    message: 'Un de vos messages a été masqué par la modération.',
    small_mission: "Votre demande d'entraide a été masquée par la modération.",
  }
  const deleted: Record<ModerationTarget, string> = {
    profile: 'Votre profil a été retiré par la modération.',
    listing: 'Votre annonce a été supprimée par la modération.',
    review: 'Votre avis a été supprimé par la modération.',
    message: 'Un de vos messages a été supprimé par la modération.',
    small_mission: "Votre demande d'entraide a été supprimée par la modération.",
  }
  switch (action) {
    case 'hide': return hidden[t]
    case 'delete': return deleted[t]
    case 'suspend': return 'Votre compte est suspendu par la modération.'
    case 'terminate': return 'Votre compte est résilié par la modération (article 11.5 des CGU).'
    default: return `La modération vous adresse un avertissement au sujet de ${ABOUT[t]}.`
  }
}

/** AAAA-MM-JJ vers JJ/MM/AAAA ; toute autre forme est ignorée. */
export function frenchDate(iso?: string | null): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null
}

function isAccountMeasure(action?: ModerationAction, target?: ModerationTarget): boolean {
  return action === 'suspend' || action === 'terminate' || (action === 'delete' && (target ?? 'profile') === 'profile')
}

function durationLine(d: ModerationDecisionData): string | null {
  const until = frenchDate(d.untilDate)
  switch (d.action) {
    case 'suspend':
      if (typeof d.durationDays === 'number' && d.durationDays > 0) {
        return `${d.durationDays} jour${d.durationDays > 1 ? 's' : ''}${until ? `, jusqu'au ${until}` : ''}.`
      }
      if (d.durationDays === null) return "Le temps de l'examen de votre situation par l'équipe."
      return null
    case 'terminate':
      return 'Définitive. Un nouveau compte demande ensuite l\'accord écrit de Guardiens (article 11.9 des CGU).'
    case 'delete':
      return 'Définitive.'
    case 'hide':
      return "Jusqu'à une nouvelle décision de l'équipe, notamment après un réexamen."
    case 'warn':
      return 'Avertissement ponctuel.'
    default:
      return null
  }
}

function scopeLine(d: ModerationDecisionData): string | null {
  const t = d.targetType ?? 'profile'
  switch (d.action) {
    case 'suspend':
      return "Votre compte entier : la publication d'annonces et de besoins, les candidatures et l'envoi de messages sont suspendus pendant cette durée."
    case 'terminate':
      return 'Votre compte entier, qui est fermé.'
    case 'delete':
      return t === 'profile' ? 'Votre compte entier, qui est fermé.' : `Ce contenu seulement : ${ABOUT[t]}.`
    case 'hide':
      return `Ce contenu seulement : ${ABOUT[t]}.`
    case 'warn':
      return 'Un avertissement : votre compte et vos contenus restent actifs.'
    default:
      return null
  }
}

function originLine(origin?: ModerationOrigin): string | null {
  if (origin === 'report') return 'Un signalement reçu par Guardiens.'
  if (origin === 'initiative') return "Un contrôle mené à l'initiative de Guardiens."
  return null
}

function automationLine(a?: ModerationAutomation): string | null {
  if (a === 'none') return "Cette décision a été prise entièrement par une personne de l'équipe."
  if (a === 'detection') return "Un outil automatisé a repéré la situation, puis une personne de l'équipe a pris la décision."
  if (a === 'decision') return "Cette décision a été prise par un outil automatisé. Une personne de l'équipe peut la revoir à votre demande."
  return null
}

// Tirets demi-cadratin et cadratin (U+2013, U+2014), écrits par leur code.
const LONG_DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, 'g')

function clean(s?: string | null): string | null {
  if (typeof s !== 'string') return null
  const t = s.replace(LONG_DASHES, ',').trim()
  return t || null
}

function envisagedMeasure(action?: ModerationAction): string {
  return action === 'terminate'
    ? 'la résiliation de votre compte (article 11.5 des CGU)'
    : 'la suspension de votre compte'
}

export function buildModerationDecisionCopy(d: ModerationDecisionData): ModerationDecisionCopy {
  const greeting = d.firstName ? `Bonjour ${d.firstName},` : 'Bonjour,'
  const facts = clean(d.facts)
  const rule = clean(d.ruleStatement)
  const origin = originLine(d.origin)
  const automation = automationLine(d.automated)
  const memberMessage = clean(d.memberMessage) ?? undefined
  const sections: CopySection[] = []
  const push = (key: CopySection['key'], label: string, line: string | null) => {
    if (line) sections.push({ key, label, lines: [line] })
  }

  if (d.kind === 'notice') {
    const until = frenchDate(d.observationUntil)
    push('measure', 'Mesure envisagée', `Guardiens envisage ${envisagedMeasure(d.action)}. Votre compte reste actif pendant le délai ci-dessous.`)
    push('facts', 'Faits reprochés', facts)
    push('origin', 'Origine', origin)
    push('automation', 'Outil automatisé', automation)
    push('rule', 'Règle en cause', rule)
    if (typeof d.observationDays === 'number' && d.observationDays > 0) {
      push('observations', 'Vos observations',
        `Vous pouvez présenter vos observations ou corriger la situation dans un délai de ${d.observationDays} jour${d.observationDays > 1 ? 's' : ''}${until ? `, soit jusqu'au ${until} inclus` : ''}, en répondant à cet email ou en écrivant à contact@guardiens.fr. Guardiens décidera ensuite au vu de ces éléments (article 11.3 des CGU).`)
    }
    return {
      subject: 'Guardiens : vos observations sont attendues',
      preview: 'Vos observations sont attendues avant toute décision',
      heading: 'Vos observations sont attendues',
      greeting,
      sections,
      memberMessage,
      closing: 'Elisa et Jérémie lisent chaque réponse à cet email.',
    }
  }

  push('measure', 'Mesure', moderationDecisionLine(d.action, d.targetType))
  push('duration', 'Durée', durationLine(d))
  push('scope', 'Étendue', scopeLine(d))
  push('facts', 'Faits retenus', facts)
  push('origin', 'Origine', origin)
  push('automation', 'Outil automatisé', automation)
  push('rule', 'Règle appliquée', rule)
  if (d.conservatory && isAccountMeasure(d.action, d.targetType)) {
    push('observations', 'Vos observations',
      'Cette mesure est prise à titre conservatoire (article 11.4 des CGU) : présentez vos observations en répondant à cet email, et la mesure sera réexaminée à leur lumière.')
  }
  sections.push({ key: 'recourse', label: 'Voies de recours', lines: [...RECOURSE_LINES] })

  return {
    subject: 'Décision de modération Guardiens',
    preview: 'Décision de modération Guardiens',
    heading: 'Décision de modération',
    greeting,
    sections,
    memberMessage,
    closing: 'Pour toute question sur cette décision, répondez simplement à cet email : Elisa et Jérémie vous lisent.',
  }
}
