/**
 * Lot X3b, décision du fondateur du 13/10/2026 : sur un projet participatif,
 * « Choisir » une personne passe le projet en cours et ferme les
 * candidatures ; « Rouvrir les candidatures » le remet au statut ouvert, les
 * personnes retenues restent retenues. Rendu avec Supabase simulé.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { db, calls, rpcCalls, invokeCalls } = vi.hoisted(() => ({
  db: { rows: {} as Record<string, unknown[]> },
  calls: [] as Array<{ table: string; op: string; args: unknown[] }>,
  rpcCalls: [] as Array<{ fn: string; args: unknown }>,
  invokeCalls: [] as Array<{ name: string; body: unknown }>,
}));

vi.mock("@/integrations/supabase/client", () => {
  const from = (table: string) => {
    const list = () => db.rows[table] || [];
    const chain: Record<string, unknown> = {};
    const record = (op: string) => (...args: unknown[]) => { calls.push({ table, op, args }); return chain; };
    Object.assign(chain, {
      select: record("select"),
      eq: record("eq"),
      in: record("in"),
      order: record("order"),
      update: record("update"),
      maybeSingle: () => Promise.resolve({ data: list()[0] ?? null, error: null }),
      then: (resolve: (v: { data: unknown[]; error: null }) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve({ data: list(), error: null }).then(resolve, reject),
    });
    return chain;
  };
  return {
    supabase: {
      from,
      rpc: (fn: string, args: unknown) => {
        rpcCalls.push({ fn, args });
        if (fn === "accept_mission_response") {
          return Promise.resolve({ data: { success: true, conversation_id: "conv-9", declined_count: 0 }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      functions: {
        invoke: (name: string, opts: { body: unknown }) => {
          invokeCalls.push({ name, body: opts.body });
          return Promise.resolve({ data: null, error: null });
        },
      },
    },
  };
});
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock("@/components/missions/MissionBadgesReceived", () => ({ default: () => null }));

import ProjetOwnerResponses from "@/components/missions/ProjetOwnerResponses";

const responses = [
  { id: "r1", mission_id: "p1", responder_id: "u1", message: "Je viens planter avec plaisir.", status: "pending", created_at: "2026-10-10T09:00:00Z", conversation_id: null, helpful_count: 0 },
  { id: "r2", mission_id: "p1", responder_id: "u2", message: "Disponible le samedi matin.", status: "accepted", created_at: "2026-10-09T09:00:00Z", conversation_id: "conv-7", helpful_count: 0 },
];

beforeEach(() => {
  db.rows = {
    small_mission_responses: responses.map((r) => ({ ...r })),
    public_profiles: [
      { id: "u1", first_name: "Léa", avatar_url: null },
      { id: "u2", first_name: "Marc", avatar_url: null },
    ],
  };
  calls.length = 0;
  rpcCalls.length = 0;
  invokeCalls.length = 0;
});
afterEach(cleanup);

const renderPanel = (status: string) =>
  render(
    <MemoryRouter initialEntries={["/projets/chantier"]}>
      <Routes>
        <Route
          path="/projets/:slug"
          element={<ProjetOwnerResponses projet={{ id: "p1", user_id: "owner", title: "Chantier", status }} currentUserId="owner" />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("Choisir sur un projet", () => {
  it("« Choisir » s'affiche pour une candidature en attente seulement", async () => {
    renderPanel("open");
    await screen.findByText("Je viens planter avec plaisir.");
    expect(screen.getByLabelText("Choisir Léa")).toBeTruthy();
    expect(screen.queryByLabelText("Choisir Marc")).toBeNull();
    expect(screen.queryByText("Rouvrir les candidatures")).toBeNull();
  });

  it("confirmer garde les autres candidatures en attente, prévient la personne et ferme les candidatures", async () => {
    renderPanel("open");
    await screen.findByText("Je viens planter avec plaisir.");
    fireEvent.click(screen.getByLabelText("Choisir Léa"));
    expect(await screen.findByText(/Le projet passe en cours et les candidatures se ferment/)).toBeTruthy();
    const confirm = screen.getAllByRole("button", { name: "Choisir Léa" });
    fireEvent.click(confirm[confirm.length - 1]);
    await waitFor(() => expect(rpcCalls.some((c) => c.fn === "accept_mission_response")).toBe(true));
    expect(rpcCalls.find((c) => c.fn === "accept_mission_response")?.args).toEqual({ p_response_id: "r1", p_decline_others: false });
    await waitFor(() => expect(invokeCalls).toHaveLength(1));
    expect(invokeCalls[0]).toEqual({
      name: "notify-mission-event",
      body: { event_type: "mission_accepted", mission_id: "p1", actor_id: "owner", target_ids: ["u1"], metadata: { conversation_id: "conv-9" } },
    });
    expect(await screen.findByText("Rouvrir les candidatures")).toBeTruthy();
  });
});

describe("Rouvrir les candidatures", () => {
  it("un projet en cours propose de rouvrir ; le clic remet le statut ouvert", async () => {
    renderPanel("in_progress");
    await screen.findByText("Je viens planter avec plaisir.");
    expect(screen.getByText(/Les personnes retenues restent retenues/)).toBeTruthy();
    fireEvent.click(screen.getByText("Rouvrir les candidatures"));
    await waitFor(() => expect(calls.some((c) => c.table === "small_missions" && c.op === "update")).toBe(true));
    const upd = calls.find((c) => c.table === "small_missions" && c.op === "update");
    expect(upd?.args[0]).toEqual({ status: "open" });
    const eqs = calls.filter((c) => c.table === "small_missions" && c.op === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["id", "p1"]);
    expect(eqs).toContainEqual(["status", "in_progress"]);
    await waitFor(() => expect(screen.queryByText("Rouvrir les candidatures")).toBeNull());
    // Les réponses ne sont pas réécrites : la personne retenue le reste.
    expect(calls.some((c) => c.table === "small_mission_responses" && c.op === "update")).toBe(false);
    expect(screen.getAllByText("Personne retenue").length).toBeGreaterThan(0);
  });
});
