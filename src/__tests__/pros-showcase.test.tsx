import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
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
    mockCounts.mockReturnValue({
      data: { pros_total: 12, pros_verified: 3 },
      isLoading: false,
    });
    renderShowcase();
    expect(screen.getByTestId("pros-card-veterinaires")).toBeInTheDocument();
    expect(screen.getByTestId("pros-card-toiletteurs")).toBeInTheDocument();
    expect(screen.getByTestId("pros-card-transporteurs")).toBeInTheDocument();
    // Counter contient les 2 valeurs formatées
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });
});
