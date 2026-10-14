// Règles pures de la séquence propriétaire unique (lot W0, 14/10/2026).
//
// Un propriétaire jamais publié reçoit une seule séquence, onboarding-owner :
// J+1 onboarding-j1, J+3 owner-no-sit-j3, J+10 owner-no-sit-j10,
// J+21 owner-no-sit-j21, sortie à la publication. Module sans dépendance,
// importé par evaluate-journeys, send-sit-draft-reminder, send-onboarding-j1
// et par les tests Vitest.

// ── Gabarits ────────────────────────────────────────────────────────────────

/** Relances « publier » automatiques, suspendues par une réponse de départ lointaine. */
export const PUBLISH_ASK_TEMPLATES: ReadonlySet<string> = new Set([
  'owner-no-sit-j3',
  'owner-no-sit-j10',
  'owner-no-sit-j21',
  'sit-draft-reminder',
])

/**
 * Gabarits envoyés une seule fois par personne, quelle que soit la voie
 * (parcours, cron, bouton admin) : un envoi passé, même par une autre clé
 * d'idempotence, fait sauter l'étape.
 */
export const ONCE_PER_PERSON_TEMPLATES: ReadonlySet<string> = new Set([
  'onboarding-j1',
  'owner-no-sit-j3',
  'owner-no-sit-j10',
  'owner-no-sit-j21',
])

/** Statuts du journal qui valent « déjà envoyé » pour ces gabarits. */
export const ALREADY_SENT_STATUSES: readonly string[] = ['sent', 'pending', 'deferred']

/**
 * Gabarits rédigés pour un gardien : jamais envoyés à un compte au rôle
 * owner qui n'a jamais publié (lot W0, point 5).
 */
export const SITTER_VOICE_TEMPLATES: ReadonlySet<string> = new Set([
  'reactivation-d30',
  'relance-profil-incomplet',
])

/** Séquences qui n'enrôlent jamais un rôle owner jamais publié. */
export const SEQUENCES_EXCLUDING_NEVER_PUBLISHED_OWNER: ReadonlySet<string> = new Set([
  'reactivation-d30',
])

export function isNeverPublishedOwnerOnly(role: string | null | undefined, hasPublished: boolean): boolean {
  return (role ?? '').trim().toLowerCase() === 'owner' && !hasPublished
}

/** Vrai si ce gabarit ne doit pas partir vers ce destinataire (texte de gardien). */
export function sitterVoiceBlocked(template: string, role: string | null | undefined, hasPublished: boolean): boolean {
  return SITTER_VOICE_TEMPLATES.has(template) && isNeverPublishedOwnerOnly(role, hasPublished)
}

// ── Question de départ ──────────────────────────────────────────────────────

/** Une réponse de départ attend 30 jours avant de laisser repartir les relances. */
export const DEPARTURE_HOLD_DAYS = 30
/** Périodes lointaines : la relance « publier » attend. Noël et hiver ne bloquent rien. */
export const DEPARTURE_HOLD_PERIODS: ReadonlySet<string> = new Set(['printemps', 'ete', 'plus_tard'])

export interface DepartureAnswer {
  period: string | null
  answered_at: string | null
  source?: string | null
}

/**
 * Dernière réponse retenue : la plus récente hors scanner_suspect.
 * La lecture côté base filtre déjà la source, la règle reste vraie seule.
 */
export function lastHumanAnswer(rows: DepartureAnswer[]): DepartureAnswer | null {
  const human = rows
    .filter((r) => (r.source ?? '') !== 'scanner_suspect' && !!r.answered_at && !!r.period)
    .sort((a, b) => new Date(b.answered_at!).getTime() - new Date(a.answered_at!).getTime())
  return human[0] ?? null
}

/** Vrai si la dernière réponse (moins de 30 jours, période lointaine) suspend les relances « publier ». */
export function departureHoldsPublishAsk(last: DepartureAnswer | null, now: Date = new Date()): boolean {
  if (!last || !last.period || !last.answered_at) return false
  if (!DEPARTURE_HOLD_PERIODS.has(last.period)) return false
  const age = now.getTime() - new Date(last.answered_at).getTime()
  return Number.isFinite(age) && age >= 0 && age < DEPARTURE_HOLD_DAYS * 86400_000
}

// deno-lint-ignore no-explicit-any
type Client = any

/** Lecture de la dernière réponse humaine. Lève une erreur si la lecture échoue. */
export async function loadLastDepartureAnswer(client: Client, userId: string): Promise<DepartureAnswer | null> {
  const { data, error } = await client.from('owner_departure_intents')
    .select('period, answered_at, source')
    .eq('user_id', userId)
    .neq('source', 'scanner_suspect')
    .order('answered_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(`owner_departure_intents lookup failed: ${error.message}`)
  return lastHumanAnswer((data ?? []) as DepartureAnswer[])
}

// ── Étapes : sortie, saut, attente ──────────────────────────────────────────

export type StepVerdict =
  | { kind: 'exit'; reason: string }
  | { kind: 'skip'; reason: string }
  | { kind: 'hold'; reason: string }
  | { kind: 'send' }

export interface StepFacts {
  template: string
  /** Condition de sortie du parcours remplie (publication, etc.). */
  exitMet: boolean
  /** Condition de saut de l'étape seule remplie (ex. profil à 60 % pour onboarding-j1). */
  skipMet: boolean
  /** Ce gabarit est déjà parti vers cette personne par une autre voie. */
  alreadySent: boolean
  /** Rôle et publication, pour les textes de gardien. */
  role: string | null
  hasPublished: boolean
  /** Réponse de départ qui suspend les relances « publier ». */
  departureHold: boolean
}

/**
 * Ordre de décision d'une étape due : la sortie l'emporte, puis un texte de
 * gardien vers un propriétaire jamais publié sort le parcours, puis le saut
 * (déjà envoyé ou condition de saut), puis l'attente de départ, sinon envoi.
 */
export function decideStep(f: StepFacts): StepVerdict {
  if (f.exitMet) return { kind: 'exit', reason: 'exit_condition_met' }
  if (sitterVoiceBlocked(f.template, f.role, f.hasPublished)) return { kind: 'exit', reason: 'owner_never_published' }
  if (f.alreadySent && ONCE_PER_PERSON_TEMPLATES.has(f.template)) return { kind: 'skip', reason: 'already_sent_other_path' }
  if (f.skipMet) return { kind: 'skip', reason: 'skip_condition_met' }
  if (f.departureHold && PUBLISH_ASK_TEMPLATES.has(f.template)) return { kind: 'hold', reason: 'departure_hold' }
  return { kind: 'send' }
}

// ── Gabarit J+3 ─────────────────────────────────────────────────────────────

const COUNT_WORDS = ['', 'un', 'deux', 'trois']

/** Préentête du J+3 selon le nombre de cartes affichées. */
export function j3Preheader(cardCount: number): string {
  const n = Math.max(0, Math.min(3, Math.floor(cardCount || 0)))
  if (n === 0) return 'Votre première annonce se publie en quelques minutes.'
  if (n === 1) return 'En voici un, à proximité de chez vous.'
  return `En voici ${COUNT_WORDS[n]}, à proximité de chez vous.`
}

/** Phrase d'introduction des cartes, accordée au nombre de cartes. */
export function j3CardsIntro(cardCount: number): string | null {
  const n = Math.max(0, Math.min(3, Math.floor(cardCount || 0)))
  if (n === 0) return null
  if (n === 1) return 'En voici un\u00a0:'
  return `En voici ${COUNT_WORDS[n]}\u00a0:`
}

/** Lien de reprise d'un brouillon. */
export function draftResumeUrl(draftId: string, medium = 'j3'): string {
  return `https://guardiens.fr/sits/create?resume=${encodeURIComponent(draftId)}&utm_source=email&utm_campaign=owner_no_sit&utm_medium=${medium}`
}
