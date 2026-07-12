/**
 * Instrumentation d'abandon sur /onboarding/affinity.
 *
 * Vérifie qu'au démontage du composant sans complétion, un unique
 * `onboarding_abandoned` est émis avec `reason` renseigné.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";

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
    user: { id: "u1", role: "owner" },
    refreshProfile: vi.fn(),
    logout: vi.fn(),
  }),
}));

const mocks = vi.hoisted(() => ({ flagEnabled: true }));

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => ({ enabled: mocks.flagEnabled, loading: false }),
}));

vi.mock("@/hooks/useAffinityOnboardingStatus", () => ({
  useAffinityOnboardingStatus: () => ({
    loading: false,
    needsOnboarding: true,
    needsSitter: false,
    needsOwner: true,
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

describe("OnboardingAffinity — tracking d'abandon", () => {
  beforeEach(() => {
    trackEventMock.mockClear();
    mocks.flagEnabled = true;
  });

  it("émet un unique onboarding_abandoned avec reason au démontage sans complétion", () => {
    const { unmount } = render(
      <HelmetProvider>
        <OnboardingAffinity />
      </HelmetProvider>,
    );

    unmount();

    const abandonedCalls = trackEventMock.mock.calls.filter(
      ([name]) => name === "onboarding_abandoned",
    );
    expect(abandonedCalls).toHaveLength(1);

    const [, payload] = abandonedCalls[0];
    expect(payload.source).toBe("/onboarding/affinity");
    expect(payload.metadata.reason).toBe("navigate_away");
    expect(payload.metadata.step).toBeTruthy();
  });
});
