/**
 * Lot Z2, audit C-15 (13/10/2026) : « Clôturer sans sélectionner » lit ses
 * erreurs et pose closed_at et close_reason. Avant, le toast « Mission
 * clôturée » s'affichait même quand la base refusait l'écriture.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { AUTHOR_CLOSE_NO_SELECT_REASON, closeMissionWithoutSelection } from "@/lib/missionCloseNoSelect";

type Call = { table: string; values: any; filters: Array<[string, string, any]> };

function fakeClient(opts: { responsesError?: string; missionError?: string; missionRows?: any[] } = {}) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table, values: null, filters: [] };
      calls.push(call);
      const result = () =>
        table === "small_mission_responses"
          ? { data: null, error: opts.responsesError ? { message: opts.responsesError } : null }
          : {
              data: opts.missionError ? null : opts.missionRows ?? [{ id: "m1" }],
              error: opts.missionError ? { message: opts.missionError } : null,
            };
      const chain: any = {
        update(values: any) { call.values = values; return chain; },
        in(c: string, v: any) { call.filters.push(["in", c, v]); return Promise.resolve(result()); },
        eq(c: string, v: any) { call.filters.push(["eq", c, v]); return chain; },
        select() { return Promise.resolve(result()); },
      };
      return chain;
    },
  };
  return { client, calls };
}

const NOW = new Date("2026-10-14T08:00:00.000Z");

describe("C-15, clôture sans sélection", () => {
  it("décline les propositions en attente puis clôt avec date et motif", async () => {
    const { client, calls } = fakeClient();
    const res = await closeMissionWithoutSelection(client, { missionId: "m1", pendingResponseIds: ["r1", "r2"], now: NOW });
    expect(res).toEqual({ ok: true });
    expect(calls.map((c) => c.table)).toEqual(["small_mission_responses", "small_missions"]);
    expect(calls[0].values).toEqual({ status: "declined" });
    expect(calls[0].filters).toEqual([["in", "id", ["r1", "r2"]]]);
    expect(calls[1].values).toEqual({
      status: "cancelled",
      closed_at: "2026-10-14T08:00:00.000Z",
      close_reason: "closed_by_author",
    });
    expect(calls[1].filters).toEqual([["eq", "id", "m1"]]);
    expect(AUTHOR_CLOSE_NO_SELECT_REASON).toBe("closed_by_author");
  });

  it("sans proposition en attente, seul le besoin est écrit", async () => {
    const { client, calls } = fakeClient();
    await closeMissionWithoutSelection(client, { missionId: "m1", pendingResponseIds: [], now: NOW });
    expect(calls.map((c) => c.table)).toEqual(["small_missions"]);
  });

  it("refus sur les propositions : le besoin reste ouvert et l'erreur remonte", async () => {
    const { client, calls } = fakeClient({ responsesError: "permission denied" });
    const res = await closeMissionWithoutSelection(client, { missionId: "m1", pendingResponseIds: ["r1"], now: NOW });
    expect(res).toEqual({ ok: false, message: "permission denied" });
    expect(calls.map((c) => c.table)).toEqual(["small_mission_responses"]);
  });

  it("refus sur le besoin : l'erreur remonte", async () => {
    const { client } = fakeClient({ missionError: "boom" });
    const res = await closeMissionWithoutSelection(client, { missionId: "m1", pendingResponseIds: [], now: NOW });
    expect(res).toEqual({ ok: false, message: "boom" });
  });

  it("aucune ligne modifiée (RLS silencieuse) : échec signalé", async () => {
    const { client } = fakeClient({ missionRows: [] });
    const res = await closeMissionWithoutSelection(client, { missionId: "m1", pendingResponseIds: [], now: NOW });
    expect(res.ok).toBe(false);
  });

  it("la fiche du besoin passe par ce chemin et n'écrit plus le statut seule", () => {
    const src = readFileSync("src/pages/SmallMissionDetail.tsx", "utf8");
    expect(src).toContain("await closeMissionWithoutSelection(supabase, {");
    expect(src).toContain("if (closed.ok === false) throw new Error(closed.message);");
    expect(src).not.toContain('await supabase.from("small_missions").update({ status: "cancelled" as any }).eq("id", mission.id);');
  });
});
