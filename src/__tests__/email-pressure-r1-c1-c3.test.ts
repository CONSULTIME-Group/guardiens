/**
 * Lots R1, C1, C2, C3 (11/10/2026) : pression email.
 *
 * R1 : une seule relance par destinataire et par jour, tous crons confondus,
 *      et les relances de messages non lus groupées par destinataire.
 * C1 : un email marketing (catégorie product) ne franchit jamais le plafond.
 * C2 : aucun email non transactionnel vers un compte suspendu ou inactif.
 * C3 : un refus d'identité n'est enregistré et notifié qu'une fois.
 *
 * Mesures du 11/10/2026 : 39 emails en 10 jours à une propriétaire avec
 * 5 candidatures ; 28 destinataires au-delà du plafond marketing hebdomadaire ;
 * un compte suspendu jusqu'en 2036 encore relancé ; 9 refus et 9 emails en
 * 16 secondes pour un même dossier.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  createReminderSlot,
  isReminderLog,
  REMINDER_SLOT_HOURS,
} from "../../supabase/functions/_shared/reminder-daily-slot";
import { isAccountBlockedForMarketing } from "../../supabase/functions/_shared/account-email-block";
import { decideOverTtl, resolveDeferral } from "../../supabase/functions/_shared/email-cap";

type Row = { template_name: string; metadata?: { idempotency_key?: string } | null };

function fakeClient(rows: Row[], opts: { error?: boolean } = {}) {
  const calls: Array<Record<string, unknown>> = [];
  return {
    calls,
    from(table: string) {
      const q: Record<string, unknown> = { table };
      const chain = {
        select: () => chain,
        eq: (k: string, v: unknown) => { q[`eq:${k}`] = v; return chain; },
        in: (k: string, v: unknown) => { q[`in:${k}`] = v; return chain; },
        gte: (k: string, v: unknown) => { q[`gte:${k}`] = v; return chain; },
        limit: async () => {
          calls.push(q);
          return opts.error ? { data: null, error: { message: "boom" } } : { data: rows, error: null };
        },
      };
      return chain;
    },
  };
}

describe("R1, famille relance", () => {
  it("reconnaît les relances et laisse passer les notifications immédiates", () => {
    expect(isReminderLog("unread-messages-reminder", null)).toBe(true);
    expect(isReminderLog("owner-pending-application-nudge", "pending-app-x")).toBe(true);
    expect(isReminderLog("discussion-stalled-nudge", null)).toBe(true);
    expect(isReminderLog("new-message", "reminder-conv-1")).toBe(true);
    expect(isReminderLog("new-message", "msg_123")).toBe(false);
    expect(isReminderLog("new-application", null)).toBe(false);
  });
});

describe("R1, créneau quotidien", () => {
  it("libre sans relance récente, pris après une relance du jour", async () => {
    const slot = createReminderSlot(fakeClient([{ template_name: "new-message", metadata: { idempotency_key: "msg_1" } }]));
    expect(await slot.isTaken("Laurence@Example.fr")).toBe(false);
    slot.take("laurence@example.fr");
    expect(await slot.isTaken("LAURENCE@example.fr")).toBe(true);
  });

  it("pris si une relance est déjà partie dans la fenêtre", async () => {
    const client = fakeClient([{ template_name: "owner-pending-application-nudge", metadata: { idempotency_key: "pending-app-1" } }]);
    const slot = createReminderSlot(client, REMINDER_SLOT_HOURS, Date.parse("2026-10-11T12:00:00Z"));
    expect(await slot.isTaken("a@b.fr")).toBe(true);
    const q = client.calls[0];
    expect(q["eq:recipient_email"]).toBe("a@b.fr");
    expect(q["in:status"]).toEqual(["sent", "pending", "deferred"]);
    expect(q["gte:created_at"]).toBe("2026-10-10T16:00:00.000Z");
  });

  it("une lecture en échec vaut créneau pris (une relance de moins plutôt qu'une rafale)", async () => {
    const slot = createReminderSlot(fakeClient([], { error: true }));
    expect(await slot.isTaken("a@b.fr")).toBe(true);
  });

  it("une adresse vide ne déclenche jamais d'envoi", async () => {
    const slot = createReminderSlot(fakeClient([]));
    expect(await slot.isTaken("")).toBe(true);
  });

  it("câblage dans les trois crons de relance", () => {
    for (const f of [
      "supabase/functions/send-message-reminders/index.ts",
      "supabase/functions/remind-unread-messages/index.ts",
      "supabase/functions/nudge-owner-pending-application/index.ts",
    ]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toContain("createReminderSlot(");
      expect(src, f).toContain("slot.isTaken(");
      expect(src, f).toContain("slot.take(");
    }
  });

  it("relances de messages non lus groupées par destinataire", () => {
    const src = readFileSync("supabase/functions/remind-unread-messages/index.ts", "utf8");
    expect(src).toContain("byRecipient");
    expect(src).toContain("unread-reminder-grouped-");
    expect(src).toContain('.in("id", items.map((i) => i.convId))');
  });
});

describe("C1, plafond marketing", () => {
  it("un email marketing au-delà de la durée de vie est annulé", () => {
    expect(decideOverTtl({ templateName: "relance-profil-incomplet", reason: "frequency_cap_category_week", category: "product" })).toBe("cancel");
    const base = new Date("2026-10-11T08:00:00Z");
    const r = resolveDeferral({
      templateName: "entraide-ligne-relance",
      reason: "frequency_cap_category_week",
      scheduledFor: new Date(base.getTime() + 7 * 86400_000),
      firstEnqueuedAt: base,
      category: "product",
    });
    expect(r.action).toBe("cancel");
  });

  it("les autres catégories gardent leur arbitrage", () => {
    expect(decideOverTtl({ templateName: "mission-help-needed", reason: "frequency_cap_category_week", category: "alert" })).toBe("send_now");
    expect(decideOverTtl({ templateName: "sitter-daily-digest", reason: "frequency_cap_category_week", category: "digest" })).toBe("cancel");
  });

  it("le sender transmet la catégorie", () => {
    const src = readFileSync("supabase/functions/send-transactional-email/index.ts", "utf8");
    expect(src).toMatch(/resolveDeferral\(\{[\s\S]{0,300}category,/);
  });
});

describe("C2, compte suspendu ou inactif", () => {
  const now = new Date("2026-10-11T12:00:00Z");
  it("bloque une suspension en cours ou sans fin", () => {
    expect(isAccountBlockedForMarketing({ account_status: "active", suspended_at: "2026-09-03T17:36:46Z", suspended_until: "2036-08-31T17:36:46Z" }, now)).toBe(true);
    expect(isAccountBlockedForMarketing({ account_status: "active", suspended_at: "2026-09-03T17:36:46Z", suspended_until: null }, now)).toBe(true);
  });
  it("laisse passer une suspension terminée et un compte actif", () => {
    expect(isAccountBlockedForMarketing({ account_status: "active", suspended_at: "2026-09-03T00:00:00Z", suspended_until: "2026-09-10T00:00:00Z" }, now)).toBe(false);
    expect(isAccountBlockedForMarketing({ account_status: "active", suspended_at: null }, now)).toBe(false);
    expect(isAccountBlockedForMarketing(null, now)).toBe(false);
  });
  it("bloque un statut autre qu'actif", () => {
    expect(isAccountBlockedForMarketing({ account_status: "deleted" }, now)).toBe(true);
  });
  it("le sender vérifie le statut avant tout email non transactionnel", () => {
    const src = readFileSync("supabase/functions/send-transactional-email/index.ts", "utf8");
    expect(src).toContain("isAccountBlockedForMarketing(");
    expect(src).toContain("suppressed_reason: 'account_suspended'");
  });
});

describe("C3, refus d'identité unique", () => {
  it("transition atomique côté serveur", () => {
    const src = readFileSync("supabase/functions/admin-manage-identity-verification/index.ts", "utf8");
    expect(src).toContain('identity_verification_status.neq.rejected');
    expect(src).toContain('already: "rejected"');
  });
  it("bouton verrouillé côté admin", () => {
    const src = readFileSync("src/pages/admin/AdminVerifications.tsx", "utf8");
    expect(src).toContain("rejectingRef.current");
    expect(src).toContain("Refus en cours...");
  });
});
