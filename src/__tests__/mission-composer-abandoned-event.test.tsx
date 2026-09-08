/**
 * Test de comportement : l'événement mission_composer_abandoned doit porter
 * l'état réel au moment de l'abandon (étape atteinte, titre saisi), pas les
 * valeurs capturées au montage. Régression du défaut constaté : tableau de
 * dépendances vide, nettoyage fermé sur step = 1 et title = "".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const trackEventMock = vi.fn();

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
  trackFirstAction: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ data: [], error: null }) }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
    }),
    functions: { invoke: vi.fn() },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@/hooks/useAccessLevel", () => ({
  useAccessLevel: () => ({ level: "ok", profileCompletion: 100, identityRecommended: false, loading: false }),
  MIN_COMPLETION_TO_APPLY: 60,
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/components/PageMeta", () => ({ default: () => null }));
vi.mock("@/lib/geocode", () => ({ geocodeCity: vi.fn() }));

import CreateSmallMission from "@/pages/CreateSmallMission";

const mount = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CreateSmallMission />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("mission_composer_abandoned", () => {
  beforeEach(() => {
    trackEventMock.mockClear();
    cleanup();
  });

  it("porte last_step 2 et has_title vrai quand on abandonne à l'étape 2 avec un titre", () => {
    const { unmount } = mount();

    const input = screen.getByLabelText(/title_question_need/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Tondre ma pelouse samedi" } });

    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    // On est bien passé à l'étape 2 avant de démonter.
    expect(screen.getByText("Étape 2 / 3")).toBeTruthy();

    unmount();

    const abandoned = trackEventMock.mock.calls.find((c) => c[0] === "mission_composer_abandoned");
    expect(abandoned).toBeTruthy();
    const metadata = abandoned![1].metadata;
    expect(metadata.last_step).toBe(2);
    expect(metadata.has_title).toBe(true);
    expect(metadata.title_len).toBe("Tondre ma pelouse samedi".length);
  });

  it("porte last_step 1 et has_title faux quand on abandonne sans rien saisir", () => {
    const { unmount } = mount();
    unmount();

    const abandoned = trackEventMock.mock.calls.find((c) => c[0] === "mission_composer_abandoned");
    expect(abandoned).toBeTruthy();
    const metadata = abandoned![1].metadata;
    expect(metadata.last_step).toBe(1);
    expect(metadata.has_title).toBe(false);
    expect(metadata.title_len).toBe(0);
  });
});
