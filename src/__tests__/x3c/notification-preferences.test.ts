/**
 * Lot X3c, D-04 : les interrupteurs « Notifications email » des réglages
 * (notification_preferences) sont lus par un module partagé et appliqués
 * par les fonctions d'envoi.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkNotificationPreference,
  DEFAULT_MESSAGE_DELAY_MS,
  exactIlikePattern,
  messageEmailWindowMs,
  notificationPreferenceFor,
  readNotificationPreferences,
  readNotificationPreferencesByEmail,
} from "../../../supabase/functions/_shared/notification-preferences.ts";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("correspondance template vers réglage", () => {
  it("Nouvelles candidatures, Messages, Rappels de garde", () => {
    expect(notificationPreferenceFor("new-application")).toBe("email_new_application");
    expect(notificationPreferenceFor("first-application-received")).toBe("email_new_application");
    expect(notificationPreferenceFor("owner-pending-application-nudge")).toBe("email_new_application");
    expect(notificationPreferenceFor("new-message")).toBe("email_messages");
    expect(notificationPreferenceFor("unread-messages-reminder")).toBe("email_messages");
    expect(notificationPreferenceFor("sit-reminder-j7")).toBe("email_reminders");
    expect(notificationPreferenceFor("sit-reminder-j48")).toBe("email_reminders");
  });

  it("les emails de compte et de garde confirmée ne dépendent d'aucun interrupteur", () => {
    for (const t of ["account-deleted", "unsubscribe-link", "sit-confirmed", "application-accepted", "identity-verified"]) {
      expect(notificationPreferenceFor(t)).toBeNull();
      expect(checkNotificationPreference(t, { email_messages: false, email_new_application: false, email_reminders: false }).allowed).toBe(true);
    }
  });
});

describe("verdict", () => {
  it("sans ligne de réglages, tout part (valeurs par défaut de la table)", () => {
    expect(checkNotificationPreference("new-message", null).allowed).toBe(true);
  });

  it("un interrupteur coupé retient l'email et nomme le réglage", () => {
    const v = checkNotificationPreference("new-application", { email_new_application: false });
    expect(v.allowed).toBe(false);
    expect(v.preference).toBe("email_new_application");
    expect(checkNotificationPreference("sit-reminder-j48", { email_reminders: false }).preference).toBe("email_reminders");
    expect(checkNotificationPreference("new-message", { email_messages: false }).preference).toBe("email_messages");
  });

  it("le délai « Jamais » retient les emails de message seulement", () => {
    const row = { email_messages: true, message_email_delay: "never" };
    expect(checkNotificationPreference("new-message", row).preference).toBe("message_email_delay");
    expect(checkNotificationPreference("unread-messages-reminder", row).allowed).toBe(false);
    expect(checkNotificationPreference("new-application", row).allowed).toBe(true);
  });

  it("fenêtre entre deux emails d'une conversation", () => {
    expect(messageEmailWindowMs(null)).toBe(DEFAULT_MESSAGE_DELAY_MS);
    expect(messageEmailWindowMs({ message_email_delay: "30min" })).toBe(30 * 60 * 1000);
    expect(messageEmailWindowMs({ message_email_delay: "1h" })).toBe(60 * 60 * 1000);
    expect(messageEmailWindowMs({ message_email_delay: "3h" })).toBe(3 * 60 * 60 * 1000);
    expect(messageEmailWindowMs({ message_email_delay: "never" })).toBeNull();
    expect(messageEmailWindowMs({ message_email_delay: "autre" })).toBe(DEFAULT_MESSAGE_DELAY_MS);
  });
});

function fakeClient(tables: Record<string, { data: unknown; error: unknown }>) {
  const seen: Array<{ table: string; ops: Array<[string, unknown]> }> = [];
  return {
    seen,
    from(table: string) {
      const entry = { table, ops: [] as Array<[string, unknown]> };
      seen.push(entry);
      const res = tables[table] ?? { data: null, error: null };
      const b: any = {
        select: (c: unknown) => { entry.ops.push(["select", c]); return b; },
        eq: (c: string, v: unknown) => { entry.ops.push([`eq:${c}`, v]); return b; },
        ilike: (c: string, v: unknown) => { entry.ops.push([`ilike:${c}`, v]); return b; },
        limit: (n: unknown) => { entry.ops.push(["limit", n]); return Promise.resolve(res); },
        maybeSingle: () => Promise.resolve(res),
      };
      return b;
    },
  };
}

describe("lectures", () => {
  it("par identifiant", async () => {
    const client = fakeClient({ notification_preferences: { data: { email_messages: false }, error: null } });
    const r = await readNotificationPreferences(client, "u1");
    expect(r.row).toEqual({ email_messages: false });
    expect(client.seen[0].ops).toContainEqual(["eq:user_id", "u1"]);
  });

  it("par adresse, avec un ilike exact (jokers échappés)", async () => {
    expect(exactIlikePattern(" Jean_Paul%@Ex.fr ")).toBe("jean\\_paul\\%@ex.fr");
    const client = fakeClient({
      profiles: { data: [{ id: "u2", email: "Jean_Paul@ex.fr" }], error: null },
      notification_preferences: { data: { email_new_application: false }, error: null },
    });
    const r = await readNotificationPreferencesByEmail(client, "jean_paul@ex.fr");
    expect(r.row).toEqual({ email_new_application: false });
    expect(client.seen[1].ops).toContainEqual(["eq:user_id", "u2"]);
  });

  it("une erreur de lecture est rendue, jamais avalée", async () => {
    const client = fakeClient({ notification_preferences: { data: null, error: { message: "boom" } } });
    const r = await readNotificationPreferences(client, "u1");
    expect(r.error).toBe("boom");
    expect(r.row).toBeNull();
  });
});

describe("branchement des fonctions d'envoi", () => {
  const IMPORT = "../_shared/notification-preferences.ts";

  it("send-transactional-email retient l'email avant toute écriture pending", () => {
    const src = read("supabase/functions/send-transactional-email/index.ts");
    expect(src).toContain(IMPORT);
    expect(src).toContain("readNotificationPreferencesByEmail(supabase, effectiveRecipient)");
    expect(src).toContain("reason: 'notification_preference'");
    expect(src.indexOf("readNotificationPreferencesByEmail(supabase")).toBeLessThan(src.indexOf("acquireMemberSendClaim(supabase"));
  });

  it("notify-new-message suit « Messages » et la fenêtre choisie", () => {
    const src = read("supabase/functions/notify-new-message/index.ts");
    expect(src).toContain(IMPORT);
    expect(src).toContain("checkNotificationPreference('new-message', prefRead.row)");
    expect(src).toContain("messageEmailWindowMs(prefRead.row)");
    expect(src).not.toMatch(/30 \* 60 \* 1000/);
  });

  it("les deux crons de relance lisent le module partagé", () => {
    for (const f of ["send-message-reminders", "remind-unread-messages"]) {
      const src = read(`supabase/functions/${f}/index.ts`);
      expect(src, f).toContain(IMPORT);
      expect(src, f).toContain("readNotificationPreferences(supabase, recipientId)");
      expect(src, f).not.toMatch(/from\("notification_preferences"\)/);
    }
  });
});
