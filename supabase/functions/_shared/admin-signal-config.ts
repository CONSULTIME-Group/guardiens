// Lot S2 : configuration UNIQUE des types de signaux admin.
// Lue par l'accueil admin (file d'actions, carte À animer) et par l'email
// quotidien (alert-admin-signals). Aucune autre liste de routage ne doit exister.
//
// Destinations :
// - action_queue   : file « À traiter » de l'accueil admin
// - daily_email    : email quotidien, seulement quand le signal est critique
// - weekly_summary : synthèse du lundi dans l'email
// - animate        : carte « À animer » de l'accueil admin (hors file d'actions)
//
// queueGroup regroupe plusieurs types en UNE entrée de file :
// - sit          : par annonce (candidatures sans réponse, discussions à l'arrêt)
// - digest_queue : « File des digests »
// - content      : « Qualité éditoriale »
//
// autoResolve : true si auto_resolve_admin_signals (ou le détecteur) résout seul le signal.
// Un regroupement ne supprime aucune ligne : il affiche ensemble, ou résout le groupe.

export type SignalDestination = 'action_queue' | 'daily_email' | 'weekly_summary' | 'animate'
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
  // Technique
  prerender_monthly_budget_reached: { label: 'Plafond mensuel de renders atteint', family: 'technique', defaultSeverity: 'critical', destinations: Q, autoResolve: false },
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
