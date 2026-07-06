/**
 * Types partagés Alma — narratrice cross-page + compagnon.
 *
 * Étape 1 évolution produit :
 *  - Nouveau niveau de fréquence "low" (peu bavarde). AlmaFrequency = silent | low | balanced | talkative.
 *  - Nouveau type de contenu `usage_nudge` (P2, prioritaire sur cultural_fact P3).
 *  - Quotas revus pour rendre la banque de faits réellement exploitée.
 */

export type AlmaWhisperType =
  // SearchSitter (sitter)
  | "sitter_fresh_sit_detected"
  | "sitter_search_indecision"
  | "sitter_search_repeated_no_action"
  // SitDetail (sitter)
  | "sitter_popular_sit_context"
  | "sitter_reactive_owner_context"
  // PublicSitterProfile (owner)
  | "owner_active_sitter_context"
  | "owner_reciprocal_interest"
  // OwnerDashboard
  | "owner_view_trend_up"
  | "owner_traffic_no_action"
  // Messages
  | "owner_conversation_stagnant"
  // Cross
  | "sitter_international_discovery"
  | "long_absence_return"
  // Pass 5 — compagnon culturel (P3, ambiance)
  | "cultural_fact"
  // Étape 1 — incitations contextuelles (P2, actionnables)
  | "usage_nudge";

export type AlmaWhisperPriority = "P0" | "P1" | "P2" | "P3";

export type AlmaAudience = "owner" | "sitter";

export type AlmaFrequency = "silent" | "low" | "balanced" | "talkative";

export interface AlmaWhisperAction {
  label: string;
  onClick: () => void;
  actionId: string;
}

export interface AlmaWhisper {
  id: string;
  type: AlmaWhisperType;
  audience: AlmaAudience;
  surface: string;
  priority: AlmaWhisperPriority;
  message: string; // < 140 chars
  primaryAction?: AlmaWhisperAction;
  secondaryAction?: AlmaWhisperAction;
  /**
   * Action tertiaire optionnelle, réservée au bouton « Un autre conseil »
   * disponible sur les whispers de type `cultural_fact` et `usage_nudge`.
   * Câblée par AlmaWhisperOutlet, pas par les builders.
   */
  allowNextTip?: boolean;
  persistAcrossNavigation?: boolean;
  autoDismissMs?: number;
  metadata?: Record<string, unknown>;
}

export type AlmaDismissReason = "action_clicked" | "closed_manually" | "timeout" | "navigation";

export const WHISPER_PRIORITY: Record<AlmaWhisperType, AlmaWhisperPriority> = {
  owner_reciprocal_interest: "P0",
  owner_conversation_stagnant: "P0",
  long_absence_return: "P0",
  sitter_popular_sit_context: "P1",
  owner_active_sitter_context: "P1",
  owner_traffic_no_action: "P1",
  sitter_international_discovery: "P1",
  sitter_fresh_sit_detected: "P2",
  sitter_search_indecision: "P2",
  sitter_search_repeated_no_action: "P2",
  sitter_reactive_owner_context: "P2",
  owner_view_trend_up: "P2",
  usage_nudge: "P2",
  cultural_fact: "P3",
};

/**
 * Configuration des whispers proactifs actionnables (P0 à P2).
 * "low" = filet nouveau (peu bavarde). "talkative" pensé pour un conseil
 * possible à chaque changement de page (cooldown court anti-spam).
 */
export const FREQUENCY_CONFIG: Record<
  AlmaFrequency,
  { maxPerSession: number; cooldownMs: number }
> = {
  silent: { maxPerSession: 0, cooldownMs: Infinity },
  low: { maxPerSession: 3, cooldownMs: 10 * 60 * 1000 },
  balanced: { maxPerSession: 5, cooldownMs: 150 * 1000 },
  talkative: { maxPerSession: 12, cooldownMs: 25 * 1000 },
};

/**
 * Quotas dédiés au compagnon culturel (P3) — indépendants du quota général :
 * on ne veut pas qu'un fait culturel consomme le budget d'un whisper
 * actionnable, et inversement. Volontairement plus permissif pour exploiter
 * la banque de 300+ faits.
 */
export const CULTURAL_FACT_LIMITS: Record<
  AlmaFrequency,
  { maxPerSession: number; cooldownMs: number }
> = {
  silent: { maxPerSession: 0, cooldownMs: Infinity },
  low: { maxPerSession: 3, cooldownMs: 10 * 60 * 1000 },
  balanced: { maxPerSession: 8, cooldownMs: 2 * 60 * 1000 },
  talkative: { maxPerSession: 20, cooldownMs: 25 * 1000 },
};
