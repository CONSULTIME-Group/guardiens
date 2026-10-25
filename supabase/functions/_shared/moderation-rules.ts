// Lot J2c (14/10/2026) : règles des CGU version 9 citées par une décision de
// modération (articles 7, 10, 11.4 et 14.4). Module pur, sans dépendance Deno,
// lu par les écrans admin (src), par moderate-content et par les tests.
//
// Chaque règle porte une phrase destinée au membre, au vouvoiement et à la
// forme affirmative, reprise telle quelle dans l'email de décision (CGU 14.5)
// ou dans le message affiché quand un texte est retenu avant publication.

export type ModerationRuleGroup = '7' | '10' | '11.4'

export interface ModerationRule {
  id: string
  group: ModerationRuleGroup
  /** Libellé court de l'écran admin. */
  label: string
  /** Phrase au membre, article compris. */
  statement: string
}

export const MODERATION_RULE_GROUP_LABELS: Record<ModerationRuleGroup, string> = {
  '7': 'Article 7 : Entraide',
  '10': 'Article 10 : comportement des membres',
  '11.4': 'Article 11.4 : cas d\'effet immédiat',
}

export const MODERATION_RULES: readonly ModerationRule[] = [
  // Article 7 : Entraide
  { id: 'cgu-7-2', group: '7', label: '7.2 · Rémunération d\'un coup de main',
    statement: 'Article 7.2 des CGU : un coup de main est un échange gratuit entre membres, seul le remboursement exact d\'une dépense avancée est admis.' },
  { id: 'cgu-7-3', group: '7', label: '7.3 · Coup de main exclu (garde d\'enfants, soins, travaux dangereux, activité réglementée ou professionnelle)',
    statement: 'Article 7.3 des CGU : la garde d\'enfants, les soins, les travaux dangereux et les activités professionnelles ou réglementées sont exclus de l\'Entraide.' },
  { id: 'cgu-7-4', group: '7', label: '7.4 · Aide aux devoirs hors des conditions prévues',
    statement: 'Article 7.4 des CGU : l\'aide aux devoirs se déroule à la demande et en présence d\'un représentant légal de l\'enfant.' },
  { id: 'cgu-7-5', group: '7', label: '7.5 · Mineur identifiable dans un contenu',
    statement: 'Article 7.5 des CGU : un mineur figure dans un contenu de façon anonyme seulement, et tout élément qui l\'identifie ou le localise en est retiré.' },
  { id: 'cgu-7-6', group: '7', label: '7.6 · Personne vulnérable (argent, procuration, moyens de paiement)',
    statement: 'Article 7.6 des CGU : un coup de main auprès d\'une personne vulnérable porte sur des gestes du quotidien, et le membre qui aide refuse tout don, prêt, procuration ou accès à ses moyens de paiement.' },
  // Article 10 : comportement des membres
  { id: 'cgu-10-exactitude', group: '10', label: '10 · Informations inexactes',
    statement: 'Article 10 des CGU : chaque membre fournit des informations exactes et actualisées.' },
  { id: 'cgu-10-identite', group: '10', label: '10 · Usurpation d\'identité',
    statement: 'Article 10 des CGU : chaque membre agit sous sa propre identité.' },
  { id: 'cgu-10-contenu', group: '10', label: '10 · Contenu diffamatoire, discriminatoire, haineux, illicite ou trompeur',
    statement: 'Article 10 des CGU : les contenus publiés restent conformes à la loi et respectueux des personnes, ce qui exclut tout contenu diffamatoire, discriminatoire, haineux, illicite ou trompeur.' },
  { id: 'cgu-10-harcelement', group: '10', label: '10 · Harcèlement, menace, intimidation ou discrimination d\'un membre',
    statement: 'Article 10 des CGU : chaque membre traite les autres avec respect, et harceler, menacer, intimider ou discriminer un membre est interdit.' },
  { id: 'cgu-10-commercial', group: '10', label: '10 · Usage commercial ou démarchage',
    statement: 'Article 10 des CGU : la Plateforme sert aux échanges entre membres, et tout usage commercial hors de l\'annuaire des pros ou tout démarchage est interdit.' },
  { id: 'cgu-10-contournement', group: '10', label: '10 · Contournement de la sécurité ou de la modération',
    statement: 'Article 10 des CGU : chaque membre respecte les systèmes de sécurité et de modération de la Plateforme.' },
  { id: 'cgu-10-attaque', group: '10', label: '10 · Test d\'intrusion ou attaque',
    statement: 'Article 10 des CGU : toute action qui vise la disponibilité ou l\'intégrité de la Plateforme est interdite.' },
  { id: 'cgu-10-extraction', group: '10', label: '10 · Extraction automatisée (robots, scripts)',
    statement: 'Article 10 des CGU : la collecte automatisée des contenus de la Plateforme est interdite.' },
  { id: 'cgu-10-reutilisation', group: '10', label: '10 · Réutilisation des contenus sur un autre support',
    statement: 'Article 10 des CGU : la republication des contenus de la Plateforme sur un autre support demande l\'accord écrit de Guardiens.' },
  // Article 11.4 : cas d'effet immédiat
  { id: 'cgu-11-4-securite', group: '11.4', label: '11.4 · Risque pour la sécurité d\'une personne ou d\'un animal',
    statement: 'Article 11.4 des CGU : un risque pour la sécurité d\'une personne ou d\'un animal fait partie des cas où une mesure prend effet dès sa notification.' },
  { id: 'cgu-11-4-violence', group: '11.4', label: '11.4 · Violence, menace, harcèlement ou discrimination',
    statement: 'Article 11.4 des CGU : la violence, la menace, le harcèlement ou la discrimination font partie des cas où une mesure prend effet dès sa notification.' },
  { id: 'cgu-11-4-maltraitance', group: '11.4', label: '11.4 · Mauvais traitement d\'un animal',
    statement: 'Article 11.4 des CGU : le mauvais traitement d\'un animal fait partie des cas où une mesure prend effet dès sa notification.' },
  { id: 'cgu-11-4-mineur', group: '11.4', label: '11.4 · Atteinte à un mineur',
    statement: 'Article 11.4 des CGU : une atteinte à un mineur fait partie des cas où une mesure prend effet dès sa notification.' },
  { id: 'cgu-11-4-fraude', group: '11.4', label: '11.4 · Fraude, usurpation d\'identité ou faux document',
    statement: 'Article 11.4 des CGU : la fraude, l\'usurpation d\'identité ou un faux document font partie des cas où une mesure prend effet dès sa notification.' },
  { id: 'cgu-11-4-remuneration', group: '11.4', label: '11.4 · Rémunération demandée ou versée pour une garde ou un coup de main',
    statement: 'Article 11.4 des CGU : la demande ou le versement d\'une rémunération pour une garde ou un coup de main fait partie des cas où une mesure prend effet dès sa notification.' },
  { id: 'cgu-11-4-garde-enfants', group: '11.4', label: '11.4 · Nouvelle publication d\'un besoin de garde d\'enfants après un premier retrait',
    statement: 'Article 11.4 des CGU : la nouvelle publication d\'un besoin de garde d\'enfants après un premier retrait fait partie des cas où une mesure prend effet dès sa notification.' },
  { id: 'cgu-11-4-illicite', group: '11.4', label: '11.4 · Contenu manifestement illicite',
    statement: 'Article 11.4 des CGU : un contenu manifestement illicite fait partie des cas où une mesure prend effet dès sa notification.' },
  { id: 'cgu-11-4-compte-mineur', group: '11.4', label: '11.4 · Compte créé par un mineur',
    statement: 'Article 11.4 des CGU : un compte créé par un mineur fait partie des cas où une mesure prend effet dès sa notification, la Plateforme étant réservée aux personnes majeures.' },
  { id: 'cgu-11-4-securite-plateforme', group: '11.4', label: '11.4 · Atteinte à la sécurité de la Plateforme',
    statement: 'Article 11.4 des CGU : une atteinte à la sécurité de la Plateforme fait partie des cas où une mesure prend effet dès sa notification.' },
  { id: 'cgu-11-4-contournement', group: '11.4', label: '11.4 · Contournement d\'une mesure antérieure',
    statement: 'Article 11.4 des CGU : le contournement d\'une mesure antérieure fait partie des cas où une mesure prend effet dès sa notification.' },
  { id: 'cgu-11-4-recidive', group: '11.4', label: '11.4 · Manquement répété après un avertissement',
    statement: 'Article 11.4 des CGU : un manquement répété après un avertissement fait partie des cas où une mesure prend effet dès sa notification.' },
  { id: 'cgu-11-4-autorite', group: '11.4', label: '11.4 · Demande d\'une autorité',
    statement: 'Article 11.4 des CGU : la demande d\'une autorité fait partie des cas où une mesure prend effet dès sa notification.' },
]

export function findModerationRule(id: unknown): ModerationRule | null {
  if (typeof id !== 'string') return null
  return MODERATION_RULES.find((r) => r.id === id) ?? null
}

/** Seuls les cas de l'article 11.4 autorisent une mesure à effet immédiat. */
export function allowsImmediateEffect(ruleId: unknown): boolean {
  return findModerationRule(ruleId)?.group === '11.4'
}

// ---------------------------------------------------------------------------
// Vérification automatique (moderate-content et filtres du formulaire de besoin)

export type AutomatedRuleId =
  | 'contact_details'
  | 'payment'
  | 'hate'
  | 'sexual'
  | 'scam'
  | 'test_content'
  | 'child_care'

export const AUTOMATED_RULE_IDS: readonly AutomatedRuleId[] = [
  'contact_details', 'payment', 'hate', 'sexual', 'scam', 'test_content', 'child_care',
]

export const AUTOMATED_RULE_STATEMENTS: Record<AutomatedRuleId, string> = {
  contact_details: 'Article 14.4 des CGU : une annonce publique garde les coordonnées personnelles (téléphone, email) hors de son texte, elles s\'échangent ensuite en messagerie.',
  payment: 'Articles 6.3 et 7.2 des CGU : les gardes et les coups de main se font à titre gratuit entre membres.',
  hate: 'Article 10 des CGU : les propos haineux, discriminatoires ou menaçants sont exclus de la Plateforme.',
  sexual: 'Article 10 des CGU : les contenus publiés restent conformes à la loi et respectueux des personnes, ce qui exclut tout contenu sexuel.',
  scam: 'Article 10 des CGU : les contenus publiés sont exacts et loyaux, ce qui exclut toute escroquerie.',
  test_content: 'Article 10 des CGU : une annonce décrit une garde réelle, avec des informations exactes.',
  child_care: 'Article 7.3 des CGU : la garde d\'enfants est exclue de l\'Entraide.',
}

/** Phrase de repli quand l'outil ne précise pas la règle (ancienne version déployée). */
export const AUTOMATED_RULE_FALLBACK =
  'Article 14.4 des CGU : la vérification automatique retient les coordonnées personnelles dans une annonce publique, les propos haineux ou discriminatoires, les contenus sexuels, les escroqueries manifestes et les propositions de paiement entre membres.'

export function automatedRuleStatement(rule: unknown): string {
  return typeof rule === 'string' && (AUTOMATED_RULE_IDS as readonly string[]).includes(rule)
    ? AUTOMATED_RULE_STATEMENTS[rule as AutomatedRuleId]
    : AUTOMATED_RULE_FALLBACK
}

// ---------------------------------------------------------------------------
// Voies de recours (CGU 14.6 et 19)

export const REVIEW_CONTACT = 'contact@guardiens.fr'

export const HUMAN_REVIEW_SENTENCE =
  'Pour demander un examen par une personne de l\'équipe, écrivez à contact@guardiens.fr.'

export const RECOURSE_LINES: readonly string[] = [
  'Réexamen gratuit par une personne de l\'équipe : écrivez à contact@guardiens.fr dans les 6 mois qui suivent ce message, avec tout élément utile (article 14.6 des CGU).',
  'Saisine du juge compétent, à tout moment (article 19 des CGU).',
  'Réclamation auprès de l\'Arcom, coordinateur pour les services numériques en France (arcom.fr).',
]
