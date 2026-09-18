import { describe, expect, it } from "vitest";
import {
  reportClaimOutcome,
  unexpectedRefusals,
} from "../../supabase/functions/_shared/sitNotificationClaim";

function makeSupabaseMock() {
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const insertedSignals: Array<Record<string, unknown>> = [];

  const supabase = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return { error: null };
    },
    from: (table: string) => {
      if (table !== "admin_signals") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({ limit: async () => ({ data: [], error: null }) }),
            }),
          }),
        }),
        insert: async (row: Record<string, unknown>) => {
          insertedSignals.push(row);
          return { error: null };
        },
      };
    },
  };
  return { supabase, rpcCalls, insertedSignals };
}

describe("unexpectedRefusals (pur)", () => {
  it("compte zéro refus inattendu quand tous les détenteurs sont des pipelines frères", () => {
    expect(
      unexpectedRefusals(16, { "nearby-daily-digest": 15, "alert-digest": 1 }),
    ).toBe(0);
  });

  it("compte les refus détenus par une source inconnue, null ou absente", () => {
    expect(unexpectedRefusals(12, { "nearby-daily-digest": 2 })).toBe(10);
    expect(unexpectedRefusals(12, { "source-inconnue": 12 })).toBe(12);
    expect(unexpectedRefusals(12, {})).toBe(12);
  });

  it("ne descend jamais sous zéro même si les décomptes excèdent les refus", () => {
    expect(unexpectedRefusals(3, { "alert-digest": 5 })).toBe(0);
  });
});

describe("reportClaimOutcome", () => {
  it("ne lève aucun signal critical quand les 16 refus sont détenus par nearby/alert", async () => {
    const { supabase, rpcCalls, insertedSignals } = makeSupabaseMock();
    await reportClaimOutcome(supabase, "sitter-daily-digest", 0, 16, {
      "nearby-daily-digest": 15,
      "alert-digest": 1,
    });
    expect(insertedSignals).toHaveLength(0);
    // record_claim_outcome reste enregistré tel quel.
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].fn).toBe("record_claim_outcome");
    expect(rpcCalls[0].args).toMatchObject({
      _source: "sitter-daily-digest",
      _granted: 0,
      _refused: 16,
      _held_by: { "nearby-daily-digest": 15, "alert-digest": 1 },
    });
  });

  it("lève un signal critical à 10 refus inattendus sur 12 (taux >= 50 %)", async () => {
    const { supabase, insertedSignals } = makeSupabaseMock();
    await reportClaimOutcome(supabase, "sitter-daily-digest", 2, 12, {
      "nearby-daily-digest": 2,
    });
    expect(insertedSignals).toHaveLength(1);
    expect(insertedSignals[0].signal_type).toBe("sit_notification_claim_starvation");
    expect(insertedSignals[0].severity).toBe("critical");
    const metadata = insertedSignals[0].metadata as Record<string, unknown>;
    expect(metadata.refused_unexpected).toBe(10);
    expect(metadata.refused).toBe(12);
  });

  it("ne lève rien si le taux de refus inattendu reste sous 50 %", async () => {
    const { supabase, insertedSignals } = makeSupabaseMock();
    await reportClaimOutcome(supabase, "sitter-daily-digest", 20, 10, {});
    expect(insertedSignals).toHaveLength(0);
  });

  it("ne lève rien et n'enregistre rien sans réservation tentée", async () => {
    const { supabase, rpcCalls, insertedSignals } = makeSupabaseMock();
    await reportClaimOutcome(supabase, "sitter-daily-digest", 0, 0, {});
    expect(rpcCalls).toHaveLength(0);
    expect(insertedSignals).toHaveLength(0);
  });
});
