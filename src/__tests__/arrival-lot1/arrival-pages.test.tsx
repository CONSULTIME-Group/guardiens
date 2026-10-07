/**
 * Lot 1, parcours d'arrivée v2 : écrans rendus, routes enchaînées et
 * écritures attendues (C4, P1, P2, P3, P4), plus l'inscription drapeau
 * éteint / allumé.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@/i18n";
import { MemoryRouter } from "react-router-dom";
const R = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

(globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
const navigateMock = vi.fn();
let search = new URLSearchParams();
let authUser: Record<string, unknown> | null = null;
const writes: Array<{ table: string; op: string; row: unknown }> = [];
const rpcCalls: Array<{ fn: string; args: any }> = [];
let ownerRow: Record<string, unknown> | null = null;
let profileRow: Record<string, unknown> = {};
let propertyCount = 0;
let rpcCount: Record<number, number> = {};
let flag = { enabled: false, appliesSince: null as string | null, loading: false };

vi.mock("react-router-dom", async (orig) => {
  const real: any = await orig();
  return { ...real, useNavigate: () => navigateMock, useSearchParams: () => [search, vi.fn()] };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authUser, refreshProfile: vi.fn(), register: vi.fn() }),
}));
vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: () => flag }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(), trackEventWithUserId: vi.fn(), mapSignupError: () => "x" }));
vi.mock("@/lib/myProfile", () => ({
  fetchMyProfile: () => Promise.resolve({ data: profileRow, error: null }),
  fetchMyOwnerProfile: () => Promise.resolve({ data: ownerRow, error: null }),
}));
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));
vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const q: any = {
      select: (_c?: string, opts?: any) => {
        if (opts?.head) return { eq: () => Promise.resolve({ count: propertyCount, error: null }) };
        return q;
      },
      eq: () => q,
      maybeSingle: () => Promise.resolve({ data: table === "sits" ? { id: "s1", title: "Garde", cover_photo_url: null, start_date: "2026-12-19", end_date: "2027-01-03", city: "Lyon" } : null, error: null }),
      update: (row: unknown) => { writes.push({ table, op: "update", row }); return { eq: () => Promise.resolve({ error: null }) }; },
      insert: (row: unknown) => { writes.push({ table, op: "insert", row }); return Promise.resolve({ error: null }); },
      upsert: (row: unknown) => { writes.push({ table, op: "upsert", row }); return Promise.resolve({ error: null }); },
    };
    return q;
  };
  return {
    supabase: {
      from: chain,
      rpc: (fn: string, args: any) => {
        rpcCalls.push({ fn, args });
        if (fn === "count_eligible_sitters") return Promise.resolve({ data: rpcCount[args.p_radius_km] ?? 0, error: null });
        if (fn === "get_public_stats") return Promise.resolve({ data: [], error: null });
        return Promise.resolve({ data: null, error: null });
      },
      auth: { getUser: () => Promise.resolve({ data: { user: { user_metadata: { given_name: "Marie" } } } }), resend: vi.fn() },
    },
  };
});

beforeEach(() => {
  cleanup();
  navigateMock.mockReset();
  writes.length = 0;
  rpcCalls.length = 0;
  search = new URLSearchParams();
  ownerRow = null;
  profileRow = {};
  propertyCount = 0;
  rpcCount = {};
  flag = { enabled: false, appliesSince: null, loading: false };
  authUser = { id: "u1", role: "owner", firstName: "Marie", arrivalWelcomeSeenAt: null };
});

describe("Inscription C1", () => {
  it("drapeau éteint : trois rôles proposés", async () => {
    const { default: Register } = await import("@/pages/Register");
    R(<Register />);
    expect(await screen.findByText(/Les deux|polyvalent/i)).toBeTruthy();
    expect(screen.queryByTestId("arrival-c1")).toBeNull();
  });
  it("drapeau allumé : deux cartes, lien entraide", async () => {
    flag = { enabled: true, appliesSince: "2026-10-01T00:00:00Z", loading: false };
    const { default: Register } = await import("@/pages/Register");
    R(<Register />);
    expect(await screen.findByText("Je cherche un gardien")).toBeTruthy();
    expect(screen.getByText("Je veux garder")).toBeTruthy();
    expect(screen.getByText("Je viens pour un coup de main ou un projet")).toBeTruthy();
    fireEvent.click(screen.getByText("Je cherche un gardien"));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(await screen.findByText("Créez votre compte")).toBeTruthy();
    expect(screen.getByText("Modifier")).toBeTruthy();
  });
});

describe("Parcours propriétaire v2", () => {
  it("C4 : une seule fois, puis P1", async () => {
    search = new URLSearchParams({ next: "/sits/create?source=signup" });
    const { default: Bienvenue } = await import("@/pages/arrival/Bienvenue");
    R(<Bienvenue />);
    fireEvent.click(await screen.findByRole("button", { name: "Faisons connaissance" }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(`/arrivee/vous?next=${encodeURIComponent("/sits/create?source=signup")}`, { replace: true }));
    expect(writes.find((w) => w.table === "profiles")?.row).toHaveProperty("arrival_welcome_seen_at");

    cleanup(); navigateMock.mockReset();
    profileRow = { arrival_welcome_seen_at: "2026-10-07T10:00:00Z" };
    const r = R(<Bienvenue />);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/sits/create?source=signup", { replace: true }));
    expect(r.container.textContent).toBe("");
  });

  it("P1 : type requis, logement sans valeurs par défaut, puis P2", async () => {
    search = new URLSearchParams({ next: "/sits/create?source=signup" });
    profileRow = { first_name: "", postal_code: "69001", city: "Lyon", country: "FR" };
    const { default: ArriveeVous } = await import("@/pages/arrival/ArriveeVous");
    R(<ArriveeVous />);
    const btn = await screen.findByRole("button", { name: "Continuer" });
    expect((screen.getByLabelText("Comment vous appelez-vous ?") as HTMLInputElement).value).toBe("Marie");
    expect(btn).toHaveProperty("disabled", true);
    expect(screen.getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Appartement" }));
    fireEvent.click(btn);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(`/arrivee/depart?next=${encodeURIComponent("/sits/create?source=signup")}`));
    expect(writes.find((w) => w.table === "properties")?.row).toEqual({ user_id: "u1", type: "apartment", environment: null, rooms_count: null, bedrooms_count: null });
    expect(writes.find((w) => w.table === "profiles")?.row).toMatchObject({ first_name: "Marie", onboarding_minimal_completed: true });
  });

  it("P2 : compte issu de count_eligible_sitters, élargi à 30 km, puis annonce express", async () => {
    profileRow = { first_name: "Marie", city: "Lyon", latitude: 45.7, longitude: 4.8 };
    rpcCount = { 20: 3, 30: 8, 50: 12 };
    const { default: ArriveeDepart } = await import("@/pages/arrival/ArriveeDepart");
    R(<ArriveeDepart />);
    const box = await screen.findByTestId("arrival-nearby");
    expect(box.textContent).toBe("8 gardiens sont inscrits à moins de 30 km de Lyon.");
    expect(rpcCalls.filter((c) => c.fn === "count_eligible_sitters").map((c) => c.args.p_radius_km)).toEqual([20, 30]);
    fireEvent.click(screen.getByRole("radio", { name: "Noël et jour de l'an" }));
    fireEvent.click(screen.getByRole("button", { name: "Préparer mon annonce" }));
    expect(navigateMock).toHaveBeenCalledWith("/sits/create?express=1&periode=noel&debut=2026-12-19&fin=2027-01-03&source=signup");
  });

  it("P2 : encart masqué à 0 gardien à 50 km", async () => {
    profileRow = { first_name: "Marie", city: "Lyon", latitude: 45.7, longitude: 4.8 };
    const { default: ArriveeDepart } = await import("@/pages/arrival/ArriveeDepart");
    R(<ArriveeDepart />);
    await waitFor(() => expect(rpcCalls.filter((c) => c.fn === "count_eligible_sitters")).toHaveLength(3));
    expect(screen.queryByTestId("arrival-nearby")).toBeNull();
  });

  it("P3 : langues existantes gardées, carte de confirmation, puis P4", async () => {
    search = new URLSearchParams({ sit: "s1" });
    ownerRow = { user_id: "u1", languages: ["Français", "Anglais"], presence_expected: "Télétravail OK", preferred_sitter_types: ["Couple"], life_pace: "calme" };
    const { default: ArriveeAffinites } = await import("@/pages/arrival/ArriveeAffinites");
    R(<ArriveeAffinites />);
    expect(await screen.findByTestId("arrival-published")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Anglais" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Français" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/arrivee/aussi?sit=s1"));
    const row = writes.find((w) => w.table === "owner_profiles")?.row as Record<string, unknown>;
    expect(row.languages).toEqual(["Français", "Anglais"]);
    expect(row).not.toHaveProperty("interests");
  });

  it("P3 : sans ?sit=, carte masquée", async () => {
    ownerRow = null;
    const { default: ArriveeAffinites } = await import("@/pages/arrival/ArriveeAffinites");
    R(<ArriveeAffinites />);
    await screen.findByText("Décrivez qui vous voulez chez vous.");
    expect(screen.queryByTestId("arrival-published")).toBeNull();
  });

  it("P4 garder : change_user_role vers both puis bloc gardien", async () => {
    search = new URLSearchParams({ sit: "s1" });
    const { default: ArriveeAussi } = await import("@/pages/arrival/ArriveeAussi");
    R(<ArriveeAussi />);
    const cont = screen.getByRole("button", { name: "Continuer" });
    expect(cont).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: /Garder des maisons/ }));
    fireEvent.click(cont);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(`/onboarding/affinity?redirect=${encodeURIComponent("/sits/s1")}`));
    expect(rpcCalls.find((c) => c.fn === "change_user_role")?.args).toEqual({ p_user_id: "u1", p_new_role: "both" });
  });

  it("P4 coup de main : available_for_help puis savoir-faire", async () => {
    const { default: ArriveeAussi } = await import("@/pages/arrival/ArriveeAussi");
    R(<ArriveeAussi />);
    fireEvent.click(screen.getByRole("button", { name: /Donner un coup de main/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/profile?section=competences"));
    expect(writes.find((w) => w.table === "profiles")?.row).toEqual({ available_for_help: true });
  });
});
