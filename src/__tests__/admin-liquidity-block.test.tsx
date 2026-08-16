/**
 * Verrouillage du bloc Liquidité de /admin (passe du 16/08/2026) :
 *   1. jamais de taux ni de médiane sans dénominateur visible ;
 *   2. sous 5 d'effectif, compte brut + mention « effectif trop faible »,
 *      jamais de pourcentage ;
 *   3. état d'erreur explicite si le RPC échoue.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

import { LiquidityBlock } from "@/pages/admin/_components/dashboard/LiquidityBlock";

/** Chiffres réels relevés en base le 16/08/2026. */
const REAL_SNAPSHOT = {
  window_days: 90,
  active_listings: 8,
  eligible_sitters: 24,
  pending_applications: 29,
  pending_oldest_days: 9,
  response_count: 29,
  response_median_hours: 9,
  conversion_accepted: 5,
  conversion_decided: 20,
  generated_at: "2026-08-16T08:00:00Z",
};

const renderBlock = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LiquidityBlock />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("LiquidityBlock", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
  });

  it("affiche chaque indicateur avec son dénominateur", async () => {
    mocks.rpc.mockResolvedValue({ data: REAL_SNAPSHOT, error: null });
    renderBlock();
    expect(await screen.findByText("Liquidité de la place de marché")).toBeInTheDocument();
    expect(screen.getByText(/Fenêtre glissante de 90 jours/)).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(
      screen.getByText(/24 gardiens éligibles à 100 km ou moins/),
    ).toBeInTheDocument();
    expect(screen.getByText("29")).toBeInTheDocument();
    expect(screen.getByText("Plus ancienne : 9 j")).toBeInTheDocument();
    expect(screen.getByText("9 h")).toBeInTheDocument();
    expect(screen.getByText("Sur 29 candidatures avec réponse")).toBeInTheDocument();
    expect(screen.getByText("5 sur 20")).toBeInTheDocument();
    expect(
      screen.getByText("Candidatures tranchées (acceptées ou rejetées)"),
    ).toBeInTheDocument();
  });

  it("sous 5 d'effectif : compte brut et mention, jamais de taux", async () => {
    mocks.rpc.mockResolvedValue({
      data: { ...REAL_SNAPSHOT, response_count: 3, conversion_accepted: 2, conversion_decided: 4 },
      error: null,
    });
    renderBlock();
    expect(
      await screen.findByText(/effectif trop faible pour une médiane/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Effectif trop faible pour un taux \(4 tranchées\)/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("affiche une erreur explicite si le RPC échoue", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    renderBlock();
    expect(
      await screen.findByText(
        "Chargement des indicateurs de liquidité impossible. Réessayez plus tard.",
      ),
    ).toBeInTheDocument();
  });
});
