/**
 * Tests du verrou de surface proactive Alma (`activeProactiveSurface`).
 *
 * 1. Matrice claim/release : priorités first_meeting > welcome_back > whisper.
 * 2. Intégration : WelcomeBackDigest ne s'affiche pas quand AlmaFirstMeeting
 *    a déjà claimé la surface.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AlmaProvider, useAlma } from "@/contexts/AlmaContext";
import { AlmaFirstMeeting } from "@/components/ai/alma/AlmaFirstMeeting";
import { WelcomeBackDigest } from "@/components/ai/alma/WelcomeBackDigest";

// AuthContext : user connecté en mode sitter
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", role: "sitter" },
    activeRole: "sitter",
  }),
}));

// Fréquence : balanced (Alma parle)
vi.mock("@/hooks/useAlmaFrequency", () => ({
  useAlmaFrequency: () => ({ frequency: "balanced", setFrequency: vi.fn() }),
}));

// Supabase : RPC / from stubbés
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async (name: string) => {
      if (name === "get_alma_blacklisted_types") return { data: [] };
      if (name === "get_activity_since_last_visit") {
        return {
          data: {
            new_messages: 3,
            new_applications: 0,
            new_sits_nearby: 0,
            new_intl_sitters: 0,
            new_intl_sits: 0,
            is_first_visit: false,
          },
        };
      }
      return { data: null };
    }),
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { alma_frequency: "balanced" } }) }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => ({
          eq: () => ({ is: () => Promise.resolve({ error: null }) }),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <HelmetProvider>
      <MemoryRouter>
        <AlmaProvider>{children}</AlmaProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  try {
    sessionStorage.clear();
  } catch {
    /* silent */
  }
});

describe("Alma surface lock — matrice claim/release", () => {
  it("claim libre réussit et pose la surface", () => {
    const { result } = renderHook(() => useAlma(), { wrapper: Wrapper });
    expect(result.current.activeProactiveSurface).toBeNull();
    let ok = false;
    act(() => {
      ok = result.current.claimProactiveSurface("whisper");
    });
    expect(ok).toBe(true);
    expect(result.current.activeProactiveSurface).toBe("whisper");
  });

  it("claim d'une priorité inférieure ou égale échoue", () => {
    const { result } = renderHook(() => useAlma(), { wrapper: Wrapper });
    act(() => {
      result.current.claimProactiveSurface("welcome_back");
    });
    let sameOk = true;
    let lowerOk = true;
    act(() => {
      sameOk = result.current.claimProactiveSurface("welcome_back");
      lowerOk = result.current.claimProactiveSurface("whisper");
    });
    expect(sameOk).toBe(false);
    expect(lowerOk).toBe(false);
    expect(result.current.activeProactiveSurface).toBe("welcome_back");
  });

  it("claim d'une priorité strictement supérieure déloge l'occupant", () => {
    const { result } = renderHook(() => useAlma(), { wrapper: Wrapper });
    act(() => {
      result.current.claimProactiveSurface("whisper");
    });
    let ok = false;
    act(() => {
      ok = result.current.claimProactiveSurface("first_meeting");
    });
    expect(ok).toBe(true);
    expect(result.current.activeProactiveSurface).toBe("first_meeting");
  });

  it("release ne libère que si l'appelant est bien l'occupant", () => {
    const { result } = renderHook(() => useAlma(), { wrapper: Wrapper });
    act(() => {
      result.current.claimProactiveSurface("welcome_back");
    });
    act(() => {
      result.current.releaseProactiveSurface("whisper");
    });
    expect(result.current.activeProactiveSurface).toBe("welcome_back");
    act(() => {
      result.current.releaseProactiveSurface("welcome_back");
    });
    expect(result.current.activeProactiveSurface).toBeNull();
  });
});

describe("Alma surface lock — intégration WelcomeBack vs FirstMeeting", () => {
  it("WelcomeBackDigest ne rend rien si AlmaFirstMeeting occupe déjà la surface", async () => {
    const onDone = vi.fn();
    const { container } = render(
      <Wrapper>
        <AlmaFirstMeeting role="sitter" onDone={onDone} />
        <WelcomeBackDigest />
      </Wrapper>,
    );

    // Le rite d'accueil est visible.
    await waitFor(() => {
      expect(container.textContent).toContain("Bonjour, je suis Alma");
    });

    // Le digest de retour ne pose pas sa bulle "Du nouveau…".
    expect(container.textContent).not.toContain("Du nouveau depuis votre dernière visite");
  });
});
