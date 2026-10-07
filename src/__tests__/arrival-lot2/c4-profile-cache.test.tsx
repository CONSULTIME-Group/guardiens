/**
 * Lot 2b : après C4 en intention entraide, le cache my-profile (rempli avant
 * C4) porte arrival_intent, et le garde-fou ne renvoie pas le membre vers
 * /onboarding/affinity depuis /dashboard.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { registerAppQueryClient } from "@/lib/appQueryClient";

const auth = { user: { id: "u1", role: "both", firstName: "Lea" }, loading: false, refreshProfile: () => Promise.resolve() };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(), trackEventWithUserId: vi.fn() }));
vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => ({ enabled: true, appliesSince: "2026-01-01T00:00:00Z", loading: false }),
  getFlag: () => Promise.resolve({ enabled: true, appliesSince: "2026-01-01T00:00:00Z" }),
}));

// Base simulée : le membre a un code postal, aucun profil gardien ni propriétaire.
const db: Record<string, Record<string, any> | null> = {};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: db[table] ?? null, error: null }) }) }),
      update: (patch: Record<string, any>) => ({
        eq: () => { db[table] = { ...(db[table] ?? {}), ...patch }; return Promise.resolve({ error: null }); },
      }),
    }),
  },
}));

let path = "";
const Where = () => { path = useLocation().pathname; return null; };

beforeEach(() => {
  db.profiles = { id: "u1", postal_code: "69001", created_at: "2026-10-07T10:00:00Z", arrival_intent: null, arrival_welcome_seen_at: null };
  db.sitter_profiles = null;
  db.owner_profiles = null;
  localStorage.setItem("guardiens_signup_intent", "entraide");
  registerAppQueryClient(new QueryClient({ defaultOptions: { queries: { retry: false } } }));
});

describe("lot 2b, cache du profil après C4", () => {
  it("entraide : cache rempli avant C4, aucune redirection vers /onboarding/affinity depuis /dashboard", async () => {
    const { fetchMyProfile } = await import("@/lib/myProfile");
    await fetchMyProfile("u1"); // cache rempli avant C4, sans intention

    const { default: Bienvenue } = await import("@/pages/arrival/Bienvenue");
    const c4 = render(
      <MemoryRouter initialEntries={["/bienvenue?next=/dashboard"]}>
        <Routes><Route path="*" element={<><Bienvenue /><Where /></>} /></Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Faisons connaissance" }));
    await waitFor(() => expect(path).not.toBe("/bienvenue"));
    c4.unmount();

    const cached = await fetchMyProfile("u1");
    expect(cached.data?.arrival_intent).toBe("entraide");

    const { default: OnboardingGate } = await import("@/components/onboarding/OnboardingGate");
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes><Route path="*" element={<><OnboardingGate /><Where /></>} /></Routes>
      </MemoryRouter>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(path).toBe("/dashboard");
  });
});
