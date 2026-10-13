/**
 * Lot Z2, audit B-15 (13/10/2026) : le bouton central « Dispo » du gardien
 * (lot M2) mène à /profile?focus=availability. La porte d'affinité laisse
 * passer cette adresse ; le reste de /profile et le tableau de bord gardent
 * le questionnaire.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { isGateAlwaysOpenPath, isGateOpenProfileFocus } from "@/lib/onboardingGateRules";
import { SITTER_AVAILABILITY_PATH } from "@/lib/bottomNavFab";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", role: "sitter" }, loading: false }),
}));

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => ({ enabled: true, appliesSince: "2026-07-09T06:50:32Z", loading: false }),
  getFlag: () => Promise.resolve({ enabled: false, appliesSince: null }),
}));

vi.mock("@/hooks/useAffinityOnboardingStatus", () => ({
  useAffinityOnboardingStatus: () => ({
    loading: false,
    role: "sitter",
    needsOnboarding: true,
    needsSitter: true,
    needsOwner: false,
    needsPostal: false,
    profileCreatedAt: "2026-10-02T11:04:36Z",
    refresh: vi.fn(),
  }),
}));

import OnboardingGate from "@/components/onboarding/OnboardingGate";

let path = "";
const Where = () => {
  const loc = useLocation();
  path = loc.pathname;
  return null;
};

async function landOn(url: string) {
  path = "";
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="*" element={<><OnboardingGate /><Where /></>} />
      </Routes>
    </MemoryRouter>,
  );
  await new Promise((r) => setTimeout(r, 30));
  return path;
}

beforeEach(() => {
  localStorage.clear();
});

describe("B-15, règle pure", () => {
  it("seule l'adresse de disponibilité est ouverte sur /profile", () => {
    expect(isGateOpenProfileFocus("/profile", "?focus=availability")).toBe(true);
    expect(isGateOpenProfileFocus("/profile", "?section=identite&focus=availability")).toBe(true);
    expect(isGateOpenProfileFocus("/profile", "")).toBe(false);
    expect(isGateOpenProfileFocus("/profile", "?focus=bio")).toBe(false);
    expect(isGateOpenProfileFocus("/profile/edit", "?focus=availability")).toBe(false);
    expect(isGateOpenProfileFocus(null, "?focus=availability")).toBe(false);
  });

  it("les préfixes ouverts restent inchangés (/profile n'en fait pas partie)", () => {
    expect(isGateAlwaysOpenPath("/profile")).toBe(false);
  });

  it("le bouton « Dispo » vise bien l'adresse ouverte", () => {
    const [p, q] = SITTER_AVAILABILITY_PATH.split("?");
    expect(isGateOpenProfileFocus(p, `?${q}`)).toBe(true);
  });
});

describe("B-15, porte rendue", () => {
  it("« Dispo » ouvre la page de disponibilité", async () => {
    expect(await landOn(SITTER_AVAILABILITY_PATH)).toBe("/profile");
  });

  it("le reste du profil garde le questionnaire", async () => {
    expect(await landOn("/profile")).toBe("/onboarding/affinity");
  });
});
