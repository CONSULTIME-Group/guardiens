/**
 * Cas "code postal seul" sur /onboarding/affinity.
 *
 * Quand l'affinité est déjà complète mais que le code postal manque,
 * seul le champ postal doit être rendu. Les champs d'affinité partagée
 * (rythme de vie, centres d'intérêt, langues) ne doivent pas être
 * affichés, car ils ne seraient pas persistés.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Fragment as HelmetProvider } from "react";

const trackEventMock = vi.fn();

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", role: "sitter" },
    refreshProfile: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => ({ enabled: true, loading: false }),
}));

vi.mock("@/hooks/useAffinityOnboardingStatus", () => ({
  useAffinityOnboardingStatus: () => ({
    loading: false,
    needsOnboarding: true,
    needsSitter: false,
    needsOwner: false,
    needsPostal: true,
    profileCreatedAt: new Date().toISOString(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import OnboardingAffinity from "@/pages/OnboardingAffinity";

describe("OnboardingAffinity — code postal seul", () => {
  it("affiche le champ code postal mais pas les champs d'affinité partagée", () => {
    render(
      <HelmetProvider>
        <OnboardingAffinity />
      </HelmetProvider>,
    );

    expect(screen.getByLabelText("Votre code postal")).toBeInTheDocument();
    expect(screen.queryByText("Quel est votre rythme de vie ?")).not.toBeInTheDocument();
    expect(screen.queryByText("Vos centres d'intérêt (3 minimum recommandés)")).not.toBeInTheDocument();
    expect(screen.queryByText("Les langues que vous parlez")).not.toBeInTheDocument();
  });

  it("signale needs_postal dans l'ouverture du parcours", () => {
    render(
      <HelmetProvider>
        <OnboardingAffinity />
      </HelmetProvider>,
    );

    const shown = trackEventMock.mock.calls.find(([name]) => name === "onboarding_shown");
    expect(shown?.[1].metadata.needs_postal).toBe(true);
    expect(shown?.[1].metadata.needs_sitter).toBe(false);
    expect(shown?.[1].metadata.needs_owner).toBe(false);
  });
});
