// Lot ADM22 : alertes de l'équipe, choisies par chaque admin dans
// Paramètres > Notifications. Colonnes de public.admin_alert_preferences.

export type TeamAlertKey = "contact_email" | "suspicious_email" | "health_email";

export interface TeamAlertPrefs {
  contact_email: boolean;
  suspicious_email: boolean;
  health_email: boolean;
}

export const TEAM_ALERT_DEFAULTS: TeamAlertPrefs = {
  contact_email: false,
  suspicious_email: false,
  health_email: false,
};

export const TEAM_ALERTS: ReadonlyArray<{ key: TeamAlertKey; label: string; hint: string }> = [
  { key: "contact_email", label: "Message de contact reçu", hint: "Un email dès qu'un message arrive par le formulaire de contact." },
  { key: "suspicious_email", label: "Compte suspect signalé", hint: "Un email dès que la détection automatique signale un compte." },
  { key: "health_email", label: "Voyant du site passé au rouge", hint: "Un email dès qu'un contrôle automatique du site lève une alerte." },
];

export function readTeamAlertPrefs(row: Partial<Record<TeamAlertKey, unknown>> | null | undefined): TeamAlertPrefs {
  return {
    contact_email: row?.contact_email === true,
    suspicious_email: row?.suspicious_email === true,
    health_email: row?.health_email === true,
  };
}
