import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/hooks/useImpressionOnce", () => ({ useImpressionOnce: () => false }));

// Les libellés de la démo passent par i18n : on charge l'instance réelle,
// dont le dictionnaire français est embarqué, sinon seules les clés sortent.
import "@/i18n";
import AffinityScoreShowcase from "@/components/landing/AffinityScoreShowcase";

describe("AffinityScoreShowcase", () => {
  it("affiche les 10 critères réels de computeAffinityResultFull", () => {
    render(
      <MemoryRouter>
        <AffinityScoreShowcase />
      </MemoryRouter>,
    );
    expect(screen.getByText("Animaux")).toBeInTheDocument();
    expect(screen.getByText("Présence pendant la garde")).toBeInTheDocument();
    expect(screen.getByText("Véhicule")).toBeInTheDocument();
    expect(screen.getByText("Rythme de vie")).toBeInTheDocument();
    expect(screen.getByText("Langues")).toBeInTheDocument();
    expect(screen.getByText("Intérêts")).toBeInTheDocument();
    expect(screen.getByText("Profil idéal")).toBeInTheDocument();
    expect(screen.getByText("Ambiance du foyer")).toBeInTheDocument();
    expect(screen.getByText("Besoins spéciaux")).toBeInTheDocument();
    expect(screen.getByText("Distance")).toBeInTheDocument();
  });

  it("affiche le badge score 85 % · 8/10", () => {
    render(
      <MemoryRouter>
        <AffinityScoreShowcase />
      </MemoryRouter>,
    );
    expect(screen.getByText(/85/)).toBeInTheDocument();
    expect(screen.getByText(/8\/10/)).toBeInTheDocument();
  });

  it("n'affirme aucun nombre fixe de critères dans la copy", () => {
    render(
      <MemoryRouter>
        <AffinityScoreShowcase />
      </MemoryRouter>,
    );
    // Doctrine : dénominateur dynamique, jamais de chiffre codé en dur
    // (« sept critères », « 7 critères », « sur 8 »...) dans le texte visible.
    expect(screen.queryByText(/sept critères/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\b7 critères\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sur 8/)).not.toBeInTheDocument();
  });
});
