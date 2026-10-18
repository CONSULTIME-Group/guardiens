// Lot UA2 : finitions du bloc « Une action utile près de chez vous » et rail gardien.
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { localActionRadiusKey, missionLocalAction, readStoredLocalActionRadius } from "@/lib/localUsefulActions";
import { LocalUsefulActionsView } from "@/components/dashboard/shared/LocalUsefulActions";

const lyon = { latitude: 45.764, longitude: 4.8357 };
const mission = (patch: Record<string, unknown> = {}) => ({
  id: "m1", user_id: "autre", title: "Garder mon chien", city: "Lyon", ...lyon, status: "open",
  category: "animals", created_at: "2026-10-17T10:00:00Z", date_needed: "2026-11-12", end_date: "2026-11-19",
  duration_estimate: "several", ...patch,
});

describe("carte : période complète", () => {
  it("affiche le début et la fin quand ils diffèrent", () => {
    const a = missionLocalAction(mission(), "moi", new Date("2026-10-18T08:00:00Z"))!;
    render(<MemoryRouter><LocalUsefulActionsView actions={[{ ...a, distanceKm: 2, matchingSkill: true }]} radius={15} onRadiusChange={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId("local-useful-actions").textContent).toContain("du 12 au 19 novembre 2026");
  });
});

describe("fraîcheur au jour de Paris", () => {
  it("une demande publiée à 1 h 30 à Paris il y a 30 jours reste admise", () => {
    const m = mission({ date_needed: null, end_date: null, created_at: "2026-09-17T23:30:00Z" });
    expect(missionLocalAction(m, "moi", new Date("2026-10-18T10:00:00Z"))).not.toBeNull();
  });
});

describe("rayon partagé entre le bloc et le rail", () => {
  beforeEach(() => localStorage.clear());
  it("lit le rayon enregistré, 15 km par défaut, valeur hors liste ignorée", () => {
    expect(readStoredLocalActionRadius("u1")).toBe(15);
    localStorage.setItem(localActionRadiusKey("u1"), "30");
    expect(readStoredLocalActionRadius("u1")).toBe(30);
    localStorage.setItem(localActionRadiusKey("u1"), "50");
    expect(readStoredLocalActionRadius("u1")).toBe(15);
  });
  it("le rail gardien s'appuie sur la sélection commune, plus sur un tableau vide", () => {
    const dash = readFileSync(resolve(__dirname, "../components/dashboard/SitterDashboard.tsx"), "utf8");
    expect(dash).toMatch(/useLocalUsefulActions\(user\?\.id\)/);
    expect(dash).toMatch(/selectLocalUsefulActions\(localSources\.actions/);
  });
});
