/**
 * Point d'entrée unique vers la vérification d'identité.
 *
 * Chaque surface qui pousse vers la vérification passe sa propre `source`,
 * ce qui permet à `IdentityVerificationSection` d'émettre un unique
 * `identity_cta_clicked` à l'arrivée, et donc de savoir lesquels des points
 * d'entrée servent réellement à quelque chose.
 *
 * Les libellés d'incitation eux-mêmes ne sont pas gérés ici.
 */
export type IdentityCtaSource =
  | "access_gate_banner"
  | "alma_dock"
  | "application_modal"
  | "mission_hint"
  | "onboarding_welcome_owner"
  | "onboarding_welcome_sitter"
  | "owner_next_actions"
  | "owner_priority_action"
  | "sitter_dashboard"
  | "sitter_priority_action"
  | "trust_profile"
  | "unknown";

export const identityCtaHref = (source: IdentityCtaSource): string =>
  `/settings?section=security&src=${source}`;
