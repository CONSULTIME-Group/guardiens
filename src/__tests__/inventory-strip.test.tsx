/**
 * InventoryStrip : rendu conditionnel selon les chiffres retournés par
 * `useInventaireCounts`, skeleton pendant le chargement, CTA vers l'observatoire.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/hooks/useImpressionOnce", () => ({ useImpressionOnce: () => false }));

const mockCounts = vi.fn();
vi.mock("@/hooks/useInventaireCounts", () => ({
  useInventaireCounts: () => mockCounts(),
}));

import InventoryStrip from "@/components/landing/InventoryStrip";

function renderStrip() {
  return render(
    <MemoryRouter>
      <InventoryStrip />
    </MemoryRouter>,
  );
}

describe("InventoryStrip", () => {
  it("affiche les 3 chiffres intégrés aux guides", () => {
    mockCounts.mockReturnValue({
      data: {
        cities_total: 54,
        breeds_total: 75,
        places_total: 1125,
        pros_total: 2,
        places_by_category: {},
        breeds_by_species: {},
        pros_by_category: {},
        generated_at: "",
      },
      isLoading: false,
    });
    renderStrip();
    expect(screen.getByTestId("inventory-card-cities")).toBeInTheDocument();
    expect(screen.getByTestId("inventory-card-breeds")).toBeInTheDocument();
    expect(screen.getByTestId("inventory-card-places")).toBeInTheDocument();
    expect(screen.queryByTestId("inventory-card-pros")).not.toBeInTheDocument();
  });

  it("masque la card dont la valeur est 0", () => {
    mockCounts.mockReturnValue({
      data: {
        cities_total: 54,
        breeds_total: 0,
        places_total: 1125,
        pros_total: 2,
        places_by_category: {},
        breeds_by_species: {},
        pros_by_category: {},
        generated_at: "",
      },
      isLoading: false,
    });
    renderStrip();
    expect(screen.queryByTestId("inventory-card-breeds")).not.toBeInTheDocument();
  });

  it("affiche 3 skeletons pendant le chargement", () => {
    mockCounts.mockReturnValue({ data: undefined, isLoading: true });
    renderStrip();
    expect(screen.getAllByTestId("inventory-skeleton")).toHaveLength(3);
  });
});
