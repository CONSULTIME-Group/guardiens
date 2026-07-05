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
  it("affiche la section avec message 'bientôt' quand count = 0", () => {
    mockCount.mockReturnValue({ count: 0, recent: [], isLoading: false });
    renderStrip();
    expect(screen.getByTestId("intl-card-owner_fr")).toBeInTheDocument();
    expect(screen.getByTestId("intl-card-sitter_intl")).toBeInTheDocument();
    expect(screen.getByTestId("intl-card-community")).toBeInTheDocument();
  });

  it("affiche les 3 dernières annonces internationales dans la card community quand recent.length ≥ 1", () => {
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
    expect(screen.getByText(/Marrakech/)).toBeInTheDocument();
    expect(screen.getByText(/Lisbonne/)).toBeInTheDocument();
    expect(screen.getByText(/Bali/)).toBeInTheDocument();
  });
});
