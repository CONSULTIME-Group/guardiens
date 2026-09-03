/**
 * Regroupement d'affichage des signaux admin : libellés français, noms
 * d'entités pour les compteurs, fonctions de relance de masse et liens
 * vers les pages admin concernées.
 *
 * Le regroupement est purement visuel : aucune ligne n'est fusionnée ou
 * supprimée en base.
 */

export interface AdminSignalBase {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: Record<string, unknown>;
}

/** Libellés lisibles par signal_type. Repli sur le type brut si inconnu. */
export const SIGNAL_TYPE_LABELS: Record<string, string> = {
  affinity_onboarding_stale: "Onboarding affinité inachevé",
  dormant_sitter: "Gardien dormant",
  dormant_top_sitter: "Meilleur gardien dormant",
  suspicious_account: "Compte suspect",
  owner_sit_unconfirmed: "Annonce non confirmée par le propriétaire",
  pending_application: "Candidature en attente",
  stale_draft: "Brouillon dormant",
  untapped_city: "Ville sans activité",
  undeclared_pricing: "Mention de tarif non déclarée",
  contact_details_in_public_content: "Coordonnées dans un contenu public",
  no_applications: "Annonce sans candidature",
  nurturing_run_anomaly: "Anomalie de séquence email",
  email_delivery_low: "Livraison email dégradée",
  identity_orphan_documents: "Documents d'identité orphelins",
  owner_missing_coordinates: "Coordonnées propriétaire manquantes",
  notification_delivery_failed: "Notification non délivrée",
  digest_queue_stalled: "File d'attente des digests bloquée",
  digest_queue_morning_backlog: "File des digests encore chargée après le dernier passage",
  stale_verification: "Vérification d'identité en retard",
  repeated_cancellations: "Annulations répétées",
  repeated_republish: "Republications répétées",
  identity_needs_review: "Vérification d'identité à contrôler",
  sit_like_mission: "Mission qui ressemble à une garde",
  animal_rehoming_listing: "Cession ou adoption d'animal",
  sit_published_zero_reach: "Annonce publiée sans aucun gardien touché",
  email_recipient_address_invalid: "Adresse email refusée par le fournisseur",
  pro_pending_review: "Fiche pro en attente de validation",


};

/**
 * Libellé lisible d'un signal. Un type inconnu n'emprunte jamais le libellé
 * d'un autre type : il est annoncé explicitement, type brut inclus.
 */
export const signalTypeLabel = (type: string): string =>
  SIGNAL_TYPE_LABELS[type] ?? `Signal inconnu : ${type}`;

/**
 * Fonction de relance associée à un type de signal, quand il en existe une.
 * Ces fonctions acceptent un appel admin (même garde que les crons).
 */
export const SIGNAL_RELAUNCH_FN: Record<string, string> = {
  affinity_onboarding_stale: "nudge-affinity-onboarding",
  dormant_sitter: "nudge-sitter-dormant",
  dormant_top_sitter: "nudge-dormant-top-sitters",
  stale_draft: "nudge-stale-draft",
  stale_verification: "nudge-verification-stale",
  no_applications: "nudge-owner-no-applications",
  pending_application: "nudge-owner-pending-application",
  owner_sit_unconfirmed: "nudge-owner-unconfirmed-sit",
};

const ENTITY_NOUNS: Record<string, { one: string; many: string }> = {
  profile: { one: "membre", many: "membres" },
  sit: { one: "annonce", many: "annonces" },
  application: { one: "candidature", many: "candidatures" },
  mission: { one: "mission", many: "missions" },
  review: { one: "avis", many: "avis" },
  message: { one: "message", many: "messages" },
  report: { one: "signalement", many: "signalements" },
};

/** Nom d'entité accordé au nombre de signaux du groupe ("8 membres"). */
export const entityNoun = (signals: AdminSignalBase[]): string => {
  const types = new Set(signals.map((s) => s.entity_type));
  const n = signals.length;
  if (types.size === 1) {
    const nouns = ENTITY_NOUNS[[...types][0]];
    if (nouns) return n > 1 ? nouns.many : nouns.one;
  }
  return n > 1 ? "éléments" : "élément";
};

export function signalAdminLink(s: AdminSignalBase): string {
  switch (s.entity_type) {
    case "sit":
      return "/admin/listings";
    case "mission":
      return "/admin/small-missions";
    case "profile":
      return "/admin/users";
    case "review":
      return "/admin/reviews";
    case "report":
      return "/admin/reports";
    case "message":
      return s.metadata?.conversation_id
        ? `/admin/messages?conversation=${s.metadata.conversation_id as string}`
        : "/admin/messages";
    case "application":
      return "/admin/listings";
    default:
      return "/admin";
  }
}

/** Dès 2 signaux non résolus du même type, une seule carte groupée. */
export const GROUP_THRESHOLD = 2;

export interface SignalGroup {
  signalType: string;
  items: AdminSignalBase[];
  severity: "critical" | "warning";
}

/** Regroupe par signal_type en conservant l'ordre de première apparition. */
export function groupSignals(signals: AdminSignalBase[]): SignalGroup[] {
  const byType = new Map<string, AdminSignalBase[]>();
  for (const s of signals) {
    const list = byType.get(s.signal_type) ?? [];
    list.push(s);
    byType.set(s.signal_type, list);
  }
  return [...byType.entries()].map(([signalType, items]) => ({
    signalType,
    items,
    severity: items.some((s) => s.severity === "critical") ? "critical" : "warning",
  }));
}

/** Échelle de priorité unifiée de la file "À traiter" (signaux et IA). */
export type QueuePriority = "haute" | "moyenne" | "basse";

/** Gravité d'un signal projetée sur l'échelle unifiée. */
export const severityToPriority = (severity: AdminSignalBase["severity"]): QueuePriority =>
  severity === "critical" ? "haute" : "moyenne";

/**
 * Sujet métier porté par chaque type de signal. Sert à écarter les
 * suggestions IA qui traitent du même sujet qu'un signal visible, même
 * quand les liens diffèrent (par exemple relance de masse vers
 * /admin/envois-groupes contre signal pointant vers /admin/users).
 */
export const SIGNAL_TOPIC: Record<string, string> = {
  dormant_sitter: "gardiens_dormants",
  dormant_top_sitter: "gardiens_dormants",
  affinity_onboarding_stale: "onboarding_affinite",
  owner_sit_unconfirmed: "gardes_non_confirmees",
  pending_application: "candidatures_sans_reponse",
  no_applications: "liquidite_annonces",
  stale_draft: "liquidite_annonces",
  untapped_city: "liquidite_annonces",
  email_delivery_low: "deliverabilite_email",
  digest_queue_stalled: "deliverabilite_email",
  digest_queue_morning_backlog: "deliverabilite_email",
  notification_delivery_failed: "deliverabilite_email",
  nurturing_run_anomaly: "deliverabilite_email",
  stale_verification: "verifications_identite",
  identity_needs_review: "verifications_identite",
  identity_orphan_documents: "verifications_identite",
  repeated_cancellations: "retention_membres",
  repeated_republish: "retention_membres",
};
