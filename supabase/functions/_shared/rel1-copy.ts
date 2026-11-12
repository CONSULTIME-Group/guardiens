// Lot REL1 (12/11/2026) : textes validés par Jérémie le 12/11/2026 à 11 h 12
// (claude/lot-rel1-textes-valides-12-novembre-2026.md). Toute retouche passe
// par lui. Module pur, sans dépendance Deno : lu par les trois gabarits, par
// les balayages et par Vitest (verrou « au mot près »).

/** Mention affichée au seul candidat concerné (décision D2, option B). */
export const REL1_MENTION = 'Réponse du propriétaire en attente'

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

/** « 2026-11-23 » devient « 23 novembre 2026 » (« 1er » pour le premier du mois). */
export function frenchDate(iso: string | null | undefined, withYear = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
  if (!m) return ''
  const day = Number(m[3])
  const month = MONTHS[Number(m[2]) - 1]
  if (!month || day < 1 || day > 31) return ''
  return `${day === 1 ? '1er' : day} ${month}${withYear ? ` ${m[1]}` : ''}`
}

/** Jour civil à Paris, décalé de `days` jours, au format AAAA-MM-JJ. */
export function parisDay(now: number, days = 0): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(now))
  const base = Date.parse(`${parts}T12:00:00Z`) + days * 86400000
  return new Date(base).toISOString().slice(0, 10)
}

const hello = (firstName?: string | null) => `Bonjour${firstName?.trim() ? ` ${firstName.trim()}` : ''},`
const quoted = (title?: string | null) => (title?.trim() ? ` « ${title.trim()} »` : '')
const days = (n: number) => `${n} jour${n > 1 ? 's' : ''}`
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

// ── Email 1 : brouillon presque prêt (au propriétaire) ───────────────────

export interface AlmostReadyInput {
  firstName?: string | null
  title?: string | null
  city?: string | null
  startDate?: string | null
  endDate?: string | null
  /** Libellés de ce qui manque, dans les mots du formulaire. */
  missing?: Array<{ label: string }> | null
}

export const ALMOST_READY_SUBJECT = 'Votre annonce est presque prête'
export const ALMOST_READY_PREVIEW = 'Vos dates et votre texte sont enregistrés. Il reste une étape.'
export const ALMOST_READY_CLOSING =
  'Votre projet a changé ? Vous modifiez vos dates ou vous supprimez ce brouillon depuis votre espace.'

export function almostReadyCopy(input: AlmostReadyInput) {
  const missing = (input.missing ?? []).map(m => m.label.trim()).filter(Boolean)
  const start = frenchDate(input.startDate)
  const end = frenchDate(input.endDate)
  const dates = start && end ? ` (du ${start} au ${end})` : ''
  const city = input.city?.trim()
  return {
    subject: ALMOST_READY_SUBJECT,
    preview: ALMOST_READY_PREVIEW,
    hello: hello(input.firstName),
    intro: `Votre annonce${quoted(input.title)} est enregistrée, avec vos dates${dates} et votre texte.`,
    step: missing.length > 0
      ? `Pour la publier, il reste à ajouter : ${missing.map(lowerFirst).join(', ')}.`
      : 'Tout est renseigné. Il reste à la relire et à la publier.',
    body: `Une fois publiée, elle est visible par les gardiens à proximité${city ? ` de ${city}` : ''}. `
      + 'Vous recevez leurs candidatures, vous échangez avec eux et vous choisissez vous-même la personne qui vous convient. '
      + 'Une rencontre avant la garde est possible si vous le souhaitez, elle reste facultative. Guardiens est gratuit.',
    button: missing.length > 0 ? 'Terminer mon annonce' : 'Relire et publier mon annonce',
    closing: ALMOST_READY_CLOSING,
  }
}

// ── Email 2 : candidatures en attente depuis 7 jours (au propriétaire) ───

export interface SecondNudgeInput {
  ownerFirstName?: string | null
  /** Prénom du gardien, utilisé quand une seule candidature attend. */
  sitterFirstName?: string | null
  sitTitle?: string | null
  count: number
  /** Âge en jours de la candidature la plus ancienne. */
  oldestDays: number
  /** Date (AAAA-MM-JJ) à partir de laquelle les candidats sont prévenus. */
  noticeDay: string
}

export const SECOND_NUDGE_PREVIEW = 'Un mot suffit pour leur répondre.'
export const SECOND_NUDGE_BUTTON = 'Voir les candidatures'
export const SECOND_NUDGE_THINKING = 'Je réfléchis encore'
export const SECOND_NUDGE_DECLINE = 'Décliner'

export function secondNudgeSubject(input: Pick<SecondNudgeInput, 'count' | 'sitterFirstName'>): string {
  return input.count > 1
    ? `${input.count} gardiens attendent votre réponse`
    : `${input.sitterFirstName?.trim() || 'Un gardien'} attend toujours votre réponse`
}

export function secondNudgeCopy(input: SecondNudgeInput) {
  const title = input.sitTitle?.trim() ? `« ${input.sitTitle.trim()} »` : 'votre annonce'
  const age = days(Math.max(1, Math.floor(input.oldestDays)))
  return {
    subject: secondNudgeSubject(input),
    preview: SECOND_NUDGE_PREVIEW,
    hello: hello(input.ownerFirstName),
    intro: input.count > 1
      ? `${input.count} gardiens ont proposé de garder votre maison pour ${title}. La première candidature date de ${age}.`
      : `${input.sitterFirstName?.trim() || 'Un gardien'} a proposé de garder votre maison pour ${title} il y a ${age}.`,
    answer: 'Un mot suffit pour répondre : vous engagez la discussion, vous indiquez que vous réfléchissez encore, ou vous déclinez. '
      + 'Vous choisissez votre gardien vous-même, à votre rythme.',
    update: 'Votre garde est déjà organisée, ou votre projet a changé ? Mettez votre annonce à jour depuis votre espace, les gardiens en sont informés.',
    notice: `À partir du ${frenchDate(input.noticeDay, false)}, les gardiens qui attendent reçoivent un message leur indiquant que votre réponse se fait attendre, `
      + `et la mention « ${REL1_MENTION} » s'affiche sur leur candidature.`,
    button: SECOND_NUDGE_BUTTON,
    thinking: SECOND_NUDGE_THINKING,
    decline: SECOND_NUDGE_DECLINE,
  }
}

// ── Message au candidat, à 10 jours (notification et email court) ────────

export interface OwnerSilentInput {
  sitterFirstName?: string | null
  sitTitle?: string | null
  sitCity?: string | null
  days: number
  /** Formulation 0, 1 ou 2, stable pour une candidature (ownerSilentVariant). */
  variant: number
}

export const OWNER_SILENT_SUBJECT = 'Votre candidature est toujours en attente'
export const OWNER_SILENT_PREVIEW = 'La réponse du propriétaire se fait attendre.'
export const OWNER_SILENT_BUTTON = 'Voir les gardes à proximité'
export const OWNER_SILENT_LINK = '/search'

/** Une candidature reçoit toujours la même formulation. */
export function ownerSilentVariant(applicationId: string): 0 | 1 | 2 {
  let sum = 0
  for (const ch of applicationId.replace(/[^0-9a-f]/gi, '')) sum += parseInt(ch, 16)
  return (sum % 3) as 0 | 1 | 2
}

export function ownerSilentCopy(input: OwnerSilentInput) {
  const title = input.sitTitle?.trim() ? `« ${input.sitTitle.trim()} »` : 'cette garde'
  const where = input.sitCity?.trim() ? ` à ${input.sitCity.trim()}` : ''
  const age = days(Math.max(1, Math.floor(input.days)))
  const bodies: Array<[string, string]> = [
    [
      `Vous avez candidaté pour ${title}${where} il y a ${age}. La réponse du propriétaire se fait attendre.`,
      "Votre candidature reste ouverte, et le propriétaire peut y répondre à tout moment. Vous restez libre de candidater à d'autres gardes à proximité.",
    ],
    [
      `Un point sur votre candidature pour ${title}${where}, envoyée il y a ${age} : la réponse du propriétaire est encore attendue.`,
      "Votre candidature reste ouverte, il peut vous répondre à tout moment. D'ici là, d'autres gardes sont ouvertes à proximité.",
    ],
    [
      `Votre candidature pour ${title}${where} date de ${age}, et le propriétaire prend encore son temps pour répondre.`,
      "Elle reste ouverte et il peut y répondre à tout moment. Vous gardez toute liberté de candidater à d'autres gardes en parallèle.",
    ],
  ]
  const [first, second] = bodies[((input.variant % 3) + 3) % 3]
  return {
    subject: OWNER_SILENT_SUBJECT,
    preview: OWNER_SILENT_PREVIEW,
    hello: hello(input.sitterFirstName),
    first,
    second,
    button: OWNER_SILENT_BUTTON,
  }
}

export function ownerSilentNotification(sitTitle?: string | null) {
  const title = sitTitle?.trim()
  return {
    type: 'application_owner_silent',
    title: OWNER_SILENT_SUBJECT,
    body: title
      ? `La réponse du propriétaire de « ${title} » se fait attendre. Votre candidature reste ouverte.`
      : 'La réponse du propriétaire se fait attendre. Votre candidature reste ouverte.',
    link: OWNER_SILENT_LINK,
  }
}

/** Date annoncée au propriétaire dans l'email 2 : trois jours après l'envoi, à Paris. */
export const noticeDayFor = (now: number) => parisDay(now, 3)
