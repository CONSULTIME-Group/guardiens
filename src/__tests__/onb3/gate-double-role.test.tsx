/**
 * Lot ONB3 (25/11/2026) : la porte d'affinité envoie un compte à double rôle
 * vers l'écran du jeu qui manque, pour qu'il ne tourne plus entre G2 et G3.
 *
 * Cas réel : Aleksei (rôle both, inscrit le 13/11) avait son jeu gardien
 * complet et son jeu propriétaire vide. La porte le renvoyait vers G2, G2 et
 * G3 n'écrivent que sitter_profiles : 17 passages par G3 du 22 au 24/11.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const state = {
  role: "both" as "both" | "sitter" | "owner",
  needsSitter: false,
  needsOwner: true,
  needsPostal: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", role: state.role }, loading: false }),
}));

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => ({ enabled: true, appliesSince: "2026-07-09T06:50:32Z", loading: false }),
  getFlag: () => Promise.resolve({ enabled: true, appliesSince: "2026-11-01T07:44:00Z" }),
}));

vi.mock("@/hooks/useAffinityOnboardingStatus", () => ({
  useAffinityOnboardingStatus: () => ({
    loading: false,
    role: state.role,
    needsOnboarding: state.needsSitter || state.needsOwner || state.needsPostal,
    needsSitter: state.needsSitter,
    needsOwner: state.needsOwner,
    needsPostal: state.needsPostal,
    profileCreatedAt: "2026-11-13T08:04:53Z",
    refresh: vi.fn(),
  }),
}));

import OnboardingGate, { gateArrivalTarget } from "@/components/onboarding/OnboardingGate";

let where = "";
const Where = () => {
  const loc = useLocation();
  where = `${loc.pathname}${loc.search}`;
  return null;
};

async function landOn(url: string) {
  where = "";
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="*" element={<><OnboardingGate /><Where /></>} />
      </Routes>
    </MemoryRouter>,
  );
  await new Promise((r) => setTimeout(r, 30));
  return where;
}

beforeEach(() => {
  localStorage.clear();
  Object.assign(state, { role: "both", needsSitter: false, needsOwner: true, needsPostal: false });
});

describe("lot ONB3, cible de la porte", () => {
  it("jeu gardien complet, jeu propriétaire vide : P3", () => {
    expect(gateArrivalTarget({ needsSitter: false, needsOwner: true }, "%2Fsearch")).toBe("/arrivee/affinites?redirect=%2Fsearch");
  });

  it("jeu gardien incomplet : G2, même si le jeu propriétaire manque aussi", () => {
    expect(gateArrivalTarget({ needsSitter: true, needsOwner: true }, "%2Fsearch")).toBe("/arrivee/garder?flow=sitter&next=%2Fsearch");
    expect(gateArrivalTarget({ needsSitter: true, needsOwner: false }, "%2Fsearch")).toBe("/arrivee/garder?flow=sitter&next=%2Fsearch");
  });
});

describe("lot ONB3, parcours", () => {
  it("double rôle, gardien fait, propriétaire vide : la porte mène à P3 et garde la page demandée", async () => {
    expect(await landOn("/search")).toBe("/arrivee/affinites?redirect=%2Fsearch");
  });

  it("double rôle, gardien à faire : la porte mène à G2 comme avant", async () => {
    state.needsSitter = true;
    expect(await landOn("/search")).toBe("/arrivee/garder?flow=sitter&next=%2Fsearch");
  });

  it("double rôle, P3 enregistré : plus aucune redirection", async () => {
    state.needsOwner = false;
    expect(await landOn("/search")).toBe("/search");
  });

  it("gardien seul : G2 comme avant", async () => {
    Object.assign(state, { role: "sitter", needsSitter: true, needsOwner: false });
    expect(await landOn("/search")).toBe("/arrivee/garder?flow=sitter&next=%2Fsearch");
  });

  it("code postal manquant : G1 reste prioritaire", async () => {
    state.needsPostal = true;
    expect(await landOn("/search")).toBe("/arrivee/vous?flow=sitter&next=%2Fsearch");
  });
});
