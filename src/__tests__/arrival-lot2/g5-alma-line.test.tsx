/** Lot 2b : phrase d'Alma en G5 et G5b, seulement avec l'alerte de nouvelle garde active. */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1", role: "sitter", firstName: "Lea" } }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
let data: any = null;
vi.mock("@/lib/arrivalFirstStep", () => ({ loadFirstStep: () => Promise.resolve(data) }));

const base = { city: "Lyon", completion: 80, missing: [], hasAvatar: true, hasSkills: true, nearCount: 1, total: 5, closest: [] };
const best = { id: "s1", city: "Lyon", distanceKm: 4, title: "Maison", cover: null, affinity: null, start_date: "2026-11-01", end_date: "2026-11-08" };
const cases = [
  ["G5", { ...base, hasNear: true, best }],
  ["G5b", { ...base, hasNear: false, best: null, closest: [best] }],
] as const;

async function show(d: any) {
  data = d;
  const { default: Page } = await import("@/pages/arrival/ArriveePremierPas");
  render(<MemoryRouter><Page /></MemoryRouter>);
}

describe("lot 2b, phrase d'Alma", () => {
  for (const [name, d] of cases) {
    it(`${name} : alerte active, phrase affichée`, async () => {
      await show({ ...d, alertActive: true });
      expect(await screen.findByTestId("g5-alma-line")).toBeInTheDocument();
    });
    it(`${name} : alerte inactive, rien`, async () => {
      await show({ ...d, alertActive: false });
      await screen.findByRole("heading", { level: 1 });
      expect(screen.queryByTestId("g5-alma-line")).toBeNull();
    });
  }
});
