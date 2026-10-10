import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { sitterCardLine, sitterDistinctLines } from "@/lib/sitterDistinctLine";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/components/shared/FavoriteButton", () => ({ default: () => null }));
vi.mock("@/components/badges/ProBadge", () => ({ default: () => null }));

import SitterResultCard from "@/components/search/SitterResultCard";

describe("R1 sitterCardLine", () => {
  it("non vide dès une donnée", () => {
    for (const s of [{ sitter_type: "Solo" }, { experience_years: "5+ ans" }, { has_vehicle: true },
      { special_animal_skills: ["Soin post-opératoire"] }, { interests: ["Ski"] }]) {
      expect(sitterCardLine(s, { omitSitsAndReviews: true })).not.toBe("");
    }
  });
  it("80 caractères au plus, jamais gardes ni note, Véhiculé", () => {
    const l = sitterCardLine({ completed_sits_count: 4, reviews_count: 3, reviews_avg: 4.8, sitter_type: "Famille",
      has_vehicle: true, experience_years: "5+ ans", interests: ["Randonnée", "Cuisine"] }, { omitSitsAndReviews: true });
    expect(l).toBe("En famille · véhiculé · plus de 5 ans d'expérience");
    expect(l.length).toBeLessThanOrEqual(80);
    expect(l).not.toMatch(/garde|avis|moyenne/);
    expect(sitterCardLine({ has_vehicle: true })).toBe("Véhiculé");
    expect(sitterCardLine({ has_vehicle: null, animal_types: ["Chiens"] })).toBe("");
  });
  it("pas de retrait des éléments communs entre cartes", () => {
    const a = { interests: ["Ski"] };
    expect([sitterCardLine(a), sitterCardLine(a)]).toEqual(["Centres d'intérêt : ski", "Centres d'intérêt : ski"]);
  });
  it("sitterDistinctLines avec véhicule", () => {
    expect(sitterDistinctLines([{ sitter_type: "Couple", has_vehicle: true }, { sitter_type: "Solo" }]))
      .toEqual(["En couple · véhiculé", "En solo"]);
  });
});

const base = (bio: string | null) => ({
  user_id: "u1", sitter_type: "Couple", has_vehicle: true, animal_types: ["Chiens", "Chevaux"], avgRating: 4.9, reviewCount: 7,
  profile: { first_name: "Léa", city: "Lyon", bio, completed_sits_count: 3 },
});
const mount = (s: any) => render(<MemoryRouter><SitterResultCard sitter={s} photos={[]} affinity={null}
  hasOwnerProfile={false} duplicateName={false} city="Lyon" /></MemoryRouter>);

describe("R1 rendu SitterResultCard", () => {
  it("avec bio : ligne et accroche", () => {
    mount(base("J'adore les chevaux. Et le reste."));
    expect(screen.getByTestId("sitter-card-line").textContent).toBe("En couple · chevaux · véhiculé");
    expect(screen.getByText("« J'adore les chevaux. »")).toBeTruthy();
  });
  it("sans bio : ligne seule, meta intacte", () => {
    mount(base(null));
    expect(screen.getByTestId("sitter-card-line").textContent).toBe("En couple · chevaux · véhiculé");
    // Lot L4 : note sur le nombre d avis (7), gardes réalisées à part (3).
    expect(screen.getByText("4,9/5 sur 7 avis · 3 gardes réalisées")).toBeTruthy();
    expect(screen.queryByText(/«/)).toBeNull();
  });
});
