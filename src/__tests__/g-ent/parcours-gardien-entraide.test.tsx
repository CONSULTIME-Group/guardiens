/**
 * Lots G-ENT1 et G-ENT2 (01/11/2026) : parcours gardien tourné vers l'entraide.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import arrival from "@/i18n/locales/fr/arrival.json";
import { helpOfferPhrase, pickNearbyNeeds } from "@/lib/arrival";
import { buildG4Writes } from "@/pages/arrival/ArriveeSavoirFaire";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1", role: "sitter", firstName: "Lea" } }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
let data: any = null;
vi.mock("@/lib/arrivalFirstStep", () => ({ loadFirstStep: () => Promise.resolve(data) }));

describe("G-ENT1, textes et interrupteur", () => {
  it("aucune durée annoncée dans le parcours d'arrivée", () => {
    expect(JSON.stringify(arrival)).not.toMatch(/\b(minutes?|secondes?)\b/i);
  });
  it("G4 s'adresse aux gens du coin", () => {
    expect((arrival as any).g4.title).toBe("Qu'aimez-vous faire pour les gens du coin ?");
    expect((arrival as any).g4.available_title).toBe("Je veux bien qu'on me demande un coup de main");
  });
  it("interrupteur : écrit la disponibilité même sans savoir-faire, et respecte le non", () => {
    expect(buildG4Writes({ userId: "u", role: "sitter", competences: [], helpsWith: "", available: true })!.profile)
      .toEqual({ available_for_help: true });
    const off = buildG4Writes({ userId: "u", role: "both", competences: ["Courses"], helpsWith: "", available: false })!;
    expect(off.profile.available_for_help).toBe(false);
    expect(off.owner!.competences_disponible).toBe(false);
  });
});

describe("G-ENT2, logique", () => {
  const n = (id: string, distanceKm: number | null, category: string) => ({ id, distanceKm, category });
  it("besoins dans le rayon, ceux qui correspondent d'abord, trois au plus", () => {
    const picked = pickNearbyNeeds(
      [n("loin", 45, "garden"), n("jardin", 9, "garden"), n("courses", 2, "errand"), n("chat", 5, "animals"), n("x", null, "garden"), n("bric", 3, "house")],
      ["jardin", "animaux"],
    );
    expect(picked.map((p) => p.id)).toEqual(["chat", "jardin", "courses"]);
  });
  it("proposition écrite d'après les choix, 200 caractères au plus", () => {
    expect(helpOfferPhrase(["Promenade chiens", "Courses"])).toBe("Je donne volontiers un coup de main près de chez moi : promenade chiens et courses.");
    expect(helpOfferPhrase([])).toBe("Je donne volontiers un coup de main près de chez moi.");
    const long = helpOfferPhrase(Array.from({ length: 20 }, (_, i) => `Savoir-faire numéro ${i}`));
    expect(long.length).toBeLessThanOrEqual(200);
    expect(long.endsWith(".")).toBe(true);
  });
});

const base = { city: "Lyon", completion: 80, missing: [], hasAvatar: true, hasSkills: true, nearCount: 1, total: 5, closest: [],
  alertActive: false, competences: ["Promenade chiens"], helpsWith: "", availableForHelp: true, role: "sitter" };
const best = { id: "s1", city: "Lyon", distanceKm: 4, title: "Maison", cover: null, affinity: null, start_date: "2026-11-01", end_date: "2026-11-08" };
const need = { id: "m1", path: "/petites-missions/arroser-potager", title: "Arroser le potager", city: "Lyon 5e", category: "garden", description: null, distanceKm: 1 };

async function show(d: any) {
  data = d;
  const { default: Page } = await import("@/pages/arrival/ArriveePremierPas");
  render(<MemoryRouter><Page /></MemoryRouter>);
}

describe("G-ENT2, premier pas", () => {
  it("besoins proches : « Je peux » ouvre la fiche du besoin", async () => {
    await show({ ...base, hasNear: true, best, needs: [need] });
    const link = await screen.findByRole("link", { name: "Je peux" });
    expect(link.getAttribute("href")).toBe("/petites-missions/arroser-potager");
    expect(screen.getByTestId("g5-owner-mirror")).toBeInTheDocument();
  });
  it("sans besoin proche : proposition pré-écrite à publier", async () => {
    await show({ ...base, hasNear: false, best: null, closest: [best], needs: [] });
    expect(await screen.findByTestId("g5-offer")).toBeInTheDocument();
    expect(screen.getByText("Je donne volontiers un coup de main près de chez moi : promenade chiens.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publier ma proposition" })).toBeInTheDocument();
  });
  it("proposition déjà en ligne : affichée, sans republier", async () => {
    await show({ ...base, hasNear: true, best, needs: [], helpsWith: "Je fais les courses le samedi" });
    expect(await screen.findByText("Votre proposition est en ligne autour de Lyon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publier ma proposition" })).toBeNull();
  });
  it("carte miroir réservée aux comptes gardiens", async () => {
    await show({ ...base, role: "both", hasNear: true, best, needs: [need] });
    await screen.findByRole("link", { name: "Je peux" });
    expect(screen.queryByTestId("g5-owner-mirror")).toBeNull();
  });
});
