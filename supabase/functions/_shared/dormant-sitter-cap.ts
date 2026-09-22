// Plafond des relances « gardien dormant ».
//
// Constat du 22/09/2026 : 247 envois pour 47 personnes, jusqu'à 9 au même
// membre, pour 0 candidature sur 60 jours. Le cron hebdomadaire renvoyait
// indéfiniment tant que le gardien restait sans candidature.
//
// Règle retenue : trois envois au total, calés sur J+30, J+45 et J+75 après
// l'inscription, puis arrêt définitif. Le cron passe le lundi, chaque jalon
// ouvre donc une fenêtre de tolérance d'une semaine. Les comptes
// administrateurs sont exclus.

export const DORMANT_MILESTONES_DAYS = [30, 45, 75] as const;
export const DORMANT_MILESTONE_TOLERANCE_DAYS = 7;
export const DORMANT_MAX_SENDS = 3;

export type DormantSkipReason =
  | "admin_account"
  | "cap_reached"
  | "outside_milestone_window";

export interface DormantDecision {
  send: boolean;
  reason: DormantSkipReason | null;
}

export function isInMilestoneWindow(daysSinceSignup: number): boolean {
  return DORMANT_MILESTONES_DAYS.some((m) =>
    daysSinceSignup >= m && daysSinceSignup < m + DORMANT_MILESTONE_TOLERANCE_DAYS
  );
}

export function dormantSendDecision(input: {
  daysSinceSignup: number;
  alreadySentCount: number;
  isAdmin: boolean;
}): DormantDecision {
  if (input.isAdmin) return { send: false, reason: "admin_account" };
  if (input.alreadySentCount >= DORMANT_MAX_SENDS) {
    return { send: false, reason: "cap_reached" };
  }
  if (!isInMilestoneWindow(input.daysSinceSignup)) {
    return { send: false, reason: "outside_milestone_window" };
  }
  return { send: true, reason: null };
}
