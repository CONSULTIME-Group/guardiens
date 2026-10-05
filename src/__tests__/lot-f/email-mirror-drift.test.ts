import { describe, it, expect } from "vitest";
import { decideDrift, repairMirrorDrift } from "../../../supabase/functions/email-pipeline-watchdog/mirror-drift";

describe("lot F4 : décision de réparation du miroir", () => {
  it("aligne sur un statut terminal", () => {
    expect(decideDrift(["abandoned"])).toEqual({ kind: "repair", queueStatus: "abandoned" });
    expect(decideDrift(["cancelled"])).toEqual({ kind: "repair", queueStatus: "cancelled" });
    expect(decideDrift(["sent"])).toEqual({ kind: "repair", queueStatus: "sent" });
  });
  it("laisse une ligne vivante", () => {
    expect(decideDrift(["abandoned", "pending"])).toEqual({ kind: "live" });
  });
  it("alerte seulement sans aucune ligne en file", () => {
    expect(decideDrift([])).toEqual({ kind: "orphan" });
  });
});

const fakeClient = (logRows: unknown[], queueRows: unknown[]) => {
  const updates: Array<{ patch: Record<string, unknown>; id: string }> = [];
  const chain = (table: string) => {
    let patch: Record<string, unknown> | null = null;
    const q: Record<string, unknown> = {};
    const self = () => q;
    Object.assign(q, {
      select: self, eq: (col: string, val: string) => { if (patch && col === "id") updates.push({ patch, id: val }); return q; },
      lt: self, is: self, order: self, in: self,
      limit: async () => ({ data: logRows, error: null }),
      update: (p: Record<string, unknown>) => { patch = p; return q; },
      then: (res: (v: unknown) => void) =>
        res(table === "email_deferred_queue" ? { data: queueRows, error: null } : { error: null }),
    });
    return q;
  };
  return { client: { from: chain }, updates };
};

describe("lot F4 : réparation", () => {
  it("aligne abandoned, pose flushed_at pour sent, signale la clé orpheline", async () => {
    const { client, updates } = fakeClient(
      [
        { id: "a", metadata: { idempotency_key: "k1" } },
        { id: "b", metadata: { idempotency_key: "k2" } },
        { id: "c", metadata: { idempotency_key: "k3" } },
      ],
      [
        { idempotency_key: "k1", status: "abandoned" },
        { idempotency_key: "k2", status: "sent" },
      ],
    );
    const result = await repairMirrorDrift(client, new Date("2026-10-05T07:00:00Z"));
    expect(result.repaired).toBe(2);
    expect(result.orphanKeys).toEqual(["k3"]);
    expect(updates[0]).toMatchObject({ id: "a", patch: { status: "abandoned" } });
    expect(String(updates[0].patch.error_message)).toContain("abandoned");
    expect(updates[1].patch.status).toBeUndefined();
    expect((updates[1].patch.metadata as Record<string, unknown>).flushed_at).toBe("2026-10-05T07:00:00.000Z");
  });
});
