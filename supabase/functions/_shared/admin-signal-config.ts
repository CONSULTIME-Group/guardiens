// Lot S2 : configuration UNIQUE des types de signaux admin.
// Lue par l'accueil admin (file d'actions, carte À animer) et par l'email
// quotidien (alert-admin-signals). Aucune autre liste de routage ne doit exister.
//
// Destinations :
// - action_queue   : file « À traiter » de l'accueil admin
// - daily_email    : email quotidien, seulement quand le signal est critique
// - weekly_summary : synthèse du lundi dans l'email
// - animate        : carte « À animer » de l'accueil admin (hors file d'actions)
// - immediate_email: email à l'équipe dès la levée du signal, envoyé par la
//                    fonction qui le lève (lot A4, alma_safety), hors email de 8 h
//
// queueGroup regroupe plusieurs types en UNE entrée de file :
// - sit          : par annonce (candidatures sans réponse, discussions à l'arrêt)
// - digest_queue : « File des digests »
// - content      : « Qualité éditoriale »
//
// autoResolve : true si auto_resolve_admin_signals (ou le détecteur) résout seul le signal.
// Un regroupement ne supprime aucune ligne : il affiche ensemble, ou résout le groupe.

export type SignalDestination = 'action_queue' | 'daily_email' | 'weekly_summary' | 'animate' | 'immediate_email'
export type SignalFamily =
  | 'candidatures' | 'annonces' | 'emails' | 'editorial' | 'couverture'
  | 'animation' | 'identite' | 'moderation' | 'technique' | 'accueil'
export type SignalQueueGroup = 'sit' | 'digest_queue' | 'content'

export interface SignalTypeConfig {
  label: string
  family: SignalFamily
  defaultSeverity: 'critical' | 'warning' | 'info'
  destinations: SignalDestination[]
  autoResolve: boolean
  queueGroup?: SignalQueueGroup
  deprecated?: boolean
  /** Lot J2-B : présent dans l'email quotidien même sans gravité critique. */
  dailyEmailAnySeverity?: boolean
}

const Q: SignalDestination[] = ['action_queue', 'daily_email']

export const SIGNAL_TYPES: Record<string, SignalTypeConfig> = {
  // Candidatures et gardes
  pending_application: { label: 'Candidature en attente', family: 'candidatures', defaultSeverity: 'critical', destinations: Q, autoResolve: true, queueGroup: 'sit' },
  stalled_discussion: { label: 'Discussion à l\'arrêt', family: 'candidatures', defaultSeverity: 'warning', destinations: Q, autoResolve: true, queueGroup: 'sit' },
  owner_sit_unconfirmed: { label: 'Annonce non confirmée par le propriétaire', family: 'candidatures', defaultSeverity: 'critical', destinations: Q, autoResolve: true },
  // Annonces
  no_applications: { label: 'Annonce sans candidature', family: 'annonces', defaultSeverity: 'warning', destinations: Q, autoResolve: true },
  stale_draft: { label: 'Brouillon dormant', family: 'annonces', defaultSeverity: 'warning', destinations: Q, autoResolve: true },
  owner_missing_coordinates: { label: 'Coordonnées propriétaire manquantes', family: 'annonces', defaultSeverity: 'warning', destinations: Q, autoResolve: true },
  sit_publish_error: { label: 'Erreur de publication d\'annonce', family: 'annonces', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  sit_published_zero_reach: { label: 'Annonce publiée sans aucun gardien touché', family: 'annonces', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  listing_proximity_large_broadcast: { label: 'Diffusion d\'annonce très large', family: 'annonces', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  sit_notification_claim_starvation: { label: 'Diffusion des annonces en attente', family: 'annonces', defaultSeverity: 'critical', destinations: Q, autoResolve: true },
  repeated_republish: { label: 'Republications répétées', family: 'annonces', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  repeated_cancellations: { label: 'Annulations répétées', family: 'annonces', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  // Emails et notifications
  digest_queue_stalled: { label: 'File d\'attente des digests bloquée', family: 'emails', defaultSeverity: 'warning', destinations: Q, autoResolve: true, queueGroup: 'digest_queue' },
  digest_queue_morning_backlog: { label: 'File des digests encore chargée après le dernier passage', family: 'emails', defaultSeverity: 'critical', destinations: Q, autoResolve: true, queueGroup: 'digest_queue' },
  email_delivery_low: { label: 'Livraison email dégradée', family: 'emails', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  email_queue_failures: { label: 'Échecs dans la file d\'envoi des emails', family: 'emails', defaultSeverity: 'critical', destinations: Q, autoResolve: false },
  email_recipient_address_invalid: { label: 'Adresse email refusée par le fournisseur', family: 'emails', defaultSeverity: 'critical', destinations: Q, autoResolve: false },
  email_abandon_high: { label: 'Emails abandonnés en nombre', family: 'emails', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  email_destroyed: { label: 'Emails détruits avant envoi', family: 'emails', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  notification_delivery_failed: { label: 'Notification non délivrée', family: 'emails', defaultSeverity: 'warning', destinations: Q, autoResolve: true },
  nurturing_run_anomaly: { label: 'Anomalie de séquence email', family: 'emails', defaultSeverity: 'critical', destinations: Q, autoResolve: true },
  // Éditorial : une entrée « Qualité éditoriale », synthèse du lundi ; la panne reste quotidienne.
  content_detector_broken: { label: 'Détecteur de contenu en panne', family: 'editorial', defaultSeverity: 'critical', destinations: ['action_queue', 'daily_email', 'weekly_summary'], autoResolve: false, queueGroup: 'content' },
  content_defect_outside_freeze: { label: 'Défaut de contenu hors gel', family: 'editorial', defaultSeverity: 'critical', destinations: ['action_queue', 'weekly_summary'], autoResolve: false, queueGroup: 'content' },
  content_freeze_expired: { label: 'Gel éditorial expiré', family: 'editorial', defaultSeverity: 'warning', destinations: ['action_queue', 'weekly_summary'], autoResolve: false, queueGroup: 'content' },
  content_quality_drift: { label: 'Dérive de qualité éditoriale', family: 'editorial', defaultSeverity: 'warning', destinations: ['action_queue', 'weekly_summary'], autoResolve: false, queueGroup: 'content' },
  // Couverture : synthèse du lundi seulement
  city_coverage_gap: { label: 'Trou de couverture gardiens', family: 'couverture', defaultSeverity: 'warning', destinations: ['weekly_summary'], autoResolve: true },
  city_seo_tension: { label: 'Tension SEO ville', family: 'couverture', defaultSeverity: 'warning', destinations: ['weekly_summary'], autoResolve: false },
  untapped_city: { label: 'Ville inexploitée (déprécié)', family: 'couverture', defaultSeverity: 'warning', destinations: [], autoResolve: false, deprecated: true },
  // Animation : carte « À animer » et ligne du lundi ; relances automatiques inchangées
  dormant_sitter: { label: 'Gardien dormant', family: 'animation', defaultSeverity: 'warning', destinations: ['animate', 'weekly_summary'], autoResolve: true },
  affinity_onboarding_stale: { label: 'Onboarding affinité inachevé', family: 'animation', defaultSeverity: 'warning', destinations: ['animate', 'weekly_summary'], autoResolve: true },
  dormant_top_sitter: { label: 'Meilleur gardien dormant', family: 'animation', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  // Identité
  identity_needs_review: { label: 'Vérification d\'identité à contrôler', family: 'identite', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  identity_orphan_documents: { label: 'Documents d\'identité orphelins', family: 'identite', defaultSeverity: 'warning', destinations: Q, autoResolve: true },
  stale_verification: { label: 'Vérification d\'identité en retard', family: 'identite', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  // Modération
  suspicious_account: { label: 'Compte suspect', family: 'moderation', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  sit_like_mission: { label: 'Mission qui ressemble à une garde', family: 'moderation', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  animal_rehoming_listing: { label: 'Cession ou adoption d\'animal', family: 'moderation', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  contact_details_in_public_content: { label: 'Coordonnées dans un contenu public', family: 'moderation', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  undeclared_pricing: { label: 'Mention de tarif non déclarée', family: 'moderation', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  pro_pending_review: { label: 'Fiche pro en attente de validation', family: 'moderation', defaultSeverity: 'warning', destinations: Q, autoResolve: false },
  // Accueil des membres (lot J1) : résolution manuelle, après contact humain.
  alma_frustration: { label: 'Membre en difficulté avec Alma', family: 'accueil', defaultSeverity: 'critical', destinations: Q, autoResolve: false },
  // Lot J2-B : filet humain d'Alma.
  alma_bug_report: { label: 'Bug supposé signalé à Alma', family: 'accueil', defaultSeverity: 'warning', destinations: Q, autoResolve: false, dailyEmailAnySeverity: true },
  alma_churn: { label: 'Membre qui veut partir', family: 'accueil', defaultSeverity: 'critical', destinations: Q, autoResolve: false },
  alma_unanswered: { label: 'Question restée sans réponse d\'Alma', family: 'accueil', defaultSeverity: 'info', destinations: ['weekly_summary'], autoResolve: false },
  alma_contact_request: { label: 'Membre qui écrit à Jérémie et Elisa depuis Alma', family: 'accueil', defaultSeverity: 'critical', destinations: Q, autoResolve: false },
  // Lot A4 : sûreté (urgence animale, personne en danger, détresse, maltraitance,
  // conflit de garde). Email immédiat, un par membre et par heure de Paris.
  alma_safety: { label: 'Sujet de sûreté confié à Alma', family: 'accueil', defaultSeverity: 'critical', destinations: ['action_queue', 'immediate_email'], autoResolve: false },
  // Technique
  prerender_monthly_budget_reached: { label: 'Rendu SEO suspendu : plafond mensuel atteint', family: 'technique', defaultSeverity: 'critical', destinations: Q, autoResolve: false },
}

// Lot ADM1 : la file « À traiter » se lit en trois sections, par nature d'action.
// - membres    : ce qui demande un message humain des fondateurs à un membre
// - moderation : contrôles de contenus, de comptes et d'identité
// - technique  : emails, diffusion, rendu SEO, contenus éditoriaux
export type QueueSection = 'membres' | 'moderation' | 'technique'

export const QUEUE_SECTION_LABELS: Record<QueueSection, string> = {
  membres: 'Membres à contacter',
  moderation: 'Modération',
  technique: 'Technique et contenus',
}

export const QUEUE_SECTION_ORDER: QueueSection[] = ['membres', 'moderation', 'technique']

const FAMILY_SECTION: Record<SignalFamily, QueueSection> = {
  candidatures: 'membres',
  annonces: 'membres',
  accueil: 'membres',
  animation: 'membres',
  couverture: 'technique',
  identite: 'moderation',
  moderation: 'moderation',
  emails: 'technique',
  editorial: 'technique',
  technique: 'technique',
}

// Types d'annonce qui relèvent de la diffusion ou du comportement, pas d'un message au propriétaire.
const TYPE_SECTION: Record<string, QueueSection> = {
  sit_publish_error: 'technique',
  sit_published_zero_reach: 'technique',
  listing_proximity_large_broadcast: 'technique',
  sit_notification_claim_starvation: 'technique',
  repeated_republish: 'moderation',
  repeated_cancellations: 'moderation',
}

/** Section de la file d'un type de signal ; un type inconnu va en Technique. */
export const queueSectionOf = (type: string): QueueSection => {
  if (TYPE_SECTION[type]) return TYPE_SECTION[type]
  const c = SIGNAL_TYPES[type]
  return c ? FAMILY_SECTION[c.family] : 'technique'
}

// Lot ADM1 : verbe d'action par type, partagé par l'accueil admin et l'email du matin.
export const SIGNAL_ACTIONS: Record<string, string> = {
  pending_application: 'Relancer le propriétaire pour qu\'il réponde aux candidatures.',
  stalled_discussion: 'Relancer la discussion entre le propriétaire et le gardien.',
  owner_sit_unconfirmed: 'Aider le propriétaire à confirmer son gardien avant le départ.',
  stale_draft: 'Proposer au propriétaire de terminer et publier son annonce.',
  no_applications: 'Diffuser l\'annonce auprès des gardiens proches.',
  nurturing_run_anomaly: 'Vérifier le dernier passage des séquences email.',
  digest_queue_stalled: 'Vérifier l\'envoi des digests gardiens.',
  digest_queue_morning_backlog: 'Vérifier l\'envoi du digest du matin.',
  email_delivery_low: 'Vérifier la délivrabilité des emails.',
  email_queue_failures: 'Vérifier la file d\'envoi des emails.',
  email_recipient_address_invalid: 'Corriger l\'adresse email du membre.',
  notification_delivery_failed: 'Vérifier l\'envoi des notifications.',
  sit_notification_claim_starvation: 'Vérifier la diffusion des annonces aux gardiens.',
  suspicious_account: 'Examiner le compte signalé.',
  content_defect_outside_freeze: 'Corriger les contenus signalés.',
  prerender_monthly_budget_reached: 'Relever le budget de pré-rendu : les nouvelles pages ne sont plus indexées.',
  alma_frustration: 'Écrire au membre : il cherchait de l\'aide et Alma ne l\'a pas orienté.',
  alma_bug_report: 'Reproduire le problème décrit, puis répondre au membre.',
  alma_churn: 'Écrire à ce membre depuis sa fiche avant son départ.',
  alma_contact_request: 'Répondre au message reçu depuis Alma (Messages de contact).',
}

export const signalAction = (type: string): string =>
  SIGNAL_ACTIONS[type] ?? 'Ouvrir le signal dans l\'administration et le traiter.'

// Priorité d'action quand une annonce porte plusieurs signaux.
export const SIT_ACTION_PRIORITY = ['owner_sit_unconfirmed', 'stalled_discussion', 'pending_application', 'no_applications', 'stale_draft']

// Lot ADM1 : signaux qui n'ont de sens qu'avant le début de la garde. Même
// liste que le CTE sit_started de auto_resolve_admin_signals (drizzle 0088).
export const SIT_TIMED_TYPES = new Set(['pending_application', 'stalled_discussion', 'owner_sit_unconfirmed', 'no_applications'])

/** Une garde à moins de SIT_IMMINENT_DAYS jours passe en priorité haute. */
export const SIT_IMMINENT_DAYS = 7

/** Jour civil à Paris, au format AAAA-MM-JJ. */
export function parisDay(now: number = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(now))
}

/** Jours entre aujourd'hui (Paris) et le début de garde ; null sans date lisible. */
export function daysUntilStart(startDate: string | null | undefined, now: number = Date.now()): number | null {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}/.test(startDate)) return null
  const start = Date.parse(`${startDate.slice(0, 10)}T00:00:00Z`)
  const today = Date.parse(`${parisDay(now)}T00:00:00Z`)
  return Math.round((start - today) / 86_400_000)
}

/** Garde commencée : la veille du jour de Paris ou avant. Le jour même reste actionnable. */
export const isSitStarted = (startDate: string | null | undefined, now: number = Date.now()): boolean => {
  const d = daysUntilStart(startDate, now)
  return d !== null && d < 0
}

export const isSitImminent = (startDate: string | null | undefined, now: number = Date.now()): boolean => {
  const d = daysUntilStart(startDate, now)
  return d !== null && d >= 0 && d <= SIT_IMMINENT_DAYS
}

export const QUEUE_GROUP_LABELS: Record<SignalQueueGroup, string> = {
  sit: 'Candidatures en attente',
  digest_queue: 'File des digests',
  content: 'Qualité éditoriale',
}

export const signalConfig = (type: string): SignalTypeConfig | undefined => SIGNAL_TYPES[type]

// Type inconnu : file d'actions et email si critique, pour ne jamais perdre un signal.
export const hasDestination = (type: string, d: SignalDestination): boolean => {
  const c = SIGNAL_TYPES[type]
  if (!c) return d === 'action_queue' || d === 'daily_email'
  return c.destinations.includes(d)
}

export const ANIMATE_TYPES = Object.entries(SIGNAL_TYPES)
  .filter(([, c]) => c.destinations.includes('animate')).map(([t]) => t)

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

/** Résumé des signaux d'une annonce : « 3 candidatures sans réponse, 1 discussion à l'arrêt ». */
export function sitGroupSummary(types: string[]): string {
  const n = types.filter((t) => t === 'pending_application').length
  const m = types.filter((t) => t === 'stalled_discussion').length
  const parts: string[] = []
  if (n) parts.push(plural(n, 'candidature sans réponse', 'candidatures sans réponse'))
  if (m) parts.push(plural(m, 'discussion à l\'arrêt', 'discussions à l\'arrêt'))
  return parts.join(', ')
}

const frDate = (iso: string | null | undefined): string | null => {
  if (!iso) return null
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** « {titre}, {ville}, début le {date} : {n} candidatures sans réponse, {m} discussions à l'arrêt ». */
export function sitGroupLine(
  sit: { title?: string | null; city?: string | null; start_date?: string | null },
  types: string[],
): string {
  const head = [sit.title?.trim() || 'Annonce', sit.city?.trim() || null].filter(Boolean).join(', ')
  const date = frDate(sit.start_date)
  return `${head}${date ? `, début le ${date}` : ''} : ${sitGroupSummary(types)}`.replace(/[\u2014\u2013]/g, ',')
}

// Lot ADM10 (22/10/2026, maquette validée par Jérémie) : nature de pilotage
// d'un type de signal, lue par l'accueil admin et par l'email du matin.
// - vous      : seul un fondateur peut agir (diffusion, modération, message Alma)
// - auto      : le site relance déjà le membre ; remonte seulement si le départ
//               approche (SIT_IMMINENT_DAYS) ou si une relance échoue
// - technique : panne ou réglage du site, lue avec l'état du site
// - hebdo     : synthèse du lundi (animation, couverture)
export type SignalNature = 'vous' | 'auto' | 'technique' | 'hebdo'

/** Types relancés automatiquement auprès du membre (fonctions nudge-* et rappels). */
export const AUTO_HANDLED_TYPES = new Set(['pending_application', 'stalled_discussion', 'owner_sit_unconfirmed', 'stale_draft'])

/** Gabarits des relances automatiques de ces types, lus dans email_send_log. */
export const AUTO_RELANCE_TEMPLATES = [
  'owner-pending-application-nudge',
  'owner-sit-unconfirmed',
  'sit-draft-reminder',
  'unread-messages-reminder',
]

/** Nature d'un type ; un type inconnu revient aux fondateurs, pour ne jamais le perdre. */
export const signalNature = (type: string): SignalNature => {
  if (AUTO_HANDLED_TYPES.has(type)) return 'auto'
  const c = SIGNAL_TYPES[type]
  if (!c) return 'vous'
  if (!c.destinations.includes('action_queue')) return 'hebdo'
  if (queueSectionOf(type) === 'technique') return 'technique'
  return 'vous'
}
