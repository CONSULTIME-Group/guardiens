/** Real page and PageMeta, with inert reads and no production writes. */
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type Result = { data: any; error: any; count?: number };
const fixture = vi.hoisted(() => ({
  read: (_table: string, _id: string): Promise<Result> => Promise.resolve({ data: null, error: null }),
  calls: [] as string[],
  writes: [] as string[],
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    let id = "";
    const execute = () => { fixture.calls.push(table); return fixture.read(table, id); };
    const chain: any = {
      select: () => chain,
      eq: (key: string, value: string) => { if (["id", "user_id"].includes(key)) id = value; return chain; },
      in: () => chain, order: () => chain, limit: () => chain, range: () => chain,
      maybeSingle: execute,
      then: (ok: any, fail: any) => execute().then(ok, fail),
      insert: () => { fixture.writes.push("insert"); throw new Error("Write forbidden"); },
      update: () => { fixture.writes.push("update"); throw new Error("Write forbidden"); },
      delete: () => { fixture.writes.push("delete"); throw new Error("Write forbidden"); },
    };
    return chain;
  },
  rpc: (name: string, args: any) => { fixture.calls.push(name); return fixture.read(name, args?.p_user_id ?? ""); },
} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, hasSession: false, activeRole: null }) }));
vi.mock("@/hooks/useViewerSitterForAffinity", () => ({ useViewerSitterForAffinity: () => ({ sitter: null }) }));
vi.mock("@/hooks/useProfileReputation", () => ({ useProfileReputation: () => ({ data: null }), useUserBadges: () => ({ data: [] }) }));
vi.mock("@/hooks/useHeroWeights", () => ({ useHeroWeights: () => ({ animals: 40, home: 20, mutual_aid: 20, village: 20 }) }));
vi.mock("@/hooks/useCommunityPulse", () => ({ useCommunityPulse: () => ({ data: null }) }));
vi.mock("@/hooks/useAlmaCulturalFact", () => ({ useAlmaCulturalFact: () => undefined }));
vi.mock("@/components/layout/PublicHeader", () => ({ default: () => null }));
vi.mock("@/components/layout/PublicFooter", () => ({ default: () => null }));
import PublicSitterProfile from "@/pages/PublicSitterProfile";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const ok = (data: any = null): Result => ({ data, error: null });
const profile = { id: A, role: "sitter", first_name: "Alice", bio: "Une présentation réelle et détaillée pour prendre soin des animaux pendant les absences de leurs propriétaires.", identity_verified: true };
const meta = (name: string) => document.head.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? null;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}
function Navigation() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(`/gardiens/${B}`)}>Fiche B</button>;
}
function mount(id = A) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/gardiens/${id}`]}>
    <Navigation /><Routes><Route path="/gardiens/:id" element={<PublicSitterProfile />} /></Routes>
  </MemoryRouter></QueryClientProvider>);
}
async function expectFailure(status: 404 | 503) {
  await waitFor(() => expect(meta("prerender-status-code")).toBe(String(status)));
  expect(meta("robots")).toBe("noindex, follow");
  expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  expect(window.prerenderReady).toBe(true);
  expect(window.prerenderMetaPending).toBe(false);
}
beforeEach(() => {
  fixture.read = async () => ok();
  fixture.calls.length = 0;
  fixture.writes.length = 0;
  document.head.innerHTML = '<link rel="canonical" href="https://guardiens.fr/old"><meta name="prerender-status-code" content="200">';
  window.prerenderReady = false;
  window.prerenderMetaPending = false;
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); expect(fixture.writes).toEqual([]); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("public profile HTTP and loading", () => {
  it.each(["not-a-uuid", "undefined", "null"])("declares malformed id %s as 404 before its primary lookup", async (id) => {
    fixture.read = async (table) => table === "public_profiles" ? { data: null, error: { code: "22P02", message: "invalid UUID" } } : ok();
    mount(id);
    await expectFailure(404);
    expect(fixture.calls).not.toContain("public_profiles");
    expect(fixture.calls).not.toContain("gallery_photo_count");
  });
  it.each(["sitter", "both", "owner"])("renders a loaded %s profile with the shared role policy", async (role) => {
    fixture.read = async (table) => table === "public_profiles" ? ok({ ...profile, role }) : table === "gallery_photo_count" ? ok(0) : ok();
    mount();
    await waitFor(() => expect(window.prerenderReady).toBe(true));
    expect(meta("robots")).toBe(role === "owner" ? "noindex, follow" : "index, follow");
    expect(meta("prerender-status-code")).toBeNull();
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://guardiens.fr/gardiens/${A}`);
    expect(document.body.textContent).toContain("Alice");
  });
  it("declares a genuine absence as 404 without a canonical or a trust-count read", async () => {
    mount();
    await expectFailure(404);
    expect(fixture.calls).not.toContain("gallery_photo_count");
  });
  it("does not publish an orphan owner detail without the public identity", async () => {
    fixture.read = async (table) => ok(table === "public_owner_profiles" ? { user_id: A } : null);
    mount();
    await expectFailure(404);
  });
  it("distinguishes a returned public-read error from an absent profile", async () => {
    fixture.read = async (table) => table === "public_profiles" ? { data: null, error: { code: "503", message: "unavailable" } } : ok();
    mount();
    await expectFailure(503);
    expect(screen.getByText("Impossible de charger ce profil")).toBeInTheDocument();
  });
  it("declares a rejected lookup as 503", async () => {
    fixture.read = async (table) => { if (table === "public_profiles") throw new Error("offline"); return ok(); };
    mount();
    await expectFailure(503);
  });
  it("does not render a final profile when its SEO trust count failed", async () => {
    fixture.read = async (table) => table === "public_profiles" ? ok(profile) : table === "gallery_photo_count" ? { data: null, error: { message: "offline" } } : ok();
    mount();
    await expectFailure(503);
  });
  it("retries without keeping the temporary error metadata", async () => {
    fixture.read = async (table) => table === "public_profiles" ? { data: null, error: { message: "offline" } } : ok();
    mount();
    await expectFailure(503);
    fixture.read = async () => ok();
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    await expectFailure(404);
  });
  it("a late initial lookup cannot release the next URL while it is loading", async () => {
    const old = deferred<Result>();
    const current = deferred<Result>();
    fixture.read = async (table, id) => table === "public_profiles" ? (id === A ? old.promise : current.promise) : ok();
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Fiche B" }));
    await act(async () => { old.resolve(ok(profile)); });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(window.prerenderReady).toBe(false);
    expect(fixture.calls).not.toContain("gallery_photo_count");
    await act(async () => { current.resolve(ok()); });
    await expectFailure(404);
    expect(document.body.textContent).not.toContain("Alice");
  });
  it("a late gallery count cannot publish the previous identity on the next URL", async () => {
    const oldCount = deferred<Result>();
    const current = deferred<Result>();
    fixture.read = async (table, id) => {
      if (table === "public_profiles") return id === A ? ok(profile) : current.promise;
      if (table === "gallery_photo_count" && id === A) return oldCount.promise;
      return ok();
    };
    mount();
    await waitFor(() => expect(fixture.calls).toContain("gallery_photo_count"));
    fireEvent.click(screen.getByRole("button", { name: "Fiche B" }));
    await act(async () => { oldCount.resolve(ok(3)); });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(window.prerenderReady).toBe(false);
    await act(async () => { current.resolve(ok()); });
    await expectFailure(404);
    expect(document.body.textContent).not.toContain("Alice");
  });
});
