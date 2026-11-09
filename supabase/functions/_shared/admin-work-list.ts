// Lot ADM13 (09/11/2026, plan de l'arène admin, lot 2 « Une fonction, une
// liste ») : la liste de travail des fondateurs, mise en forme une seule fois.
// La base livre toutes les sources en une lecture (public.admin_work_list,
// drizzle/migrations/0124_adm13_une_liste.sql) ; ce module pur en fait une
// ligne par type d'élément à traiter (« Diffuser 3 annonces… ») : famille,
// phrase qui commence par un verbe, lien vers la file, date d'attente, et les
// éléments nommés (annonces, membres) que l'email cite sous la ligne. La vue d'ensemble (src/pages/admin/_components/dashboard/
// PilotageBlocks.tsx) et l'email du matin (alert-admin-signals) lisent ce même
// module : la liste à l'écran et les lignes de l'email ont la même longueur.
// Reprend le rangement par nature du lot ADM10 (anciennement
// src/lib/admin/pilotage.ts, qui le réexporte).
import {
  SIGNAL_TYPES,
  daysUntilStart,
  hasDestination,
  isSitImminent,
  isSitStarted,
  signalNature,
  SIT_TIMED_TYPES,
  type SignalNature,
} from './admin-signal-config.ts'

// ── Sources ──────────────────────────────────────────────────────────────────

export interface PilotageSignal {
  id: string
  signal_type: string
  severity: string
  entity_type: string | null
  entity_id: string | null
  detected_at: string
  metadata: Record<string, unknown> | null
}

export interface PilotageSit { id: string; start_date: string | null; title?: string | null; city?: string | null }

export interface HumanQueue { key: string; count: number; oldest: string | null }

export interface HealthCheck { key: string; label: string; state: string; detail?: string | null; link?: string | null }

export type WorkSource = 'signals' | 'sits' | 'queues' | 'relances' | 'health'

/** Ce que renvoie public.admin_work_list(). */
export interface WorkListRaw {
  generated_at?: string
  sources?: Partial<Record<WorkSource, boolean>>
  /** Message d'erreur de chaque source en échec (SQLERRM, 200 caractères). */
  errors?: Partial<Record<WorkSource, string>>
  signals?: PilotageSignal[] | null
  sits?: PilotageSit[] | null
  queues?: HumanQueue[] | null
  relances_failed_7d?: number | null
  health?: HealthCheck[] | null
}

export const WORK_SOURCES: WorkSource[] = ['signals', 'sits', 'queues', 'relances', 'health']

export const WORK_SOURCE_LABELS: Record<WorkSource, string> = {
  signals: 'signaux',
  sits: 'annonces des signaux',
  queues: 'files des membres',
  relances: 'relances automatiques',
  health: 'état du site',
}

// ── Lignes ───────────────────────────────────────────────────────────────────

export type DeadlineTone = 'urgent' | 'late' | 'normal'

/** Une ligne de la vue d'ensemble (lot ADM10), aussi une ligne de la liste. */
export interface PilotageLine {
  key: string
  type: string
  title: string
  detail: string
  deadline: string
  tone: DeadlineTone
  /** Libellé du bouton qui ouvre les cartes d'action. */
  action: string
  signals: PilotageSignal[]
}

export interface PilotageModel {
  urgent: PilotageLine[]
  vous: PilotageLine[]
  technique: PilotageSignal[]
  /** Situations suivies par les relances, par type, hors départ imminent. */
  auto: { type: string; count: number }[]
  autoTotal: number
  /** Synthèse du lundi, par type. */
  hebdo: { type: string; count: number }[]
}

export type WorkFamily = 'site' | 'depart' | 'membres' | 'vous' | 'relances'

export const WORK_FAMILY_ORDER: WorkFamily[] = ['site', 'depart', 'membres', 'vous', 'relances']

export const WORK_FAMILY_LABELS: Record<WorkFamily, string> = {
  site: 'Le site demande un geste',
  depart: 'Départ sous 7 jours, la relance automatique ne suffit plus',
  membres: 'Des membres attendent une réponse',
  vous: 'Seul vous pouvez trancher',
  relances: 'Relances automatiques en échec',
}

/** Un élément nommé d'une ligne (annonce, membre, message), pour l'email. */
export interface WorkElement { label: string; link: string }

export interface WorkItem extends PilotageLine {
  family: WorkFamily
  /** Chemin admin (/admin…) qui ouvre la file de la ligne. */
  link: string
  /** Plus ancienne attente connue (ISO) ; null quand la source n'a pas de date. */
  waitingSince: string | null
  /** Départ de garde le plus proche (AAAA-MM-JJ) pour une ligne d'annonce. */
  startDate: string | null
  count: number
  elements: WorkElement[]
}

export interface WorkListModel extends PilotageModel {
  items: WorkItem[]
  /** Sources en échec : la liste est incomplète et le dit. */
  unavailable: WorkSource[]
  sits: Map<string, PilotageSit>
  generatedAt: string | null
}

// ── Textes ───────────────────────────────────────────────────────────────────

const n = (k: number, one: string, many: string) => (k > 1 ? many : one)

/** Verbes autorisés en tête d'une ligne : la ligne dit quoi faire. */
export const WORK_VERBS = [
  'Aider', 'Contrôler', 'Corriger', 'Diffuser', 'Écrire', 'Examiner', 'Lire', 'Regarder',
  'Relancer', 'Relayer', 'Répondre', 'Reproduire', 'Trancher', 'Traiter', 'Valider', 'Vérifier',
] as const

interface WorkCopy {
  /** Phrase de la ligne pour k éléments, verbe en tête. */
  title: (k: number) => string
  /** Libellé court du bouton. */
  action: string
  /** File admin qui montre ces éléments. */
  link: string
}

const L = {
  listings: '/admin/listings',
  toStaff: '/admin/listings?filter=to_staff',
  preparing: '/admin/listings?filter=preparing',
  published: '/admin/listings?filter=published',
  users: '/admin/users',
  verifications: '/admin/verifications',
  missions: '/admin/small-missions',
  alma: '/admin/alma',
  contact: '/admin/contact-messages',
  messages: '/admin/messages',
  emails: '/admin/emails',
  nurturing: '/admin/nurturing',
  articles: '/admin/articles',
  prerender: '/admin/prerender',
}

/**
 * Phrase, bouton et lien de chaque type de signal qui peut entrer dans la
 * liste (toute nature sauf la synthèse du lundi). Un type déclaré sans entrée
 * ici est refusé par src/__tests__/adm13/.
 */
export const WORK_COPY: Record<string, WorkCopy> = {
  // Relancés seuls, remontent à 7 jours du départ (titres de la ligne « départ » plus bas).
  pending_application: { title: (k) => `Relancer ${n(k, 'le propriétaire qui n\'a pas répondu à ses candidats', `les ${k} propriétaires qui n'ont pas répondu à leurs candidats`)}`, action: 'Relancer', link: L.published },
  stalled_discussion: { title: (k) => `Relancer ${n(k, 'la discussion à l\'arrêt', `les ${k} discussions à l'arrêt`)}`, action: 'Relancer', link: L.published },
  owner_sit_unconfirmed: { title: (k) => `Aider ${n(k, 'le propriétaire', `les ${k} propriétaires`)} à confirmer ${n(k, 'son gardien', 'leur gardien')}`, action: 'Aider', link: L.published },
  stale_draft: { title: (k) => `Écrire ${n(k, 'au propriétaire dont le brouillon attend', `aux ${k} propriétaires dont le brouillon attend`)}`, action: 'Écrire', link: L.preparing },
  // Seul un fondateur peut agir.
  no_applications: { title: (k) => `Diffuser ${k} ${n(k, 'annonce sans candidature', 'annonces sans candidature')} après 48 heures`, action: 'Diffuser', link: L.toStaff },
  owner_missing_coordinates: { title: (k) => `Corriger le lieu de ${k} ${n(k, 'propriétaire', 'propriétaires')} à situer sur la carte`, action: 'Corriger', link: L.users },
  repeated_republish: { title: (k) => `Examiner ${k} ${n(k, 'annonce republiée', 'annonces republiées')} à répétition`, action: 'Examiner', link: L.listings },
  repeated_cancellations: { title: (k) => `Examiner ${k} ${n(k, 'membre qui annule', 'membres qui annulent')} à répétition`, action: 'Examiner', link: L.listings },
  dormant_top_sitter: { title: (k) => `Écrire ${n(k, 'au meilleur gardien endormi', `aux ${k} meilleurs gardiens endormis`)}`, action: 'Écrire', link: L.users },
  identity_needs_review: { title: (k) => `Contrôler ${k} ${n(k, 'vérification d\'identité', 'vérifications d\'identité')}`, action: 'Contrôler', link: L.verifications },
  identity_orphan_documents: { title: (k) => `Contrôler ${k} ${n(k, 'pièce d\'identité à rattacher à un dossier', 'pièces d\'identité à rattacher à un dossier')}`, action: 'Contrôler', link: L.verifications },
  stale_verification: { title: (k) => `Contrôler ${k} ${n(k, 'vérification d\'identité en retard', 'vérifications d\'identité en retard')}`, action: 'Contrôler', link: L.verifications },
  suspicious_account: { title: (k) => `Examiner ${k} ${n(k, 'compte suspect', 'comptes suspects')}`, action: 'Examiner', link: L.users },
  sit_like_mission: { title: (k) => `Vérifier ${k} ${n(k, 'coup de main qui ressemble à une garde', 'coups de main qui ressemblent à une garde')}`, action: 'Vérifier', link: L.missions },
  mission_no_audience: { title: (k) => `Relayer ${k} ${n(k, 'coup de main', 'coups de main')} : tout le monde à 30 km a été prévenu`, action: 'Relayer', link: L.missions },
  animal_rehoming_listing: { title: (k) => `Vérifier ${k} ${n(k, 'annonce de cession d\'animal', 'annonces de cession d\'animal')}`, action: 'Vérifier', link: L.listings },
  contact_details_in_public_content: { title: (k) => `Vérifier ${k} ${n(k, 'contenu public qui donne des coordonnées', 'contenus publics qui donnent des coordonnées')}`, action: 'Vérifier', link: L.listings },
  undeclared_pricing: { title: (k) => `Vérifier ${k} ${n(k, 'message qui cite un tarif', 'messages qui citent un tarif')}`, action: 'Vérifier', link: L.messages },
  pro_pending_review: { title: (k) => `Valider ${k} ${n(k, 'fiche pro', 'fiches pro')}`, action: 'Valider', link: L.users },
  alma_frustration: { title: (k) => `Écrire ${n(k, 'au membre en difficulté', `aux ${k} membres en difficulté`)} avec Alma`, action: 'Écrire', link: L.alma },
  alma_bug_report: { title: (k) => `Reproduire ${n(k, 'le problème signalé', `les ${k} problèmes signalés`)} à Alma`, action: 'Reproduire', link: L.alma },
  alma_churn: { title: (k) => `Écrire ${n(k, 'au membre qui veut partir', `aux ${k} membres qui veulent partir`)}`, action: 'Écrire', link: L.alma },
  alma_contact_request: { title: (k) => (k > 1 ? `Répondre aux ${k} membres qui vous ont écrit depuis Alma` : 'Répondre au membre qui vous a écrit depuis Alma'), action: 'Répondre', link: L.contact },
  alma_safety: { title: (k) => `Lire ${n(k, 'le sujet de sûreté confié', `les ${k} sujets de sûreté confiés`)} à Alma`, action: 'Lire', link: L.alma },
  // Technique : critiques seulement, et seulement sans voyant de l'état du site qui les porte déjà.
  sit_publish_error: { title: (k) => `Vérifier ${k} ${n(k, 'publication d\'annonce en échec', 'publications d\'annonce en échec')}`, action: 'Vérifier', link: L.listings },
  sit_published_zero_reach: { title: (k) => `Vérifier la diffusion de ${k} ${n(k, 'annonce publiée', 'annonces publiées')} : zéro gardien touché`, action: 'Vérifier', link: L.listings },
  listing_proximity_large_broadcast: { title: (k) => `Vérifier ${k} ${n(k, 'diffusion très large', 'diffusions très larges')}`, action: 'Vérifier', link: L.listings },
  sit_notification_claim_starvation: { title: () => 'Vérifier la diffusion des annonces aux gardiens', action: 'Vérifier', link: L.emails },
  digest_queue_stalled: { title: () => 'Vérifier la file des récapitulatifs gardiens', action: 'Vérifier', link: L.emails },
  digest_queue_morning_backlog: { title: () => 'Vérifier les récapitulatifs gardiens restés en file', action: 'Vérifier', link: L.emails },
  email_delivery_low: { title: () => 'Vérifier la livraison des emails', action: 'Vérifier', link: L.emails },
  email_queue_failures: { title: () => 'Vérifier la file d\'envoi des emails', action: 'Vérifier', link: L.emails },
  email_recipient_address_invalid: { title: (k) => `Corriger ${k} ${n(k, 'adresse email refusée', 'adresses email refusées')}`, action: 'Corriger', link: L.emails },
  email_abandon_high: { title: () => 'Vérifier les emails abandonnés', action: 'Vérifier', link: L.emails },
  email_destroyed: { title: () => 'Vérifier les emails détruits avant envoi', action: 'Vérifier', link: L.emails },
  notification_delivery_failed: { title: (k) => `Vérifier ${k} ${n(k, 'notification en échec d\'envoi', 'notifications en échec d\'envoi')}`, action: 'Vérifier', link: L.emails },
  nurturing_run_anomaly: { title: () => 'Vérifier le dernier passage des séquences email', action: 'Vérifier', link: L.nurturing },
  content_detector_broken: { title: () => 'Vérifier le détecteur de contenus : il est en panne', action: 'Vérifier', link: L.articles },
  content_defect_outside_freeze: { title: (k) => `Corriger ${k} ${n(k, 'contenu signalé', 'contenus signalés')}`, action: 'Corriger', link: L.articles },
  content_freeze_expired: { title: () => 'Relancer la revue éditoriale : le gel est expiré', action: 'Relancer', link: L.articles },
  content_quality_drift: { title: () => 'Regarder la dérive de qualité éditoriale', action: 'Regarder', link: L.articles },
  prerender_monthly_budget_reached: { title: () => 'Vérifier le rendu SEO du mois', action: 'Vérifier', link: L.prerender },
}

export const isVerbFirst = (title: string): boolean =>
  WORK_VERBS.some((v) => title === v || title.startsWith(`${v} `))

const fallbackCopy = (type: string): WorkCopy => ({
  title: (k) => `Traiter ${k} ${n(k, 'signal', 'signaux')} « ${SIGNAL_TYPES[type]?.label ?? 'type inconnu'} »`,
  action: 'Traiter',
  link: '/admin',
})

export const workCopy = (type: string): WorkCopy => WORK_COPY[type] ?? fallbackCopy(type)

/** Voyants de l'état du site : la phrase de la ligne quand le voyant est rouge. */
export const HEALTH_TITLES: Record<string, string> = {
  tasks: 'Vérifier les tâches planifiées',
  emails: 'Vérifier l\'envoi des emails',
  ai: 'Relancer l\'analyse IA quotidienne',
  seo: 'Vérifier le rendu SEO',
  errors: 'Lire les nouvelles erreurs du site',
  audience: 'Vérifier la mesure d\'audience',
}

/** Signaux techniques déjà portés par un voyant rouge : jamais deux lignes pour une cause. */
export const HEALTH_COVERED_TYPES = new Set([
  'email_delivery_low', 'email_queue_failures', 'digest_queue_stalled', 'digest_queue_morning_backlog',
  'email_recipient_address_invalid', 'prerender_monthly_budget_reached',
])

/** Files où un membre attend une réponse (public.admin_human_queues). */
export const QUEUE_COPY: Record<string, { title: (k: number) => string; link: string }> = {
  contactMessages: { title: (k) => `Répondre à ${k} ${n(k, 'message de contact', 'messages de contact')}`, link: '/admin/contact-messages' },
  reports: { title: (k) => `Traiter ${k} ${n(k, 'signalement', 'signalements')}`, link: '/admin/reports' },
  deletionRequests: { title: (k) => `Traiter ${k} ${n(k, 'demande RGPD', 'demandes RGPD')} (délai légal d'un mois)`, link: '/admin/demandes-suppression' },
  reviewDisputes: { title: (k) => `Trancher ${k} ${n(k, 'contestation d\'avis', 'contestations d\'avis')}`, link: '/admin/review-disputes' },
  verifications: { title: (k) => `Contrôler ${k} ${n(k, 'pièce d\'identité', 'pièces d\'identité')}`, link: '/admin/verifications' },
}

/**
 * Types dont la file humaine porte déjà les éléments : comptés une seule fois,
 * dans la ligne de la file, qui reprend leurs éléments (message cité, membre).
 * identity_orphan_documents reste à part : la file des vérifications ne compte
 * pas une pièce déposée sans dossier ouvert (statut refusé ou sans URL).
 */
export const QUEUE_COVERED_BY: Record<string, string> = {
  identity_needs_review: 'verifications',
  stale_verification: 'verifications',
  alma_contact_request: 'contactMessages',
}
export const QUEUE_COVERED_TYPES = new Set(Object.keys(QUEUE_COVERED_BY))

// ── Rangement par nature (lot ADM10) ─────────────────────────────────────────

export const sitIdOf = (s: PilotageSignal): string | null => {
  const m = s.metadata ?? {}
  if (typeof m.sit_id === 'string') return m.sit_id
  if (s.entity_type === 'sit' && s.entity_id) return s.entity_id
  return null
}

/** « aujourd'hui », « demain », « dans 3 jours ». */
export function departureLabel(days: number): string {
  if (days <= 0) return 'aujourd\'hui'
  if (days === 1) return 'demain'
  return `dans ${days} jours`
}

const shortDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' })
}

/** Titre et précision d'une ligne « départ sous 7 jours ». */
function urgentCopy(type: string, sits: number, days: number): { title: string; detail: string; action: string } {
  const dep = departureLabel(days)
  switch (type) {
    case 'stale_draft':
      return {
        title: `Écrire ${n(sits, 'au propriétaire dont le brouillon part', `aux ${sits} propriétaires dont le brouillon part`)} ${dep}`,
        detail: 'Annonce jamais publiée, le rappel automatique est parti sans effet.',
        action: 'Écrire',
      }
    case 'pending_application':
      return { title: workCopy(type).title(sits), detail: `Départ ${dep}, la relance automatique est déjà partie.`, action: 'Relancer' }
    case 'owner_sit_unconfirmed':
      return { title: workCopy(type).title(sits), detail: `Départ ${dep}, la garde reste à confirmer.`, action: 'Aider' }
    case 'stalled_discussion':
      return { title: workCopy(type).title(sits), detail: `Départ ${dep}, le rappel automatique est déjà parti.`, action: 'Relancer' }
    case 'no_applications':
      return {
        title: `Diffuser ${n(sits, 'l\'annonce restée sans candidature', `les ${sits} annonces restées sans candidature`)}`,
        detail: `Départ ${dep}, gardiens à proximité à solliciter.`,
        action: 'Diffuser',
      }
    default: {
      const c = workCopy(type)
      return { title: c.title(sits), detail: `Départ ${dep}.`, action: c.action }
    }
  }
}

const DAY = 86_400_000

/** Ordre des natures pour les tests et l'email : une seule source. */
export const natureOf = (type: string): SignalNature => signalNature(type)

export function buildPilotage(
  signals: PilotageSignal[],
  sits: Map<string, PilotageSit>,
  now: number = Date.now(),
): PilotageModel {
  const startOf = (s: PilotageSignal): string | null => {
    const id = sitIdOf(s)
    const fromSit = id ? sits.get(id)?.start_date ?? null : null
    const fromMeta = typeof s.metadata?.start_date === 'string' ? (s.metadata.start_date as string) : null
    return fromSit ?? fromMeta
  }

  const urgentByType = new Map<string, PilotageSignal[]>()
  const vousByType = new Map<string, PilotageSignal[]>()
  const autoByType = new Map<string, number>()
  const hebdoByType = new Map<string, number>()
  const technique: PilotageSignal[] = []

  for (const s of signals) {
    // Lot ADM12 : une annonce sans candidature reste dans la liste même sans
    // gardien dans le rayon (sévérité « info ») ; c'est elle qui a le plus
    // besoin d'une diffusion large (Vabres-l'Abbaye, 09/11/2026).
    if (s.severity === 'info' && s.signal_type !== 'no_applications') continue
    const nature = signalNature(s.signal_type)
    const start = startOf(s)
    // Garde commencée : plus aucune action avant le départ (règle ADM1).
    if (sitIdOf(s) && SIT_TIMED_TYPES.has(s.signal_type) && isSitStarted(start, now)) continue
    const imminent = (nature === 'auto' || nature === 'vous') && !!sitIdOf(s) && isSitImminent(start, now)
    if (imminent) {
      const arr = urgentByType.get(s.signal_type) ?? []
      arr.push(s)
      urgentByType.set(s.signal_type, arr)
    } else if (nature === 'vous') {
      const arr = vousByType.get(s.signal_type) ?? []
      arr.push(s)
      vousByType.set(s.signal_type, arr)
    } else if (nature === 'auto') {
      autoByType.set(s.signal_type, (autoByType.get(s.signal_type) ?? 0) + 1)
    } else if (nature === 'technique') {
      technique.push(s)
    } else {
      hebdoByType.set(s.signal_type, (hebdoByType.get(s.signal_type) ?? 0) + 1)
    }
  }

  const urgent: PilotageLine[] = [...urgentByType].map(([type, arr]) => {
    const sitIds = [...new Set(arr.map(sitIdOf).filter((x): x is string => !!x))]
    const days = Math.min(...arr.map((s) => daysUntilStart(startOf(s), now) ?? 7))
    const copy = urgentCopy(type, sitIds.length, days)
    return {
      key: `urgent:${type}`,
      type,
      title: copy.title,
      detail: copy.detail,
      deadline: days <= 3 ? 'Avant ce soir' : 'Aujourd\'hui',
      tone: 'urgent' as const,
      action: copy.action,
      signals: arr,
    }
  }).sort((a, b) => minDays(a, startOf, now) - minDays(b, startOf, now))

  const vous: PilotageLine[] = [...vousByType].map(([type, arr]) => {
    const oldest = oldestOfSignals(arr)
    const ageDays = Math.max(0, Math.floor((now - new Date(oldest).getTime()) / DAY))
    const critical = arr.some((s) => s.severity === 'critical')
    const copy = workCopy(type)
    const late = ageDays > 3 && (critical || type.startsWith('alma_'))
    return {
      key: `vous:${type}`,
      type,
      title: copy.title(arr.length),
      detail: arr.length > 1 ? `Le plus ancien attend depuis le ${shortDate(oldest)}.` : `Depuis le ${shortDate(oldest)}.`,
      deadline: late ? `En retard de ${ageDays} jours` : critical ? 'Aujourd\'hui' : 'Cette semaine',
      tone: (late ? 'late' : 'normal') as DeadlineTone,
      action: copy.action,
      signals: arr,
    }
  }).sort((a, b) => toneRank(a.tone) - toneRank(b.tone) || oldestOfSignals(a.signals).localeCompare(oldestOfSignals(b.signals)))

  const auto = [...autoByType].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
  const hebdo = [...hebdoByType].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
  return { urgent, vous, technique, auto, autoTotal: auto.reduce((t, x) => t + x.count, 0), hebdo }
}

function minDays(l: PilotageLine, startOf: (s: PilotageSignal) => string | null, now: number) {
  return Math.min(...l.signals.map((s) => daysUntilStart(startOf(s), now) ?? 7))
}
const toneRank = (t: DeadlineTone) => (t === 'urgent' ? 0 : t === 'late' ? 1 : 2)
const oldestOfSignals = (arr: PilotageSignal[]) => arr.reduce((m, s) => (s.detected_at < m ? s.detected_at : m), arr[0].detected_at)

// ── Liste de travail ─────────────────────────────────────────────────────────

const clean = (s: string) => s.replace(/[\u2014\u2013]/g, ',').replace(/\s+/g, ' ').trim()
const firstText = (...v: unknown[]) => v.map((x) => (typeof x === 'string' ? x.trim() : '')).find((x) => x) ?? ''

/** Nom d'un élément (annonce, extrait, membre) pour l'email ; lien de la file. */
function elementOf(s: PilotageSignal, sits: Map<string, PilotageSit>, link: string): WorkElement {
  const m = s.metadata ?? {}
  const sitId = sitIdOf(s)
  const sit = sitId ? sits.get(sitId) : undefined
  const head = sitId
    ? [firstText(sit?.title, m.sit_title, m.title) || 'Annonce sans titre', firstText(sit?.city, m.city)].filter(Boolean).join(', ')
    : firstText(m.title, m.sit_title, m.first_name, m.city, m.excerpt, Array.isArray(m.messages) ? (m.messages as { text?: string }[])[0]?.text : '')
  // Lot J1 : un signal d'Alma cite le message du membre dans l'email.
  const quote = s.signal_type.startsWith('alma_') && Array.isArray(m.messages)
    ? firstText(...(m.messages as { text?: string }[]).map((x) => x?.text))
    : ''
  const base = clean(head || SIGNAL_TYPES[s.signal_type]?.label || 'Élément')
  const label = (quote && !base.includes(quote.slice(0, 40)) ? `${base} : « ${clean(quote).slice(0, 160)} »` : base).slice(0, 240)
  const own = typeof m.admin_url === 'string' && m.admin_url.startsWith('https://guardiens.fr/admin')
    ? m.admin_url.replace('https://guardiens.fr', '')
    : link
  return { label, link: own }
}

/** Éléments distincts d'une ligne (deux candidatures d'une annonce = une annonce). */
function elementsOf(arr: PilotageSignal[], sits: Map<string, PilotageSit>, link: string): WorkElement[] {
  const seen = new Set<string>()
  const out: WorkElement[] = []
  for (const s of arr) {
    const e = elementOf(s, sits, link)
    const k = `${e.label}|${e.link}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(e)
  }
  return out
}

const minDate = (arr: (string | null | undefined)[]) =>
  arr.filter((x): x is string => typeof x === 'string' && x.length > 0).sort()[0] ?? null

/**
 * Liste de travail : une ligne par type d'élément à traiter, dans l'ordre des
 * familles (WORK_FAMILY_ORDER). Même résultat pour la vue d'ensemble et
 * pour l'email du matin.
 */
export function buildWorkList(raw: WorkListRaw | null | undefined, now: number = Date.now()): WorkListModel {
  const sources = raw?.sources ?? {}
  const unavailable = WORK_SOURCES.filter((k) => sources[k] === false)
  const signals = Array.isArray(raw?.signals) ? raw!.signals! : []
  const sits = new Map<string, PilotageSit>((Array.isArray(raw?.sits) ? raw!.sits! : []).map((s) => [s.id, s]))
  const queuesOk = sources.queues !== false
  // Une couverture ne vaut que si sa source est lue : sinon la ligne du signal reste.
  const healthOk = sources.health !== false
  const queues = Array.isArray(raw?.queues) ? raw!.queues! : []

  // Une file humaine qui porte déjà ces éléments les compte une seule fois.
  const pilotageSignals = queuesOk ? signals.filter((s) => !QUEUE_COVERED_TYPES.has(s.signal_type)) : signals
  const pilotage = buildPilotage(pilotageSignals, sits, now)
  const items: WorkItem[] = []

  // 1. Le site : voyants rouges, puis pannes critiques qu'aucun voyant ne porte.
  for (const c of Array.isArray(raw?.health) ? raw!.health! : []) {
    if (!c || typeof c.key !== 'string' || c.state !== 'alert') continue
    const link = typeof c.link === 'string' && c.link.startsWith('/admin') ? c.link : '/admin'
    items.push({
      key: `site:${c.key}`, family: 'site', type: `health:${c.key}`,
      title: HEALTH_TITLES[c.key] ?? `Vérifier : ${c.label}`,
      detail: clean(typeof c.detail === 'string' && c.detail ? c.detail : c.label),
      deadline: 'Aujourd\'hui', tone: 'urgent', action: 'Voir', signals: [],
      link, waitingSince: null, startDate: null, count: 1, elements: [],
    })
  }
  const techByType = new Map<string, PilotageSignal[]>()
  for (const s of pilotage.technique) {
    if (s.severity !== 'critical' || (healthOk && HEALTH_COVERED_TYPES.has(s.signal_type)) || !hasDestination(s.signal_type, 'daily_email')) continue
    techByType.set(s.signal_type, [...(techByType.get(s.signal_type) ?? []), s])
  }
  for (const [type, arr] of techByType) {
    const c = workCopy(type)
    const oldest = oldestOfSignals(arr)
    items.push({
      key: `site:${type}`, family: 'site', type,
      title: c.title(arr.length), detail: `Signal ouvert depuis le ${shortDate(oldest)}.`,
      deadline: 'Aujourd\'hui', tone: 'urgent', action: c.action, signals: arr,
      link: c.link, waitingSince: oldest, startDate: null, count: arr.length,
      elements: elementsOf(arr, sits, c.link),
    })
  }

  // 2. Départ sous 7 jours.
  for (const l of pilotage.urgent) {
    const c = workCopy(l.type)
    items.push({
      ...l, family: 'depart', link: c.link,
      waitingSince: oldestOfSignals(l.signals),
      startDate: minDate(l.signals.map((s) => {
        const id = sitIdOf(s)
        return (id ? sits.get(id)?.start_date : null) ?? (s.metadata?.start_date as string | undefined) ?? null
      })),
      count: l.signals.length,
      elements: elementsOf(l.signals, sits, c.link),
    })
  }

  // 3. Des membres attendent une réponse.
  for (const q of queues) {
    const def = QUEUE_COPY[q?.key]
    const count = Number(q?.count ?? 0)
    if (!def || !Number.isFinite(count) || count <= 0) continue
    const covered = signals.filter((x) => QUEUE_COVERED_BY[x.signal_type] === q.key)
    items.push({
      key: `membres:${q.key}`, family: 'membres', type: `queue:${q.key}`,
      title: def.title(count),
      detail: q.oldest ? `Le plus ancien attend depuis le ${shortDate(q.oldest)}.` : 'Un membre attend votre réponse.',
      deadline: 'Aujourd\'hui', tone: 'normal', action: 'Répondre', signals: [],
      link: def.link, waitingSince: q.oldest ?? null, startDate: null, count, elements: elementsOf(covered, sits, def.link),
    })
  }

  // 4. Seul vous pouvez trancher.
  for (const l of pilotage.vous) {
    const c = workCopy(l.type)
    items.push({
      ...l, family: 'vous', link: c.link,
      waitingSince: oldestOfSignals(l.signals), startDate: null, count: l.signals.length,
      elements: elementsOf(l.signals, sits, c.link),
    })
  }

  // 5. Relances automatiques en échec sur 7 jours.
  const failed = Number(raw?.relances_failed_7d ?? 0)
  if (sources.relances !== false && Number.isFinite(failed) && failed > 0) {
    items.push({
      key: 'relances:failed', family: 'relances', type: 'relances_failed',
      title: `Vérifier ${failed} ${n(failed, 'relance automatique en échec', 'relances automatiques en échec')}`,
      detail: 'Sur 7 jours : le membre n\'a pas reçu son rappel.',
      deadline: 'Cette semaine', tone: 'normal', action: 'Vérifier', signals: [],
      link: '/admin/emails', waitingSince: null, startDate: null, count: failed, elements: [],
    })
  }

  return {
    ...pilotage,
    items: items.sort((a, b) => WORK_FAMILY_ORDER.indexOf(a.family) - WORK_FAMILY_ORDER.indexOf(b.family)),
    unavailable,
    sits,
    generatedAt: typeof raw?.generated_at === 'string' ? raw.generated_at : null,
  }
}

/** « signaux, état du site » : sources en échec, dites en clair. */
export const unavailableSentence = (u: WorkSource[]): string =>
  u.length === 0 ? '' : `Lecture impossible : ${u.map((k) => WORK_SOURCE_LABELS[k]).join(', ')}. La liste est incomplète.`

// ── Libellés courts (vue d'ensemble, synthèse du lundi) ─────────────────────

/** Libellés courts des situations suivies par les relances. */
export const AUTO_LABELS: Record<string, { one: string; many: string }> = {
  pending_application: { one: 'candidature relancée auprès du propriétaire', many: 'candidatures relancées auprès du propriétaire' },
  stale_draft: { one: 'brouillon', many: 'brouillons' },
  stalled_discussion: { one: 'discussion à l\'arrêt', many: 'discussions à l\'arrêt' },
  owner_sit_unconfirmed: { one: 'garde à confirmer', many: 'gardes à confirmer' },
}

/** « 18 candidatures sans réponse, 12 brouillons, 7 discussions à l'arrêt ». */
export function autoBreakdown(auto: { type: string; count: number }[]): string {
  return auto
    .map(({ type, count }) => {
      const l = AUTO_LABELS[type]
      return l ? `${count} ${count > 1 ? l.many : l.one}` : `${count} ${SIGNAL_TYPES[type]?.label ?? type}`
    })
    .join(', ')
}

/** Libellés de la synthèse du lundi. */
export const HEBDO_LABELS: Record<string, string> = {
  dormant_sitter: 'gardiens dormants',
  affinity_onboarding_stale: 'onboarding inachevé',
  city_coverage_gap: 'couverture des villes',
  city_seo_tension: 'tension SEO des villes',
  alma_unanswered: 'questions sans réponse d\'Alma',
}

export function hebdoBreakdown(hebdo: { type: string; count: number }[]): string {
  return hebdo.map(({ type, count }) => `${HEBDO_LABELS[type] ?? SIGNAL_TYPES[type]?.label ?? type} (${count})`).join(', ')
}
