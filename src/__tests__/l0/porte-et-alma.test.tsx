/**
 * Lot L0 (arène tableau de bord v2, 08/11/2026).
 *
 * 1. Porte : /dashboard est toujours ouvert. Relevé du 08/11 : 232 passages
 *    de /dashboard vers le questionnaire en 30 jours, 125 membres, délai
 *    médian 0,5 s.
 * 2. Alma : la rencontre est enregistrée dès l'affichage de la carte, qui reste
 *    visible pendant la visite. Le bouton principal et × la masquent.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, renderHook, waitFor, act, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isGateAlwaysOpenPath } from "@/lib/onboardingGateRules";

const updates: Array<Record<string, unknown>> = [];
let seenInDb = false;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", role: "owner" }, activeRole: "owner" }),
}));
vi.mock("@/hooks/useAlmaFrequency", () => ({
  useAlmaFrequency: () => ({ frequency: "balanced", setFrequency: vi.fn() }),
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/myProfile", () => ({
  fetchMyProfile: vi.fn(async () => ({ data: { alma_first_meeting_seen: seenInDb }, error: null })),
  patchMyProfileCache: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: [] })),
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { alma_frequency: "balanced" } }) }) }),
      insert: () => Promise.resolve({ error: null }),
      update: (patch: Record<string, unknown>) => ({
        eq: () => {
          updates.push(patch);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));

import { useAlmaFirstMeeting } from "@/hooks/useAlmaFirstMeeting";
import { AlmaFirstMeeting } from "@/components/ai/alma/AlmaFirstMeeting";
import { AlmaProvider } from "@/contexts/AlmaContext";

beforeEach(() => {
  updates.length = 0;
  seenInDb = false;
});

describe("lot L0, porte du tableau de bord", () => {
  it("/dashboard et ses variantes restent ouverts", () => {
    expect(isGateAlwaysOpenPath("/dashboard")).toBe(true);
    expect(isGateAlwaysOpenPath("/dashboard?feuille=dates")).toBe(true);
    expect(isGateAlwaysOpenPath("/dashboardx")).toBe(false);
  });

  it("la recherche et le profil gardent le questionnaire", () => {
    expect(isGateAlwaysOpenPath("/search")).toBe(false);
    expect(isGateAlwaysOpenPath("/profile")).toBe(false);
  });
});

describe("lot L0, rencontre d'Alma enregistrée à l'affichage", () => {
  it("recordSeen enregistre en base et garde la carte visible", async () => {
    const { result } = renderHook(() => useAlmaFirstMeeting());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
    act(() => result.current.recordSeen());
    await waitFor(() => expect(updates).toEqual([{ alma_first_meeting_seen: true }]));
    expect(result.current.shouldShow).toBe(true);
  });

  it("un seul enregistrement, même avec un clic ensuite", async () => {
    const { result } = renderHook(() => useAlmaFirstMeeting());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
    act(() => result.current.recordSeen());
    await act(async () => { await result.current.markSeen(); });
    expect(updates).toHaveLength(1);
    expect(result.current.shouldShow).toBe(false);
  });

  it("rencontre déjà enregistrée : la carte reste masquée", async () => {
    seenInDb = true;
    const { result } = renderHook(() => useAlmaFirstMeeting());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it("la carte appelle onSeen une fois à l'affichage, onDone au clic", async () => {
    const onSeen = vi.fn();
    const onDone = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AlmaProvider>
            <AlmaFirstMeeting role="owner" onDone={onDone} onSeen={onSeen} />
          </AlmaProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(onSeen).toHaveBeenCalledTimes(1));
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Masquer Alma" }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onSeen).toHaveBeenCalledTimes(1);
  });

  it("câblage : les deux tableaux de bord passent onSeen", () => {
    for (const f of ["src/components/dashboard/OwnerDashboard.tsx", "src/components/dashboard/SitterDashboard.tsx"]) {
      expect(readFileSync(f, "utf8")).toContain("onSeen={recordAlmaFirstMeetingSeen}");
    }
  });
});
