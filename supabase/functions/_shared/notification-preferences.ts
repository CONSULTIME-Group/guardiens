// Lot X3c (13/10/2026) : interrupteurs « Notifications email » des réglages
// (table notification_preferences), lus à un seul endroit.
//
//   - email_new_application : « Nouvelles candidatures »
//   - email_messages        : « Messages »
//   - email_reminders       : « Rappels de garde »
//   - message_email_delay   : « Délai avant email (messages non lus) »
//       30min, 1h, 3h : au plus un email de message par conversation dans
//       cette fenêtre ; never : aucun email de message.
//
// email_sitter_suggestions et email_review_prompts sont déjà reportés sur
// email_preferences.product_emails par les réglages (patch_my_email_preferences),
// la porte de catégorie de send-transactional-email les applique.
//
// Module pur (aucune variable globale Deno) : il est aussi chargé par Vitest.
// Une absence de ligne vaut les valeurs par défaut de la table (tout activé, 30 min).

// deno-lint-ignore no-explicit-any
type Client = any;

export type NotificationPreferenceColumn =
  | "email_new_application"
  | "email_messages"
  | "email_reminders";

export interface NotificationPreferencesRow {
  email_new_application?: boolean | null;
  email_messages?: boolean | null;
  email_reminders?: boolean | null;
  message_email_delay?: string | null;
}

/** Template d'email vers l'interrupteur des réglages qui le commande. */
export const TEMPLATE_NOTIFICATION_PREFERENCE: Readonly<Record<string, NotificationPreferenceColumn>> = {
  "new-application": "email_new_application",
  "first-application-received": "email_new_application",
  "owner-pending-application-nudge": "email_new_application",
  "new-message": "email_messages",
  "unread-messages-reminder": "email_messages",
  "sit-reminder-j7": "email_reminders",
  "sit-reminder-j48": "email_reminders",
};

/** Templates soumis au délai des messages non lus. */
export const MESSAGE_DELAY_TEMPLATES: ReadonlySet<string> = new Set([
  "new-message",
  "unread-messages-reminder",
]);

export const NOTIFICATION_PREFERENCE_COLUMNS =
  "email_new_application, email_messages, email_reminders, message_email_delay";

const DELAY_MS: Readonly<Record<string, number>> = {
  "30min": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
};

export const DEFAULT_MESSAGE_DELAY_MS = DELAY_MS["30min"];

export function notificationPreferenceFor(templateName: string): NotificationPreferenceColumn | null {
  return TEMPLATE_NOTIFICATION_PREFERENCE[templateName] ?? null;
}

/**
 * Fenêtre entre deux emails de message d'une même conversation, en ms.
 * null : le membre a choisi « Jamais ». Valeur inconnue : 30 min.
 */
export function messageEmailWindowMs(row: NotificationPreferencesRow | null | undefined): number | null {
  const raw = (row?.message_email_delay ?? "30min").trim();
  if (raw === "never") return null;
  return DELAY_MS[raw] ?? DEFAULT_MESSAGE_DELAY_MS;
}

export interface PreferenceVerdict {
  allowed: boolean;
  /** Réglage qui retient l'email, null quand il part. */
  preference: NotificationPreferenceColumn | "message_email_delay" | null;
}

/** Verdict pur : l'email part-il au vu des réglages du destinataire ? */
export function checkNotificationPreference(
  templateName: string,
  row: NotificationPreferencesRow | null | undefined,
): PreferenceVerdict {
  const column = notificationPreferenceFor(templateName);
  if (!column || !row) return { allowed: true, preference: null };
  if (row[column] === false) return { allowed: false, preference: column };
  if (MESSAGE_DELAY_TEMPLATES.has(templateName) && messageEmailWindowMs(row) === null) {
    return { allowed: false, preference: "message_email_delay" };
  }
  return { allowed: true, preference: null };
}

export interface PreferenceRead {
  row: NotificationPreferencesRow | null;
  error: string | null;
}

/** Lecture par identifiant de membre. */
export async function readNotificationPreferences(client: Client, userId: string | null | undefined): Promise<PreferenceRead> {
  if (!userId) return { row: null, error: null };
  const { data, error } = await client
    .from("notification_preferences")
    .select(NOTIFICATION_PREFERENCE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { row: null, error: String(error.message ?? error) };
  return { row: (data as NotificationPreferencesRow | null) ?? null, error: null };
}

/** Échappe une adresse pour un ilike exact (« _ » et « % » sont des jokers). */
export function exactIlikePattern(email: string): string {
  return email.trim().toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Lecture par adresse email (send-transactional-email ne reçoit que l'adresse). */
export async function readNotificationPreferencesByEmail(client: Client, email: string | null | undefined): Promise<PreferenceRead> {
  const target = (email ?? "").trim().toLowerCase();
  if (!target) return { row: null, error: null };
  const { data: rows, error } = await client
    .from("profiles")
    .select("id, email")
    .ilike("email", exactIlikePattern(target))
    .limit(2);
  if (error) return { row: null, error: String(error.message ?? error) };
  const match = ((rows as Array<{ id: string; email: string | null }> | null) ?? [])
    .find((r) => (r.email ?? "").trim().toLowerCase() === target);
  if (!match) return { row: null, error: null };
  return readNotificationPreferences(client, match.id);
}
