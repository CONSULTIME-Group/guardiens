import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NearestListingHero from "../NearestListingHero";
import SitterNextGuardEmpty from "../SitterNextGuardEmpty";

// ─── Mocks pour SitterEmergencyCard (Auth + Supabase) ───
// Pas de user → la fonction load() retourne tôt et n'appelle pas Supabase ;
// le composant rend uniquement à partir des données d'aperçu (previewMode).
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const makeChain = (): any => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      gte: () => chain,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      // Thenable: when awaited directly, resolves to empty list
      then: (resolve: any) => resolve({ data: [], error: null }),
    };
    return chain;
  };
  return {
    supabase: {
      from: () => makeChain(),
    },
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

// Force `import.meta.env.DEV = true` pour activer les modes aperçu (no-op en pratique
// car Vitest tourne en dev, mais explicite l'intention).
import SitterEmergencyCard from "../SitterEmergencyCard";

const renderWithRouter = (ui: React.ReactElement, route = "/") =>
  render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);

const setPreviewParam = (mode: "locked" | "eligible" | "active" | null) => {
  const search = mode ? `?previewEmergency=${mode}` : "";
  window.history.replaceState({}, "", `/${search}`);
};

beforeEach(() => {
  setPreviewParam(null);
});

// ─────────────────────────────────────────────────────────
// NearestListingHero
// ─────────────────────────────────────────────────────────
describe("NearestListingHero", () => {
  const baseListing = {
    id: "sit-1",
    title: "Garde d'un golden retriever",
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    start_date: "2026-06-10",
    end_date: "2026-06-15",
    is_urgent: false,
    properties: { type: "Maison", photos: [] },
  };

  it("ne rend rien sans listing", () => {
    const { container } = renderWithRouter(<NearestListingHero listing={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("snapshot — annonce nouvelle (<48h), pas urgente, sans photo", () => {
    const { asFragment } = renderWithRouter(<NearestListingHero listing={baseListing} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("snapshot — annonce urgente (badge Urgent prioritaire sur Nouveau)", () => {
    const { asFragment } = renderWithRouter(
      <NearestListingHero listing={{ ...baseListing, is_urgent: true }} />
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("snapshot — annonce ancienne (>48h), avec photo, sans badge", () => {
    const { asFragment } = renderWithRouter(
      <NearestListingHero
        listing={{
          ...baseListing,
          created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
          properties: { type: "Appartement", photos: ["https://example.com/p.jpg"] },
        }}
      />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});

// ─────────────────────────────────────────────────────────
// SitterNextGuardEmpty
// ─────────────────────────────────────────────────────────
describe("SitterNextGuardEmpty", () => {
  it("snapshot — état vide stable", () => {
    const { asFragment } = renderWithRouter(<SitterNextGuardEmpty />);
    expect(asFragment()).toMatchSnapshot();
  });
});

// ─────────────────────────────────────────────────────────
// SitterEmergencyCard — 3 vues via mode aperçu
// ─────────────────────────────────────────────────────────
describe("SitterEmergencyCard — modes aperçu", () => {
  const flush = async () => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  };

  it("snapshot — vue LOCKED (critères non remplis)", async () => {
    setPreviewParam("locked");
    const { asFragment } = renderWithRouter(
      <SitterEmergencyCard hasEmergencyProfile={false} />
    );
    await flush();
    expect(asFragment()).toMatchSnapshot();
  });

  it("snapshot — vue ELIGIBLE (tous critères OK, pas encore activé)", async () => {
    setPreviewParam("eligible");
    const { asFragment } = renderWithRouter(
      <SitterEmergencyCard hasEmergencyProfile={false} />
    );
    await flush();
    expect(asFragment()).toMatchSnapshot();
  });

  it("snapshot — vue ACTIVE (profil créé, pilotage inline)", async () => {
    setPreviewParam("active");
    const { asFragment } = renderWithRouter(
      <SitterEmergencyCard hasEmergencyProfile={true} />
    );
    await flush();
    expect(asFragment()).toMatchSnapshot();
  });
});
