/**
 * Lot J2c : suspension et résiliation motivées depuis l'espace admin.
 * « Prévenir et demander ses observations » envoie un avertissement sans
 * toucher au compte ; « Effet immédiat (cas de l'article 11.4) » suspend puis
 * envoie la décision. Les deux passent par send-transactional-email avec une
 * clé d'idempotence et se journalisent.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  executeAccountMeasure,
  validateAccountMeasure,
  accountMeasureEmailData,
  accountMeasureIdempotencyKey,
  memberEmailReference,
  type AccountMeasureInput,
  type MeasureClient,
} from "@/lib/admin/accountMeasure";
import { findModerationRule } from "../../../supabase/functions/_shared/moderation-rules";
import { getEmailCategory } from "../../../supabase/functions/_shared/email-categories";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

type Call = { kind: string; table?: string; payload?: any; name?: string; body?: any };

function fakeClient(opts: { updateError?: string; invokeResult?: any; invokeError?: string } = {}) {
  const calls: Call[] = [];
  const client: MeasureClient = {
    from: (table: string) => {
      const chain: any = {
        update: (payload: any) => {
          calls.push({ kind: "update", table, payload });
          return { eq: () => Promise.resolve({ error: opts.updateError ? { message: opts.updateError } : null }) };
        },
        upsert: (payload: any) => { calls.push({ kind: "upsert", table, payload }); return Promise.resolve({ error: null }); },
        insert: (payload: any) => { calls.push({ kind: "insert", table, payload }); return Promise.resolve({ error: null }); },
      };
      return chain;
    },
    functions: {
      invoke: (name: string, { body }: { body: any }) => {
        calls.push({ kind: "invoke", name, body });
        if (opts.invokeError) return Promise.resolve({ data: null, error: { message: opts.invokeError } });
        return Promise.resolve({ data: opts.invokeResult ?? { success: true, sent: true }, error: null });
      },
    },
  };
  return { client, calls };
}

const NOW = new Date("2026-10-14T10:00:00Z");
const base: AccountMeasureInput = {
  measureId: "m-1",
  userId: "11111111-2222-3333-4444-555555555555",
  firstName: "Camille",
  measure: "suspend",
  mode: "notice",
  ruleId: "cgu-10-commercial",
  facts: "Démarchage commercial adressé à trois membres par messagerie.",
  durationDays: 7,
  observationDays: 10,
  origin: "initiative",
  automated: "none",
};

describe("J2c, mode « Prévenir et demander ses observations »", () => {
  it("aucun changement de compte, email d'avertissement avec délai, journal moderation_notice", async () => {
    const { client, calls } = fakeClient();
    const r = await executeAccountMeasure(client, base, "admin-1", NOW);
    expect(r).toMatchObject({ ok: true, applied: false, email: { sent: true } });
    expect(calls.find((c) => c.kind === "update")).toBeUndefined();
    const inv = calls.find((c) => c.kind === "invoke")!;
    expect(inv.name).toBe("send-transactional-email");
    expect(inv.body.templateName).toBe("moderation-decision");
    expect(inv.body.recipientEmail).toBe(memberEmailReference(base.userId));
    expect(inv.body.idempotencyKey).toBe(`moderation-notice-${base.userId}-m-1`);
    expect(inv.body.templateData).toMatchObject({
      kind: "notice", action: "suspend", observationDays: 10, observationUntil: "2026-10-24",
      facts: base.facts, ruleStatement: findModerationRule("cgu-10-commercial")!.statement,
      origin: "initiative", automated: "none",
    });
    const log = calls.find((c) => c.kind === "insert" && c.table === "admin_action_logs")!;
    expect(log.payload).toMatchObject({ action: "moderation_notice", target_type: "profile", target_id: base.userId, admin_id: "admin-1" });
    expect(log.payload.metadata).toMatchObject({ mode: "notice", rule_id: "cgu-10-commercial", observation_days: 10, email_sent: true });
  });

  it("délai d'observations borné", () => {
    expect(validateAccountMeasure({ ...base, observationDays: 0 })).toMatch(/délai/);
    expect(validateAccountMeasure({ ...base, observationDays: 61 })).toMatch(/délai/);
    expect(validateAccountMeasure(base)).toBeNull();
  });
});

describe("J2c, mode « Effet immédiat (cas de l'article 11.4) »", () => {
  const immediate: AccountMeasureInput = { ...base, mode: "immediate", ruleId: "cgu-11-4-remuneration", durationDays: 30 };

  it("refusé hors des cas de l'article 11.4", () => {
    expect(validateAccountMeasure({ ...immediate, ruleId: "cgu-10-commercial" })).toMatch(/11\.4/);
  });

  it("suspend d'abord, puis envoie la décision conservatoire et journalise", async () => {
    const { client, calls } = fakeClient();
    const r = await executeAccountMeasure(client, immediate, "admin-1", NOW);
    expect(r).toMatchObject({ ok: true, applied: true, email: { sent: true } });
    const order = calls.map((c) => `${c.kind}:${c.table ?? c.name}`);
    expect(order.indexOf("update:profiles")).toBeLessThan(order.indexOf("invoke:send-transactional-email"));
    const upd = calls.find((c) => c.kind === "update")!.payload;
    expect(upd).toMatchObject({
      account_status: "suspended",
      suspended_at: NOW.toISOString(),
      suspended_by: "admin-1",
      suspended_until: "2026-11-13T10:00:00.000Z",
    });
    expect(upd.suspension_reason).toContain(base.facts);
    const inv = calls.find((c) => c.kind === "invoke")!;
    expect(inv.body.idempotencyKey).toBe(`moderation-suspend-${base.userId}-m-1`);
    expect(inv.body.templateData).toMatchObject({
      kind: "decision", action: "suspend", targetType: "profile", durationDays: 30, untilDate: "2026-11-13", conservatory: true,
    });
    const log = calls.find((c) => c.kind === "insert" && c.table === "admin_action_logs")!;
    expect(log.payload.action).toBe("suspend_account");
    expect(log.payload.metadata).toMatchObject({ mode: "immediate", duration_days: 30 });
  });

  it("suspension le temps de l'examen : aucune date de fin", () => {
    const d = accountMeasureEmailData({ ...immediate, durationDays: null }, NOW);
    expect(d.durationDays).toBeNull();
    expect(d).not.toHaveProperty("untilDate");
  });

  it("une mesure non appliquée n'envoie aucun email", async () => {
    const { client, calls } = fakeClient({ updateError: "refus" });
    const r = await executeAccountMeasure(client, immediate, "admin-1", NOW);
    expect(r.ok).toBe(false);
    expect(calls.find((c) => c.kind === "invoke")).toBeUndefined();
  });

  it("un email refusé par les garde-fous est signalé à l'équipe", async () => {
    const { client } = fakeClient({ invokeResult: { success: false, reason: "email_suppressed" } });
    const r = await executeAccountMeasure(client, immediate, "admin-1", NOW);
    expect(r).toMatchObject({ ok: true, applied: true, email: { sent: false, reason: "email_suppressed" } });
  });
});

describe("J2c, résiliation", () => {
  it("après un avertissement, le compte est fermé et la décision part", async () => {
    const input: AccountMeasureInput = { ...base, measure: "terminate", mode: "after_notice", priorNoticeAt: "2026-10-01T09:00:00Z" };
    const { client, calls } = fakeClient();
    const r = await executeAccountMeasure(client, input, "admin-1", NOW);
    expect(r.ok).toBe(true);
    expect(calls.find((c) => c.kind === "update")!.payload).toMatchObject({ account_status: "deleted", suspended_until: null });
    const inv = calls.find((c) => c.kind === "invoke")!;
    expect(inv.body.templateData).toMatchObject({ kind: "decision", action: "terminate" });
    expect(inv.body.templateData).not.toHaveProperty("conservatory");
    expect(accountMeasureIdempotencyKey(input)).toBe(`moderation-terminate-${base.userId}-m-1`);
    expect(calls.find((c) => c.table === "admin_action_logs")!.payload.action).toBe("terminate_account");
  });

  it("décider après observations demande un avertissement enregistré", () => {
    expect(validateAccountMeasure({ ...base, mode: "after_notice", priorNoticeAt: null })).toMatch(/avertissement/);
  });
});

describe("J2c, garde-fous d'envoi et écrans", () => {
  it("moderation-decision reste transactionnel", () => {
    expect(getEmailCategory("moderation-decision")).toBe("transactional");
  });

  it("les deux écrans de suspension passent par le dialogue motivé, sans écriture directe", () => {
    const users = read("src/pages/admin/AdminUsers.tsx");
    expect(users).toContain("<AccountMeasureDialog");
    expect(users).toContain('onTerminate: () => openMeasure(u, "terminate")');
    expect(users).not.toContain('.update({ account_status: "suspended" })');
    const card = read("src/components/admin/signals/SuspiciousAccountCard.tsx");
    expect(card).toContain("<AccountMeasureDialog");
    expect(card).toContain('automated="detection"');
    expect(card).not.toMatch(/update\(\{ suspended_until/);
  });

  it("le bouton est verrouillé pendant l'appel", () => {
    const dlg = read("src/components/admin/moderation/AccountMeasureDialog.tsx");
    expect(dlg).toContain("disabled={busy || !!invalid}");
    expect(dlg).toContain("if (busy || invalid) return;");
  });

  it("la réactivation efface la suspension posée", () => {
    expect(read("src/pages/admin/AdminUsers.tsx")).toContain(
      '.update({ account_status: "active", suspended_at: null, suspended_by: null, suspended_until: null })',
    );
  });
});
