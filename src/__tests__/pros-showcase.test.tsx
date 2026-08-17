import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
// Le composant utilise useTranslation directement : sans mock, l'assertion sur
// la clé du compteur dépend de l'état d'initialisation d'i18next (flaky).
// Le mock fige t = identité, l'assertion sur la clé devient déterministe.
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "fr" } }),
}));
vi.mock("@/hooks/useImpressionOnce", () => ({ useImpressionOnce: () => false }));

const mockCounts = vi.fn();
vi.mock("@/hooks/useInventaireCounts", () => ({
  useInventaireCounts: () => mockCounts(),
}));

import ProsShowcase from "@/components/landing/ProsShowcase";

function renderShowcase() {
  return render(
    <MemoryRouter>
      <ProsShowcase />
    </MemoryRouter>,
  );
}

describe("ProsShowcase", () => {
  it("masque la section quand pros_total = 0", () => {
    mockCounts.mockReturnValue({
      data: { pros_total: 0, pros_verified: 0 },
      isLoading: false,
    });
    const { container } = renderShowcase();
    expect(container.firstChild).toBeNull();
  });

  it("masque la section pendant le chargement", () => {
    mockCounts.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderShowcase();
    expect(container.firstChild).toBeNull();
  });

  it("affiche 3 cards + compteur quand pros_total ≥ 1", () => {
    // Décision du 14/07/2026 (commit d3da22ad3) : l'écran ne montre que les
    // catégories ayant au moins 1 fiche publiée. Le mock doit donc fournir
    // pros_by_category peuplé (clés DB au singulier) pour les trois cartes.
    mockCounts.mockReturnValue({
      data: {
        pros_total: 12,
        pros_verified: 3,
        pros_by_category: { veterinaire: 5, toiletteur: 4, transporteur: 3 },
      },
      isLoading: false,
    });
    renderShowcase();
    expect(screen.getByTestId("pros-card-veterinaires")).toBeInTheDocument();
    expect(screen.getByTestId("pros-card-toiletteurs")).toBeInTheDocument();
    expect(screen.getByTestId("pros-card-transporteurs")).toBeInTheDocument();
    // Compteur présent (clé i18n rendue faute d'instance i18next en test)
    expect(screen.getByText(/landing\.pros\.counter/)).toBeInTheDocument();
  });
});
