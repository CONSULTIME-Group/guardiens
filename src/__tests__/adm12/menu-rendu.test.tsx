/**
 * Lot ADM12 : rendu réel du menu et de la lecture des signaux de la vue
 * d'ensemble (audit indépendant de la PR 266 : B1 et M2).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, waitFor, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const { rpcSpy } = vi.hoisted(() => ({ rpcSpy: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpcSpy(...a), from: vi.fn() },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1" }, logout: vi.fn(), isAuthenticated: true, loading: false }),
}));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));

import { AdminSidebar } from "@/components/admin/AdminSidebar";

const read = (p: string) => readFileSync(p, "utf8");
const renderSidebar = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}><MemoryRouter><AdminSidebar /></MemoryRouter></QueryClientProvider>,
  );
};

beforeEach(() => {
  rpcSpy.mockReset();
  try { localStorage.clear(); } catch { /* stockage indisponible */ }
});

describe("menu rendu", () => {
  it("Annonces allumée : l'entrée entière mène à la file filtrée, Messagerie sans pastille", async () => {
    rpcSpy.mockResolvedValue({ data: { sitsToStaff: 6, adminMessageFailed: 4 }, error: null });
    renderSidebar();
    const pill = await screen.findByTitle("6 annonces sans candidature depuis 48 h");
    expect(pill.closest("a")?.getAttribute("href")).toBe("/admin/listings?filter=to_staff");
    expect(screen.queryByTitle(/échecs d'envoi/)).toBeNull();
  });

  it("rien à traiter : Annonces mène à la liste", async () => {
    rpcSpy.mockResolvedValue({ data: { sitsToStaff: 0 }, error: null });
    renderSidebar();
    await waitFor(() => expect(rpcSpy).toHaveBeenCalled());
    const link = screen.getAllByRole("link").find((a) => a.textContent?.includes("Annonces"));
    expect(link?.getAttribute("href")).toBe("/admin/listings");
  });

  it("lecture en échec : « ? » sur le total des Outils aussi", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcSpy.mockResolvedValue({ data: null, error: { message: "boom" } });
    renderSidebar();
    const toggle = await screen.findByTestId("admin-tools-toggle");
    await waitFor(() => expect(toggle.textContent).toContain("?"), { timeout: 4000 });
    err.mockRestore();
  });
});

describe("vue d'ensemble : les annonces sans gardien dans le rayon sont lues", () => {
  it.each([
    "src/pages/admin/_components/dashboard/PilotageBlocks.tsx",
    "src/pages/admin/_components/dashboard/SignalsSection.tsx",
  ])("%s lit no_applications en sévérité info, comme la pastille", (p) => {
    const src = read(p);
    expect(src).toContain('.or("severity.neq.info,signal_type.eq.no_applications")');
    expect(src).not.toContain('.neq("severity", "info")');
  });
});

describe("migration : causes vérifiées en direct", () => {
  const sql = read("drizzle/migrations/0121_adm12_rouges_vrais.sql");
  it("voyant Emails : la file du matin ne compte que si des lignes d'avant le signal attendent", () => {
    const health = sql.slice(sql.indexOf("FUNCTION public.admin_site_health()"));
    expect(health).toMatch(/digest_queue_morning_backlog'\s+AND NOT EXISTS \(\s+SELECT 1 FROM public\.sitter_digest_queue q/);
  });
  it("les signaux se ferment chaque heure, plus seulement à 06 h 35", () => {
    expect(sql).toContain("'admin-signals-auto-resolve-hourly'");
    expect(sql).toContain("$cmd$SELECT public.auto_resolve_admin_signals();$cmd$");
  });
  it("aucune formulation négative dans les phrases ajoutées", () => {
    for (const bad of ["non suivie", "non partis", "non-envoi"]) expect(sql).not.toContain(bad);
  });
});
