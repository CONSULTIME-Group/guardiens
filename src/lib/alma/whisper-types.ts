/**
 * Types partagés Alma Pass 4 — narratrice cross-page.
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
  // Pass 5 — compagnon culturel (P3, ambiance, jamais bloquant)
  | "cultural_fact";

export type AlmaWhisperPriority = "P0" | "P1" | "P2" | "P3";

export type AlmaAudience = "owner" | "sitter";

export type AlmaFrequency = "silent" | "balanced" | "talkative";

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
  cultural_fact: "P3",
};

export const FREQUENCY_CONFIG: Record<
  AlmaFrequency,
  { maxPerSession: number; cooldownMs: number }
> = {
  silent: { maxPerSession: 0, cooldownMs: Infinity },
  balanced: { maxPerSession: 3, cooldownMs: 5 * 60 * 1000 },
  talkative: { maxPerSession: 8, cooldownMs: 90 * 1000 },
};

/**
 * Quotas dédiés au compagnon culturel (Pass 5) — indépendants du quota
 * général : on ne veut pas qu'un fait culturel consomme le budget d'un
 * whisper actionnable, et inversement.
 */
export const CULTURAL_FACT_LIMITS: Record<
  AlmaFrequency,
  { maxPerSession: number; cooldownMs: number }
> = {
  silent: { maxPerSession: 0, cooldownMs: Infinity },
  balanced: { maxPerSession: 1, cooldownMs: 5 * 60 * 1000 },
  talkative: { maxPerSession: 2, cooldownMs: 3 * 60 * 1000 },
};
