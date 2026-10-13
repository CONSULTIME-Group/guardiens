/**
 * Lot X2 : circuit partagé d'effacement admin (supabase/functions/_shared/admin-erasure.ts).
 * Client Supabase simulé : chaque appel est journalisé (table, opération, données, filtres).
 */
import { describe, it, expect, vi } from "vitest";
import {
  ADMIN_REQUEST_DELAY_DAYS,
  executeAdminErasure,
  recordDeletionRequest,
  type ErasureDeps,
} from "../../../supabase/functions/_shared/admin-erasure.ts";

type Call = {
  table: string;
  op: "select" | "insert" | "update" | "upsert" | "delete";
  payload?: Record<string, unknown>;
  options?: unknown;
  filters: Array<[string, string, unknown]>;
};

type Responder = (call: Call) => { data: unknown; error: { message: string } | null };

function fakeClient(respond: Responder = () => ({ data: null, error: null })) {
  const calls: Call[] = [];
  const builder = (call: Call): any => {
    const b: any = {
      select: () => b,
      eq: (c: string, v: unknown) => { call.filters.push(["eq", c, v]); return b; },
      neq: (c: string, v: unknown) => { call.filters.push(["neq", c, v]); return b; },
      is: (c: string, v: unknown) => { call.filters.push(["is", c, v]); return b; },
      in: (c: string, v: unknown) => { call.filters.push(["in", c, v]); return b; },
      order: () => b,
      limit: () => b,
      maybeSingle: () => Promise.resolve(respond(call)),
      single: () => Promise.resolve(respond(call)),
      then: (res: any, rej: any) => Promise.resolve(respond(call)).then(res, rej),
    };
    return b;
  };
  const client = {
    from: (table: string) => {
      const start = (op: Call["op"], payload?: Record<string, unknown>, options?: unknown) => {
        const call: Call = { table, op, payload, options, filters: [] };
        calls.push(call);
        return builder(call);
      };
      return {
        select: () => start("select"),
        insert: (p: Record<string, unknown>) => start("insert", p),
        update: (p: Record<string, unknown>) => start("update", p),
        upsert: (p: Record<string, unknown>, o?: unknown) => start("upsert", p, o),
        delete: () => start("delete"),
      };
    },
  };
  return { client, calls };
}

const OUTCOME = {
  userId: "u-1",
  email: "camille@example.fr",
  acknowledged: true,
  suppressed: true,
  storageRemoved: 3,
  storageFailures: [],
  authNeutralized: true,
  archivedSits: 0,
  cancelledMissions: 0,
};

function deps(overrides: Partial<ErasureDeps> = {}): ErasureDeps {
  return {
    anonymize: vi.fn(async () => OUTCOME) as unknown as ErasureDeps["anonymize"],
    finalize: vi.fn(async () => ({ acknowledged: false, suppressed: true })) as unknown as ErasureDeps["finalize"],
    countCommitments: vi.fn(async () => ({ sits: 0, applications: 0, total: 0 })) as unknown as ErasureDeps["countCommitments"],
    ...overrides,
  };
}

const ADR = "account_deletion_requests";

describe("executeAdminErasure", () => {
  it("refuse sans rien écrire quand un engagement est actif", async () => {
    const { client, calls } = fakeClient();
    const d = deps({
      countCommitments: vi.fn(async () => ({ sits: 1, applications: 2, total: 3 })) as unknown as ErasureDeps["countCommitments"],
    });
    const res = await executeAdminErasure(client, {
      userId: "u-1", email: "camille@example.fr", callerId: "admin-1", origin: "admin_users",
    }, d);
    expect(res).toEqual({ kind: "blocked", confirmedSits: 1, pendingApplications: 2 });
    expect(d.anonymize).not.toHaveBeenCalled();
    expect(calls.filter((c) => c.op !== "select")).toHaveLength(0);
  });

  it("trace la demande en completed, anonymise par le chemin partagé et journalise", async () => {
    const { client, calls } = fakeClient((call) =>
      call.table === ADR && call.op === "upsert" ? { data: { id: "req-1" }, error: null } : { data: null, error: null },
    );
    const d = deps();
    const res = await executeAdminErasure(client, {
      userId: "u-1", email: "Camille@Example.fr", callerId: "admin-1", origin: "admin_users",
      notes: "Effacement depuis la fiche membre (admin)",
    }, d);

    expect(res.kind).toBe("done");
    const upsert = calls.find((c) => c.table === ADR && c.op === "upsert");
    expect(upsert?.payload).toMatchObject({
      user_id: "u-1",
      requester_email: "camille@example.fr",
      source: "admin",
      status: "completed",
      processed_by: "admin-1",
      notes: "Effacement depuis la fiche membre (admin)",
    });
    expect(upsert?.options).toEqual({ onConflict: "user_id" });
    expect(d.anonymize).toHaveBeenCalledWith(client, "u-1", expect.objectContaining({ source: "admin_users" }));

    const log = calls.find((c) => c.table === "admin_action_logs" && c.op === "insert");
    expect(log?.payload).toMatchObject({
      admin_id: "admin-1",
      action: "gdpr_account_erasure",
      target_id: "u-1",
    });
    expect((log?.payload?.metadata as Record<string, unknown>).origin).toBe("admin_users");
    expect((log?.payload?.metadata as Record<string, unknown>).request_id).toBe("req-1");
    // Ordre : trace d'abord, journal ensuite.
    expect(calls.indexOf(upsert!)).toBeLessThan(calls.indexOf(log!));
  });

  it("passe en completed la demande enregistrée transmise par requestId", async () => {
    const { client, calls } = fakeClient();
    const res = await executeAdminErasure(client, {
      userId: "u-1", email: "camille@example.fr", callerId: "admin-1", origin: "admin_gdpr_request",
      requestId: "req-pending",
    }, deps());
    expect(res.kind).toBe("done");
    const upd = calls.find((c) => c.table === ADR && c.op === "update");
    expect(upd?.payload).toMatchObject({ status: "completed", source: "admin", user_id: "u-1" });
    expect(upd?.filters).toContainEqual(["eq", "id", "req-pending"]);
    // La date de réception n'est jamais réécrite.
    expect(upd?.payload).not.toHaveProperty("requested_at");
    expect(calls.some((c) => c.table === ADR && (c.op === "insert" || c.op === "upsert"))).toBe(false);
  });

  it("rouvre la demande si l'anonymisation échoue", async () => {
    const { client, calls } = fakeClient((call) =>
      call.table === ADR && call.op === "upsert" ? { data: { id: "req-1" }, error: null } : { data: null, error: null },
    );
    const d = deps({
      anonymize: vi.fn(async () => { throw new Error("Anonymisation impossible : boom"); }) as unknown as ErasureDeps["anonymize"],
    });
    await expect(
      executeAdminErasure(client, { userId: "u-1", email: "c@e.fr", callerId: "a", origin: "admin_users" }, d),
    ).rejects.toThrow("Anonymisation impossible");
    const revert = calls.filter((c) => c.table === ADR && c.op === "update").pop();
    expect(revert?.payload).toMatchObject({ status: "pending", processed_at: null });
    expect(revert?.filters).toContainEqual(["eq", "id", "req-1"]);
    expect(calls.some((c) => c.table === "admin_action_logs")).toBe(false);
  });

  it("sans compte : trace completed et blocage de l'adresse", async () => {
    const { client, calls } = fakeClient();
    const d = deps();
    const res = await executeAdminErasure(client, {
      userId: null, email: "inconnu@example.fr", callerId: "a", origin: "admin_gdpr_request",
    }, d);
    expect(res.kind).toBe("no_account");
    const ins = calls.find((c) => c.table === ADR && c.op === "insert");
    expect(ins?.payload).toMatchObject({ user_id: null, status: "completed", source: "admin" });
    expect(d.finalize).toHaveBeenCalled();
    expect(d.anonymize).not.toHaveBeenCalled();
  });
});

describe("recordDeletionRequest", () => {
  it("crée une demande pending, source admin, échéance d'un mois", async () => {
    const now = new Date("2026-10-05T09:00:00.000Z");
    const { client, calls } = fakeClient((call) =>
      call.table === ADR && call.op === "insert"
        ? { data: { id: "req-new", status: "pending", requested_at: now.toISOString(), scheduled_deletion_at: null, user_id: "u-1" }, error: null }
        : { data: null, error: null },
    );
    const res = await recordDeletionRequest(client, {
      email: " Demandeur@Example.fr ", userId: "u-1", callerId: "admin-1", notes: "Message de contact du 05/10", now,
    });

    expect(ADMIN_REQUEST_DELAY_DAYS).toBe(30);
    const ins = calls.find((c) => c.table === ADR && c.op === "insert");
    expect(ins?.payload).toMatchObject({
      user_id: "u-1",
      requester_email: "demandeur@example.fr",
      source: "admin",
      status: "pending",
      requested_at: "2026-10-05T09:00:00.000Z",
      scheduled_deletion_at: "2026-11-04T09:00:00.000Z",
      notes: "Message de contact du 05/10",
    });
    expect(res).toMatchObject({ requestId: "req-new", created: true, status: "pending" });
    const log = calls.find((c) => c.table === "admin_action_logs");
    expect(log?.payload).toMatchObject({ action: "gdpr_request_recorded", admin_id: "admin-1" });
  });

  it("garde la demande déjà en attente sans la dupliquer", async () => {
    const existing = { id: "req-old", status: "pending", requested_at: "2026-10-01T08:00:00Z", scheduled_deletion_at: "2026-10-31T08:00:00Z", user_id: "u-1" };
    const { client, calls } = fakeClient((call) =>
      call.table === ADR && call.op === "select" ? { data: existing, error: null } : { data: null, error: null },
    );
    const res = await recordDeletionRequest(client, { email: "a@b.fr", userId: "u-1", callerId: "admin-1" });
    expect(res).toMatchObject({ requestId: "req-old", created: false, requestedAt: "2026-10-01T08:00:00Z" });
    expect(calls.filter((c) => c.op !== "select")).toHaveLength(0);
  });

  it("rouvre une demande annulée du même compte (UNIQUE user_id)", async () => {
    const existing = { id: "req-x", status: "cancelled", requested_at: "2026-08-01T08:00:00Z", scheduled_deletion_at: "2026-08-08T08:00:00Z", user_id: "u-1" };
    const { client, calls } = fakeClient((call) => {
      if (call.table === ADR && call.op === "select") return { data: existing, error: null };
      if (call.table === ADR && call.op === "update") return { data: { ...existing, status: "pending" }, error: null };
      return { data: null, error: null };
    });
    const res = await recordDeletionRequest(client, { email: "a@b.fr", userId: "u-1", callerId: "admin-1" });
    const upd = calls.find((c) => c.table === ADR && c.op === "update");
    expect(upd?.payload).toMatchObject({ status: "pending", source: "admin", cancelled_at: null });
    expect(upd?.filters).toContainEqual(["eq", "id", "req-x"]);
    expect(calls.some((c) => c.table === ADR && c.op === "insert")).toBe(false);
    expect(res.created).toBe(true);
  });

  it("sans compte : cherche une demande en attente par adresse, puis l'insère sans user_id", async () => {
    const { client, calls } = fakeClient((call) =>
      call.table === ADR && call.op === "insert" ? { data: { id: "req-mail" }, error: null } : { data: null, error: null },
    );
    const res = await recordDeletionRequest(client, { email: "x@y.fr", userId: null, callerId: "admin-1" });
    const lookup = calls.find((c) => c.table === ADR && c.op === "select");
    expect(lookup?.filters).toEqual(
      expect.arrayContaining([["eq", "requester_email", "x@y.fr"], ["is", "user_id", null], ["eq", "status", "pending"]]),
    );
    const ins = calls.find((c) => c.table === ADR && c.op === "insert");
    expect(ins?.payload).toMatchObject({ user_id: null, status: "pending" });
    expect(res.requestId).toBe("req-mail");
  });
});
