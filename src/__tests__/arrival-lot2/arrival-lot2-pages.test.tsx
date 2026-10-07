/**
 * Lot 2, parcours d'arrivée v2 : parcours gardien (C4, G1 à G4), N1, entraide.
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
let sitterRow: Record<string, unknown> | null = null;
let support: "supported" | "ios-install" | "unsupported" = "supported";
const enablePushMock = vi.fn(() => Promise.resolve({ nearbyRequested: true, nearbySaved: true }));
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
  patchMyProfileCache: vi.fn(),
  fetchMyProfile: () => Promise.resolve({ data: profileRow, error: null }),
  fetchMyOwnerProfile: () => Promise.resolve({ data: ownerRow, error: null }),
  fetchMySitterProfile: () => Promise.resolve({ data: sitterRow, error: null }),
}));
vi.mock("@/lib/web-push", () => ({
  pushSupport: () => support,
  hasLocalPushSubscription: () => false,
  getPushConfig: () => Promise.resolve({ enabled: true, publicKey: "k" }),
  enablePush: (...a: any[]) => (enablePushMock as any)(...a),
}));
vi.mock("@/hooks/usePwaInstall", () => ({ usePwaInstall: () => ({ canPrompt: true, standalone: false, knownInstalled: false }) }));
vi.mock("@/lib/pwa-install", () => ({ requestInstall: vi.fn(() => Promise.resolve("accepted")) }));
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
  sitterRow = null;
  support = "supported";
  enablePushMock.mockClear();
  localStorage.clear();
  profileRow = {};
  propertyCount = 0;
  rpcCount = {};
  flag = { enabled: false, appliesSince: null, loading: false };
  authUser = { id: "u1", role: "owner", firstName: "Marie", arrivalWelcomeSeenAt: null };
});

describe("Parcours gardien v2", () => {
  it("C4 gardien : intention écrite, puis G1", async () => {
    authUser = { id: "u1", role: "sitter", firstName: "Marie" };
    search = new URLSearchParams({ next: "/dashboard" });
    const { default: Bienvenue } = await import("@/pages/arrival/Bienvenue");
    R(<Bienvenue />);
    fireEvent.click(await screen.findByRole("button", { name: "Faisons connaissance" }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/arrivee/vous?flow=sitter", { replace: true }));
    expect(writes.find((w) => w.table === "profiles")?.row).toMatchObject({ arrival_intent: "sitter" });
  });

  it("C4 entraide : intention entraide, redirection d'origine gardée", async () => {
    authUser = { id: "u1", role: "both", firstName: "Marie" };
    localStorage.setItem("guardiens_signup_intent", "entraide");
    search = new URLSearchParams({ next: "/annonces/abc" });
    const { default: Bienvenue } = await import("@/pages/arrival/Bienvenue");
    R(<Bienvenue />);
    fireEvent.click(await screen.findByRole("button", { name: "Faisons connaissance" }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(`/arrivee/vous?flow=entraide&next=${encodeURIComponent("/annonces/abc")}`, { replace: true }));
    expect(writes.find((w) => w.table === "profiles")?.row).toMatchObject({ arrival_intent: "entraide" });
  });

  it("G1 : prénom et commune écrits, sans logement, puis G2", async () => {
    authUser = { id: "u1", role: "sitter", firstName: "Marie" };
    search = new URLSearchParams({ flow: "sitter" });
    profileRow = { first_name: "", postal_code: "69001", city: "Lyon", country: "FR" };
    const { default: ArriveeVous } = await import("@/pages/arrival/ArriveeVous");
    R(<ArriveeVous />);
    expect(await screen.findByText("Une photo de vous (facultatif)")).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Appartement" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/arrivee/garder?flow=sitter"));
    expect(writes.find((w) => w.table === "profiles")?.row).toMatchObject({ first_name: "Marie", city: "Lyon", onboarding_minimal_completed: true });
    expect(writes.some((w) => w.table === "properties")).toBe(false);
  });

  it("G1 entraide : vers E1", async () => {
    search = new URLSearchParams({ flow: "entraide" });
    profileRow = { first_name: "", postal_code: "69001", city: "Lyon", country: "FR" };
    const { default: ArriveeVous } = await import("@/pages/arrival/ArriveeVous");
    R(<ArriveeVous />);
    fireEvent.click(await screen.findByRole("button", { name: "Continuer" }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/arrivee/entraide"));
  });

  it("G2 : réponses existantes gardées, véhicule écrit, puis G3", async () => {
    authUser = { id: "u1", role: "sitter", firstName: "Marie" };
    search = new URLSearchParams({ flow: "sitter" });
    sitterRow = { user_id: "u1", animal_types: ["Chats", "Chiens"], work_during_sit: "on_site", sitter_type: "Couple", languages: ["Français", "Anglais"] };
    const { default: ArriveeGarder } = await import("@/pages/arrival/ArriveeGarder");
    R(<ArriveeGarder />);
    expect((await screen.findByRole("button", { name: "Chats" })).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("g2-example")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Sur place et disponible toute la journée" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Oui" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/arrivee/vous-connaitre?flow=sitter"));
    const row = writes.find((w) => w.table === "sitter_profiles")?.row as Record<string, unknown>;
    expect(row).toMatchObject({ animal_types: ["Chats", "Chiens"], work_during_sit: "on_site", sitter_type: "Couple", has_vehicle: true });
    expect(row).not.toHaveProperty("languages");
  });

  it("G3 : langues existantes gardées, puis G4", async () => {
    authUser = { id: "u1", role: "sitter", firstName: "Marie" };
    search = new URLSearchParams({ flow: "sitter" });
    sitterRow = { user_id: "u1", languages: ["Français", "Anglais"], life_pace: "calme" };
    const { default: G3 } = await import("@/pages/arrival/ArriveeVousConnaitre");
    R(<G3 />);
    expect((await screen.findByRole("button", { name: "Anglais" })).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/arrivee/savoir-faire?flow=sitter"));
    expect((writes.find((w) => w.table === "sitter_profiles")?.row as any).languages).toEqual(["Français", "Anglais"]);
  });

  it("G4 : un savoir-faire pose available_for_help, puis N1", async () => {
    search = new URLSearchParams({ flow: "sitter" });
    profileRow = { competences: [] };
    const { default: G4 } = await import("@/pages/arrival/ArriveeSavoirFaire");
    R(<G4 />);
    fireEvent.click(await screen.findByRole("button", { name: "Jeux de société" }));
    fireEvent.click(screen.getByRole("button", { name: "Trajets en voiture" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/arrivee/application?flow=sitter"));
    expect(writes.find((w) => w.table === "profiles")?.row).toMatchObject({ competences: ["Jeux de société", "Trajets en voiture"], available_for_help: true });
  });

  it("G4 propriétaire : fin vers N1 puis l'annonce", async () => {
    search = new URLSearchParams({ flow: "owner", sit: "s1", aide: "1" });
    const { default: G4 } = await import("@/pages/arrival/ArriveeSavoirFaire");
    R(<G4 />);
    fireEvent.click(await screen.findByRole("button", { name: "Compléter plus tard" }));
    expect(navigateMock).toHaveBeenCalledWith("/arrivee/application?flow=owner&sit=s1&aide=1");
  });
});

describe("N1 application et notifications", () => {
  it("iPhone hors application : deux étapes, aucun appel à enablePush", async () => {
    support = "ios-install";
    search = new URLSearchParams({ flow: "sitter" });
    const { default: N1 } = await import("@/pages/arrival/ArriveeApplication");
    R(<N1 />);
    expect(await screen.findByTestId("n1-ios")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Activer les notifications" })).toBeNull();
    expect(enablePushMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("guardiens_arrival_n1_pending")).toBe("/arrivee/application?flow=sitter");
  });

  it("Android : installer puis activer, annonces proches cochées", async () => {
    search = new URLSearchParams({ flow: "sitter" });
    const { default: N1 } = await import("@/pages/arrival/ArriveeApplication");
    R(<N1 />);
    expect(await screen.findByRole("button", { name: "Installer" })).toBeTruthy();
    const enable = screen.getByRole("button", { name: "Activer les notifications" });
    await waitFor(() => expect(enable).toHaveProperty("disabled", false));
    fireEvent.click(enable);
    await waitFor(() => expect(enablePushMock).toHaveBeenCalled());
    expect((enablePushMock.mock.calls[0] as any[])[2]).toEqual({ messages: true, applications: true, nearbySits: true });
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/arrivee/premier-pas"));
  });

  it("propriétaire : variante et retour vers l'annonce", async () => {
    search = new URLSearchParams({ flow: "owner", sit: "s1" });
    const { default: N1 } = await import("@/pages/arrival/ArriveeApplication");
    R(<N1 />);
    expect(await screen.findByText("Soyez prévenu dès qu'un gardien candidate.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Plus tard" }));
    expect(navigateMock).toHaveBeenCalledWith("/sits/s1");
  });

  it("non pris en charge : écran sauté", async () => {
    support = "unsupported";
    search = new URLSearchParams({ flow: "sitter" });
    const { default: N1 } = await import("@/pages/arrival/ArriveeApplication");
    R(<N1 />);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/arrivee/premier-pas", { replace: true }));
  });
});
