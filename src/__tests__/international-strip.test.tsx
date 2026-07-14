import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/hooks/useImpressionOnce", () => ({ useImpressionOnce: () => false }));

const mockCount = vi.fn();
vi.mock("@/hooks/useInternationalSitsCount", () => ({
  useInternationalSitsCount: () => mockCount(),
}));

import InternationalStrip from "@/components/landing/InternationalStrip";

function renderStrip() {
  return render(
    <MemoryRouter>
      <InternationalStrip />
    </MemoryRouter>,
  );
}

describe("InternationalStrip", () => {
  it("affiche les deux cartes actives, avec message 'bientôt' quand count = 0", () => {
    mockCount.mockReturnValue({ count: 0, recent: [], isLoading: false });
    renderStrip();
    expect(screen.getByTestId("intl-card-owner_fr")).toBeInTheDocument();
    expect(screen.getByTestId("intl-card-sitter_intl")).toBeInTheDocument();
    // La carte "community" (Marrakech/Lisbonne/Bali + Voir la carte) est
    // retirée tant qu'aucune annonce n'est publiée à l'étranger.
    expect(screen.queryByTestId("intl-card-community")).toBeNull();
  });

  it("n'affiche pas la carte 'community' même quand des annonces récentes existent (retirée pour éviter la promesse fabriquée)", () => {
    mockCount.mockReturnValue({
      count: 3,
      recent: [
        { id: "1", city: "Marrakech", country: "Maroc", title: null },
        { id: "2", city: "Lisbonne", country: "Portugal", title: null },
        { id: "3", city: "Bali", country: "Indonésie", title: null },
      ],
      isLoading: false,
    });
    renderStrip();
    expect(screen.queryByTestId("intl-card-community")).toBeNull();
  });
});
