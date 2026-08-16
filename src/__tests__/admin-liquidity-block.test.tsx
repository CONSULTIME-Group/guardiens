/**
 * Verrouillage du bloc Liquidité de /admin (passe du 16/08/2026) :
 *   1. jamais de taux ni de médiane sans dénominateur visible ;
 *   2. sous 5 d'effectif, compte brut + mention « effectif trop faible »,
 *      jamais de pourcentage ;
 *   3. états de repli : squelette au chargement, erreur explicite.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LiquiditySnapshot } from "@/pages/admin/_components/dashboard/useDashboardData";

const mocks = vi.hoisted(() => ({
  state: {
    data: undefined as LiquiditySnapshot | undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
}));

vi.mock("@/pages/admin/_components/dashboard/useDashboardData", () => ({
  useLiquiditySnapshot: () => mocks.state,
}));

import { LiquidityBlock } from "@/pages/admin/_components/dashboard/LiquidityBlock";

/** Chiffres réels relevés en base le 16/08/2026. */
const REAL_SNAPSHOT: LiquiditySnapshot = {
  active_sits: 8,
  eligible_sitters: 24,
  pending_applications: 29,
  oldest_pending_days: 9,
  median_response_hours: 9,
  median_response_count: 29,
  conversion_percent: 25,
  conversion_confirmed: 5,
  conversion_total: 20,
};

describe("LiquidityBlock", () => {
  beforeEach(() => {
    mocks.state.data = undefined;
    mocks.state.isLoading = false;
    mocks.state.isError = false;
  });

  it("affiche les dénominateurs sur la médiane et la conversion", () => {
    mocks.state.data = REAL_SNAPSHOT;
    render(<LiquidityBlock />);
    expect(screen.getByText("Liquidité de la place de marché")).toBeInTheDocument();
    expect(screen.getByText("90 derniers jours")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Gardiens éligibles : 24")).toBeInTheDocument();
    expect(screen.getByText("29")).toBeInTheDocument();
    expect(screen.getByText("9,0 h")).toBeInTheDocument();
    expect(screen.getByText("(n = 29)")).toBeInTheDocument();
    expect(screen.getByText("25 %")).toBeInTheDocument();
    expect(screen.getByText("(5/20)")).toBeInTheDocument();
  });

  it("sous 5 d'effectif : compte brut et mention, jamais de taux", () => {
    mocks.state.data = {
      ...REAL_SNAPSHOT,
      median_response_count: 3,
      conversion_percent: 50,
      conversion_confirmed: 2,
      conversion_total: 4,
    };
    render(<LiquidityBlock />);
    expect(screen.getAllByText(/effectif trop faible/)).toHaveLength(2);
    expect(screen.getByText("2/4")).toBeInTheDocument();
    expect(screen.queryByText("50 %")).not.toBeInTheDocument();
  });

  it("affiche le squelette au chargement et l'erreur en échec", () => {
    mocks.state.isLoading = true;
    const { unmount } = render(<LiquidityBlock />);
    expect(screen.getByText("Chargement des indicateurs…")).toBeInTheDocument();
    unmount();
    mocks.state.isLoading = false;
    mocks.state.isError = true;
    render(<LiquidityBlock />);
    expect(
      screen.getByText("Les indicateurs de liquidité n'ont pas pu être chargés."),
    ).toBeInTheDocument();
  });
});
