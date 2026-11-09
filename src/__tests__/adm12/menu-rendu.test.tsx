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

// Lot ADM14 : une seule pastille, sur la vue d'ensemble, longueur de la liste de travail.
const line = (key: string) => ({ id: key, signal_type: "no_applications", severity: "warning", entity_type: "sit", entity_id: key, detected_at: "2026-11-01T10:00:00Z", metadata: {} });

describe("menu rendu", () => {
  it("la vue d'ensemble porte la pastille de la liste, aucune autre entrée", async () => {
    rpcSpy.mockResolvedValue({ data: { sources: {}, signals: [line("a"), line("b")], queues: [{ key: "reports", count: 2, oldest: null }], health: [] }, error: null });
    renderSidebar();
    const pill = await screen.findByTitle(/choses? à faire/);
    expect(pill.closest("a")?.getAttribute("href")).toBe("/admin");
    expect(screen.getAllByTestId("admin-badge")).toHaveLength(1);
    expect(rpcSpy).toHaveBeenCalledWith("admin_work_list");
    expect(rpcSpy).not.toHaveBeenCalledWith("admin_menu_badges");
  });

  it("rien à traiter : aucune pastille", async () => {
    rpcSpy.mockResolvedValue({ data: { sources: {}, signals: [], queues: [], health: [] }, error: null });
    renderSidebar();
    await waitFor(() => expect(rpcSpy).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryAllByTestId("admin-badge")).toHaveLength(0);
  });

  it("lecture en échec : « ? » sur la vue d'ensemble, Outils sans pastille", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcSpy.mockResolvedValue({ data: null, error: { message: "boom" } });
    renderSidebar();
    const pill = await screen.findByTitle("Liste de travail indisponible", undefined, { timeout: 4000 });
    expect(pill.textContent).toBe("?");
    expect(screen.getByTestId("admin-tools-toggle").textContent).not.toContain("?");
    err.mockRestore();
  });
});

describe("vue d'ensemble : les annonces sans gardien dans le rayon sont lues", () => {
  it("la liste de travail lit no_applications en sévérité info, comme la pastille (lot ADM13 : une lecture)", () => {
    expect(read("src/hooks/useWorkList.ts")).toContain('supabase.rpc("admin_work_list")');
    expect(read("drizzle/migrations/0126_adm13_une_liste.sql")).toContain("(severity IS DISTINCT FROM 'info' OR signal_type = 'no_applications')");
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
