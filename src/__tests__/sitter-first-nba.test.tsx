/**
 * Sanity tests : NBA nouveau gardien.
 * On teste le rendu isolé du composant (les mocks Supabase sont volontairement
 * légers, la logique de fetch est déjà couverte par affinityScore.test.ts).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SitterFirstNBA from "@/components/dashboard/SitterFirstNBA";
import NoNearbySitsEmptyState from "@/components/dashboard/NoNearbySitsEmptyState";
import type { AffinitySitCard } from "@/hooks/useSitterTopAffinitySits";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              contains: () => ({ limit: async () => ({ data: [] }) }),
            }),
          }),
        }),
      }),
    }),
    rpc: async () => ({ error: null }),
  },
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: () => {} }),
}));

const fakeSit = (i: number, score: number): AffinitySitCard => ({
  id: `sit-${i}`,
  title: `Annonce ${i}`,
  city: "Lyon",
  start_date: "2026-07-10",
  end_date: "2026-07-15",
  cover_photo_url: null,
  owner_first_name: "Alice",
  pet_species: ["dog"],
  affinity: { score, matched: ["Langue commune"], total: 5, displayed: true },
});

describe("SitterFirstNBA", () => {
  it("rend 3 cards quand topSits a 3 éléments", () => {
    const sits = [fakeSit(1, 85), fakeSit(2, 70), fakeSit(3, 55)];
    render(
      <MemoryRouter>
        <SitterFirstNBA sits={sits} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/3 annonces qui vous correspondent/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Annonce 1|Annonce 2|Annonce 3/i }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/Voir toutes les annonces/i)).toBeInTheDocument();
  });
});

describe("NoNearbySitsEmptyState", () => {
  it("affiche le CTA d'alerte et le volume total", () => {
    render(
      <MemoryRouter>
        <NoNearbySitsEmptyState totalPublishedSits={42} postalCode="69005" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Rien dans votre rayon aujourd'hui/i)).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /M'alerter/i })).toBeInTheDocument();
  });
});
