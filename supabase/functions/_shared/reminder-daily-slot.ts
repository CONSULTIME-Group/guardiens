// Lot R1 (11/10/2026) : une seule relance par destinataire et par jour.
//
// Trois crons relançaient la même personne pour les mêmes échanges, une fois
// par conversation et une fois par candidature, sans plafond (catégorie
// transactionnelle). Cas réel : une propriétaire avec 5 candidatures a reçu
// 39 emails en 10 jours.
//
// Famille « relance » : unread-messages-reminder, owner-pending-application-nudge,
// discussion-stalled-nudge, et new-message quand sa clé commence par
// « reminder- » (send-message-reminders). Les notifications immédiates de
// nouveaux messages ne comptent pas et ne sont jamais bloquées.

// deno-lint-ignore no-explicit-any
type Client = any;

export const REMINDER_SLOT_HOURS = 20;

export const REMINDER_TEMPLATES: ReadonlySet<string> = new Set([
  "unread-messages-reminder",
  "owner-pending-application-nudge",
  "discussion-stalled-nudge",
]);

/** Vrai si la ligne de journal est une relance (statut ignoré ici). */
export function isReminderLog(templateName: string | null | undefined, idempotencyKey: string | null | undefined): boolean {
  const t = (templateName ?? "").trim().toLowerCase();
  if (REMINDER_TEMPLATES.has(t)) return true;
  return t === "new-message" && String(idempotencyKey ?? "").startsWith("reminder-");
}

export interface ReminderSlot {
  /** Vrai si une relance est déjà partie (ou en file) vers cette adresse dans la fenêtre. */
  isTaken(email: string | null | undefined): Promise<boolean>;
  /** À appeler après un envoi accepté (sent ou deferred) dans le même passage. */
  take(email: string | null | undefined): void;
}

/**
 * Créneau quotidien partagé entre les crons de relance. Lit email_send_log
 * (sent, pending, deferred) une fois par adresse et garde le résultat pour le
 * passage. En cas d'erreur de lecture, le créneau est considéré pris : mieux
 * vaut une relance de moins qu'une rafale.
 */
export function createReminderSlot(client: Client, hours = REMINDER_SLOT_HOURS, now = Date.now()): ReminderSlot {
  const since = new Date(now - hours * 3600 * 1000).toISOString();
  const known = new Map<string, boolean>();
  const norm = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();
  return {
    async isTaken(email) {
      const key = norm(email);
      if (!key) return true;
      const cached = known.get(key);
      if (cached !== undefined) return cached;
      const { data, error } = await client
        .from("email_send_log")
        .select("template_name, metadata")
        // Adresses enregistrées en minuscules (vérifié sur 60 jours le 11/10/2026).
        .eq("recipient_email", key)
        .in("status", ["sent", "pending", "deferred"])
        .in("template_name", [...REMINDER_TEMPLATES, "new-message"])
        .gte("created_at", since)
        .limit(200);
      if (error) {
        console.error("[reminder-daily-slot] lookup failed", error.message);
        known.set(key, true);
        return true;
      }
      const taken = (data ?? []).some((r: { template_name?: string | null; metadata?: { idempotency_key?: string | null } | null }) =>
        isReminderLog(r.template_name, r.metadata?.idempotency_key ?? null)
      );
      known.set(key, taken);
      return taken;
    },
    take(email) {
      const key = norm(email);
      if (key) known.set(key, true);
    },
  };
}
