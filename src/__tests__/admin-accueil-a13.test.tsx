/**
 * Lot A13 « Accueil lisible et rapide ».
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  inserts: [] as Array<{ table: string; row: any }>,
  failTables: new Set<string>(),
  failRpcs: new Set<string>(),
  calls: [] as string[],
}));

vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: () => ({ enabled: true, loading: false }) }));

vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    const res = () => (mocks.failTables.has(table)
      ? { data: null, count: null, error: { message: "boom" } }
      : { data: table === "admin_activity_analysis" ? null : [], count: 0, error: null });
    const b: any = {};
    ["select", "or", "gte", "in", "eq", "is", "neq", "order", "limit", "range", "not"].forEach((m) => { b[m] = () => b; });
    b.maybeSingle = () => Promise.resolve(res());
    b.upsert = () => Promise.resolve({ error: null });
    b.insert = (row: any) => { mocks.inserts.push({ table, row }); return Promise.resolve({ error: null }); };
    b.then = (ok: any, ko: any) => Promise.resolve(res()).then(ok, ko);
    return b;
  };
  return {
    supabase: {
      from: (t: string) => { mocks.calls.push(`from:${t}`); return builder(t); },
      rpc: (name: string) => {
        mocks.calls.push(`rpc:${name}`);
        if (mocks.failRpcs.has(name)) return Promise.resolve({ data: null, error: { message: "boom" } });
        if (name === "admin_liquidity_snapshot") {
          return Promise.resolve({ data: { window_days: 90, active_listings: 7, eligible_sitters: 3, pending_applications: 0, pending_oldest_days: null, response_count: 0, response_median_hours: null, conversion_accepted: 0, conversion_decided: 0, generated_at: "2026-09-29T00:00:00Z" }, error: null });
        }
        if (name === "admin_dashboard_snapshot") return Promise.resolve({ data: { signals: [], generated_at: "x" }, error: null });
        return Promise.resolve({ data: [], error: null });
      },
      functions: { invoke: (...a: any[]) => { mocks.calls.push("fn"); return mocks.invoke(...a); } },
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "admin-1" } } }) },
    },
  };
});

import AdminOverview from "@/pages/admin/AdminOverview";
import { saveAdminNote } from "@/lib/admin/adminNote";
import { auditActionLabel } from "@/lib/admin/labels";

const renderOverview = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><AdminOverview /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  mocks.invoke.mockReset();
  mocks.inserts.length = 0;
  mocks.calls.length = 0;
  mocks.failTables.clear();
  mocks.failRpcs.clear();
});

describe("Vue d'ensemble", () => {
  it("blocs dans l'ordre cible, sans Pilotage ni lanceur de campagne", async () => {
    const { container } = renderOverview();
    const order = [...container.querySelectorAll("[data-block]")].map((n) => n.getAttribute("data-block"));
    expect(order).toEqual(["chiffres", "a-traiter", "a-animer", "activite", "tendances", "crons", "analyse"]);
    await screen.findByText("Annonces en ligne");
    expect(screen.queryByText(/Pilotage/)).toBeNull();
    expect(screen.queryByText(/Réveiller les propriétaires/)).toBeNull();
    expect(screen.queryByText(/Bénévolat en association/)).toBeNull();
    const src = read("src/pages/admin/AdminOverview.tsx");
    expect(src).not.toMatch(/PilotageLinks|DashboardSkeleton|VolunteerAvailability|mass-email|send-mass/);
  });

  it("aucun appel de fonction serveur au montage, et moins de 16 lectures", async () => {
    renderOverview();
    await screen.findByText("7");
    await waitFor(() => expect(mocks.calls).toContain("rpc:admin_cron_health"));
    expect(mocks.calls).not.toContain("fn");
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.calls.length).toBeLessThanOrEqual(16);
  });

  it("une lecture en échec affiche Chiffre indisponible sans bloquer les autres blocs", async () => {
    mocks.failTables.add("profiles");
    mocks.failRpcs.add("admin_get_recent_applications_activity");
    renderOverview();
    expect(await screen.findByText("7")).toBeInTheDocument(); // liquidité intacte
    await waitFor(() => expect(screen.getAllByText("Chiffre indisponible").length).toBeGreaterThanOrEqual(2));
    expect(screen.getByText("À traiter")).toBeInTheDocument();
  });

  it("Tendances : recharts en import différé seulement", () => {
    const src = read("src/pages/admin/AdminOverview.tsx");
    expect(src).not.toMatch(/from "recharts"|DashboardCharts/);
    expect(src).toContain(`lazy(() => import("./_components/dashboard/TrendsPanel")`);
    for (const f of ["KeyFiguresRow", "RecentActivity", "CronHealthCard", "ActivityAnalysisCard", "useDashboardData", "LiquidityBlock"]) {
      const p = `src/pages/admin/_components/dashboard/${f}.${f.startsWith("use") ? "ts" : "tsx"}`;
      expect(read(p)).not.toMatch(/recharts|DashboardCharts/);
    }
  });
});

describe("Vérifications ID", () => {
  it("aucun appel de fonction au chargement, appel à l'ouverture d'un dossier", () => {
    const src = read("src/pages/admin/AdminVerifications.tsx");
    expect(src).not.toMatch(/hydrateIdentityAssets/);
    expect(src).toContain("setQueue(merged)");
    expect(src).toContain("setHistory(data || [])");
    const preview = src.indexOf('action: "preview"');
    const loader = src.indexOf("const loadAssets");
    expect(loader).toBeGreaterThan(-1);
    expect(preview).toBeGreaterThan(loader);
    expect(src).toContain("onClick={() => void loadAssets(user.id)}");
    expect(src).toContain("onClick={() => void openDocs(user)}");
  });
});

describe("Associations", () => {
  it("affiche le bloc Bénévolat en association", () => {
    const src = read("src/pages/admin/AdminAssociations.tsx");
    expect(src).toContain("<VolunteerAvailabilityCard />");
  });
});

describe("Note interne", () => {
  it("écrit une ligne update_admin_note avec 140 caractères au plus", async () => {
    const note = "x".repeat(200);
    const res = await saveAdminNote("u-1", note);
    expect(res.ok).toBe(true);
    const log = mocks.inserts.find((i) => i.table === "admin_action_logs");
    expect(log?.row).toMatchObject({ action: "update_admin_note", target_type: "user", target_id: "u-1", admin_id: "admin-1" });
    expect(log?.row.note).toHaveLength(140);
    expect(auditActionLabel("update_admin_note")).toBe("Note interne modifiée");
  });
});
