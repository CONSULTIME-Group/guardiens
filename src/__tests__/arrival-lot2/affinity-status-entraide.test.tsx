import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const auth = { user: { id: "u1", role: "both" } };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/myProfile", () => ({
  fetchMySitterProfile: () => Promise.resolve({ data: null }),
  fetchMyOwnerProfile: () => Promise.resolve({ data: null }),
  fetchMyProfile: () => Promise.resolve({ data: { postal_code: "69001", created_at: "2026-10-07T10:00:00Z", arrival_intent: "entraide" } }),
}));

describe("useAffinityOnboardingStatus, intention entraide", () => {
  it("ni bloc gardien ni bloc propriétaire, seul le code postal compte", async () => {
    const { useAffinityOnboardingStatus } = await import("@/hooks/useAffinityOnboardingStatus");
    const { result } = renderHook(() => useAffinityOnboardingStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.needsSitter).toBe(false);
    expect(result.current.needsOwner).toBe(false);
    expect(result.current.needsOnboarding).toBe(false);
  });
});
