/**
 * Lot G1 (11/10/2026) : la porte d'affinité ne coupe jamais la messagerie,
 * les annonces, les candidatures, les gardes ni le compte ; « Plus tard »
 * la reporte de 24 h.
 *
 * Cas réel : du 05 au 09/10/2026, une propriétaire (rôle both) a été renvoyée
 * 11 fois vers le questionnaire en ouvrant ses messages et n'a jamais pu lire
 * ses 5 candidatures.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { readFileSync } from "node:fs";
import {
  AFFINITY_SNOOZE_MS,
  clearAffinitySnooze,
  isAffinityOnboardingSnoozed,
  isGateAlwaysOpenPath,
  snoozeAffinityOnboarding,
} from "@/lib/onboardingGateRules";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", role: "both" }, loading: false }),
}));

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => ({ enabled: true, appliesSince: "2026-07-09T06:50:32Z", loading: false }),
  getFlag: () => Promise.resolve({ enabled: false, appliesSince: null }),
}));

vi.mock("@/hooks/useAffinityOnboardingStatus", () => ({
  useAffinityOnboardingStatus: () => ({
    loading: false,
    role: "both",
    needsOnboarding: true,
    needsSitter: true,
    needsOwner: true,
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

describe("lot G1, pages jamais interrompues", () => {
  it.each([
    "/messages",
    "/messages/0c769ff3-eeda-4a21-acc9-c46dacc55b3e",
    "/sits",
    "/sits/85315487-7c43-4e10-a97e-821aefd10a8c",
    "/mes-candidatures",
    "/propositions/abc",
    "/notifications",
    "/review/abc",
    "/house-guide/abc",
    "/settings",
  ])("%s reste ouvert", async (url) => {
    expect(await landOn(url)).toBe(url.split("?")[0]);
  });

  it("le tableau de bord reste soumis au questionnaire", async () => {
    expect(await landOn("/dashboard")).toBe("/onboarding/affinity");
  });

  it("les préfixes ne débordent pas sur d'autres pages", () => {
    expect(isGateAlwaysOpenPath("/messagesX")).toBe(false);
    expect(isGateAlwaysOpenPath("/sitsearch")).toBe(false);
    expect(isGateAlwaysOpenPath("/dashboard")).toBe(false);
    expect(isGateAlwaysOpenPath("/profile")).toBe(false);
    expect(isGateAlwaysOpenPath(null)).toBe(false);
  });
});

describe("lot G1, « Plus tard »", () => {
  it("reporte la porte de 24 h, puis elle revient", async () => {
    const now = Date.now();
    snoozeAffinityOnboarding(now);
    expect(isAffinityOnboardingSnoozed(now + 1000)).toBe(true);
    expect(isAffinityOnboardingSnoozed(now + AFFINITY_SNOOZE_MS + 1)).toBe(false);
  });

  it("pendant le report, le tableau de bord n'est plus redirigé", async () => {
    snoozeAffinityOnboarding();
    expect(await landOn("/dashboard")).toBe("/dashboard");
    clearAffinitySnooze();
    expect(await landOn("/dashboard")).toBe("/onboarding/affinity");
  });

  it("une valeur illisible ne vaut pas report", () => {
    localStorage.setItem("guardiens_affinity_snooze_until", "abc");
    expect(isAffinityOnboardingSnoozed()).toBe(false);
  });

  it("câblage : bouton Plus tard, report, effacement à l'enregistrement", () => {
    const page = readFileSync("src/pages/OnboardingAffinity.tsx", "utf8");
    expect(page).toContain("Plus tard");
    expect(page).toContain("snoozeAffinityOnboarding()");
    expect(page).toContain("clearAffinitySnooze()");
    const gate = readFileSync("src/components/onboarding/OnboardingGate.tsx", "utf8");
    expect(gate).toContain("isGateAlwaysOpenPath(path)");
    expect(gate).toContain("isAffinityOnboardingSnoozed()");
  });
});
