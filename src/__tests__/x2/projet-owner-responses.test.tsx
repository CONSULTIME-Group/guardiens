/**
 * Lot X2 (constat C-02) : le porteur d'un projet participatif lit ses
 * candidatures sur /projets/:slug. Rendu avec Supabase simulé.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { db, calls, rpcCalls, invokeCalls, auth, captured } = vi.hoisted(() => ({
  db: { rows: {} as Record<string, unknown[]> },
  calls: [] as Array<{ table: string; op: string; args: unknown[] }>,
  rpcCalls: [] as Array<{ fn: string; args: unknown }>,
  invokeCalls: [] as Array<{ name: string; body: unknown }>,
  auth: { user: null as null | { id: string } },
  captured: [] as any[],
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
      single: () => Promise.resolve({ data: list()[0] ?? null, error: null }),
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
        if (fn === "open_mission_response_conversation") return Promise.resolve({ data: "conv-42", error: null });
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
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock("@/components/missions/MissionBadgesReceived", () => ({ default: () => null }));
vi.mock("@/components/missions/PublicMissionView", () => ({
  default: (props: any) => {
    captured.push(props);
    return (
      <div>
        <h1>{props.mission.title}</h1>
        {props.ownerPanel}
      </div>
    );
  },
}));

import ProjetOwnerResponses from "@/components/missions/ProjetOwnerResponses";
import ProjetDetail from "@/pages/ProjetDetail";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJET = { id: "p1", user_id: "owner", title: "Chantier participatif de plantation" };

const responses = [
  { id: "r1", mission_id: "p1", responder_id: "u1", message: "Je viens planter avec plaisir.", status: "pending", created_at: "2026-10-10T09:00:00Z", conversation_id: null, helpful_count: 0 },
  { id: "r2", mission_id: "p1", responder_id: "u2", message: "Disponible le samedi matin.", status: "accepted", created_at: "2026-10-09T09:00:00Z", conversation_id: "conv-7", helpful_count: 0 },
  { id: "r3", mission_id: "p1", responder_id: "u3", message: "Je propose mon aide au potager.", status: "declined", created_at: "2026-10-08T09:00:00Z", conversation_id: null, helpful_count: 0 },
];

beforeEach(() => {
  db.rows = {
    small_mission_responses: responses.map((r) => ({ ...r })),
    public_profiles: [
      { id: "u1", first_name: "Léa", avatar_url: null },
      { id: "u2", first_name: "Marc", avatar_url: null },
      { id: "u3", first_name: "Inès", avatar_url: null },
    ],
  };
  calls.length = 0;
  rpcCalls.length = 0;
  invokeCalls.length = 0;
  captured.length = 0;
  auth.user = null;
});
afterEach(cleanup);

const renderPanel = () =>
  render(
    <MemoryRouter initialEntries={["/projets/chantier"]}>
      <Routes>
        <Route path="/projets/:slug" element={<ProjetOwnerResponses projet={PROJET} currentUserId="owner" />} />
        <Route path="/messages/:id" element={<p>conversation ouverte</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe("liste des candidatures du porteur", () => {
  it("lit les réponses du projet et affiche prénom, message, date et statut", async () => {
    renderPanel();
    expect(await screen.findByText("Je viens planter avec plaisir.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Candidatures reçues/ })).toBeTruthy();
    expect(screen.getByText("Léa")).toBeTruthy();
    expect(screen.getByText("Marc")).toBeTruthy();
    expect(screen.getByText("Nouvelle candidature")).toBeTruthy();
    expect(screen.getByText("Personne retenue")).toBeTruthy();
    expect(screen.getByText("Candidature écartée")).toBeTruthy();
    // Date de la carte (format « d MMM à HH:mm »).
    expect(screen.getAllByText(/oct\. à/).length).toBeGreaterThan(0);
    const read = calls.filter((c) => c.table === "small_mission_responses" && c.op === "eq");
    expect(read.some((c) => c.args[0] === "mission_id" && c.args[1] === "p1")).toBe(true);
  });

  // Lot X3b (décision du 13/10/2026) : « Choisir » revient sur un projet,
  // pour les seules candidatures en attente (src/__tests__/x3b/).
  it("« Choisir » seulement sur une candidature en attente", async () => {
    renderPanel();
    await screen.findByText("Je viens planter avec plaisir.");
    expect(screen.getByLabelText("Choisir Léa")).toBeTruthy();
    expect(screen.queryByLabelText("Choisir Marc")).toBeNull();
    expect(screen.queryByLabelText("Choisir Inès")).toBeNull();
  });

  it("une conversation existante s'ouvre directement", async () => {
    renderPanel();
    fireEvent.click(await screen.findByText("Ouvrir la conversation"));
    expect(await screen.findByText("conversation ouverte")).toBeTruthy();
    expect(rpcCalls.filter((c) => c.fn === "open_mission_response_conversation")).toHaveLength(0);
  });

  it("sans conversation, « Écrire à » la crée puis l'ouvre", async () => {
    renderPanel();
    fireEvent.click(await screen.findByText("Écrire à Léa"));
    expect(await screen.findByText("conversation ouverte")).toBeTruthy();
    expect(rpcCalls).toContainEqual({ fn: "open_mission_response_conversation", args: { p_response_id: "r1" } });
  });

  it("écarter une candidature met à jour son statut et prévient la personne", async () => {
    renderPanel();
    await screen.findByText("Je viens planter avec plaisir.");
    fireEvent.click(screen.getByLabelText("Écarter la candidature de Léa"));
    await waitFor(() => expect(invokeCalls).toHaveLength(1));
    expect(calls.some((c) => c.table === "small_mission_responses" && c.op === "update")).toBe(true);
    expect(invokeCalls[0]).toEqual({
      name: "notify-mission-event",
      body: { event_type: "mission_declined", mission_id: "p1", actor_id: "owner", target_ids: ["u1"] },
    });
  });

  it("sans candidature, la liste l'annonce simplement", async () => {
    db.rows.small_mission_responses = [];
    renderPanel();
    expect(await screen.findByText(/Les candidatures arriveront ici/)).toBeTruthy();
  });
});

const PROJET_ROW = {
  id: "p1",
  user_id: "owner",
  slug: "chantier-participatif-de-plantation",
  title: "Chantier participatif de plantation",
  category: "projet",
  status: "open",
  created_at: "2026-09-30T08:00:00Z",
  description: "Plantation collective.",
  photos: [],
};

const renderProjet = () =>
  render(
    <MemoryRouter initialEntries={["/projets/chantier-participatif-de-plantation"]}>
      <Routes>
        <Route path="/projets/:slug" element={<ProjetDetail />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ProjetDetail : branche du porteur", () => {
  it("le porteur connecté voit ses candidatures, sans formulaire de candidature", async () => {
    auth.user = { id: "owner" };
    db.rows.public_small_missions = [PROJET_ROW];
    renderProjet();
    expect(await screen.findByText("Je viens planter avec plaisir.")).toBeTruthy();
    const last = captured[captured.length - 1];
    expect(last.ownerPanel).toBeTruthy();
    expect(last.onApply).toBeUndefined();
    expect(last.ownerPanelAnchor).toBe("candidatures");
  });

  it("un autre membre garde la candidature et ne voit aucune liste", async () => {
    auth.user = { id: "visitor" };
    db.rows.public_small_missions = [PROJET_ROW];
    renderProjet();
    await screen.findByRole("heading", { name: PROJET_ROW.title });
    const last = captured[captured.length - 1];
    expect(last.ownerPanel).toBeUndefined();
    expect(typeof last.onApply).toBe("function");
    expect(calls.some((c) => c.table === "small_mission_responses")).toBe(false);
  });

  it("un projet sorti de la vue publique reste lisible par son porteur", async () => {
    auth.user = { id: "owner" };
    db.rows.public_small_missions = [];
    db.rows.small_missions = [{ ...PROJET_ROW, status: "in_progress" }];
    renderProjet();
    expect(await screen.findByText("Je viens planter avec plaisir.")).toBeTruthy();
    const own = calls.filter((c) => c.table === "small_missions" && c.op === "eq");
    expect(own.some((c) => c.args[0] === "user_id" && c.args[1] === "owner")).toBe(true);
  });

  it("un visiteur anonyme ne déclenche aucune lecture privée", async () => {
    db.rows.public_small_missions = [PROJET_ROW];
    renderProjet();
    await screen.findByRole("heading", { name: PROJET_ROW.title });
    expect(calls.some((c) => c.table === "small_missions")).toBe(false);
    expect(captured[captured.length - 1].ownerPanel).toBeUndefined();
  });
});

describe("gardes statiques", () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
  it("la carte de réponse garde son rendu par défaut pour la fiche besoin", () => {
    const card = read("src/components/missions/MissionResponseCard.tsx");
    expect(card).toContain('variant = "mission"');
    expect(read("src/pages/SmallMissionDetail.tsx")).not.toContain('variant="projet"');
  });
  it("PublicMissionView n'affiche la liste du porteur que dans la branche projet", () => {
    const view = read("src/components/missions/PublicMissionView.tsx");
    expect(view.match(/\{ownerPanel\}/g)?.length).toBe(1);
  });
});
