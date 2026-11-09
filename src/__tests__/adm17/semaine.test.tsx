import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, configure } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { trafficWindow } from "@/lib/admin/trafficWindow";
import { SURFACE_LABELS } from "@/lib/admin/labels";
import { __resetAdminReadErrors, UNAVAILABLE_LABEL } from "@/lib/admin/readError";

configure({ asyncUtilTimeout: 8000 });
vi.setConfig({ testTimeout: 20000 });

/** Lot ADM17 (lot 5 de l'arène) : les écrans de la semaine tiennent leurs chiffres. */

let fail = false;
const ERR = { message: "boom" };
function chain() {
  const proxy: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === "then") {
        const r = fail ? { data: null, count: null, error: ERR } : { data: [], count: 0, error: null };
        return (res: any, rej: any) => Promise.resolve(r).then(res, rej);
      }
      if (prop === "maybeSingle" || prop === "single") return () => Promise.resolve({ data: null, error: fail ? ERR : null });
      return () => proxy;
    },
  });
  return proxy;
}
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => chain(),
    rpc: () => Promise.resolve(fail ? { data: null, error: ERR } : { data: [], error: null }),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "admin-1" } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  },
}));
const wrap = (ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
};
const src = (f: string) => readFileSync(f, "utf8");

beforeEach(() => { fail = false; __resetAdminReadErrors(); });

describe("ADM17, Trafic : une fenêtre, un entonnoir", () => {
  it("7 jours = 168 heures glissantes, période comparée de même durée", () => {
    const now = new Date("2026-11-09T21:00:00Z");
    const w = trafficWindow(7, now);
    expect(now.getTime() - w.since.getTime()).toBe(7 * 24 * 3600 * 1000);
    expect(w.since.getTime() - w.sincePrev.getTime()).toBe(7 * 24 * 3600 * 1000);
  });

  it("inscrits hors comptes supprimés, tableau par rôle sans étapes à 0 d'office, un seul nom", () => {
    const a = src("src/pages/admin/AdminAnalytics.tsx");
    expect(a).toContain(".or(NOT_DELETED_FILTER)");
    expect(a).toContain("trafficWindow(range, now)");
    expect(a).toContain("ROLE_TABLE_STEPS.map");
    expect(a).not.toContain("Visite /inscription");
    expect(a).toContain("1. Inscription démarrée");
  });

  it("l'onglet du formulaire renvoie à l'entonnoir d'Activation interne", () => {
    const f = src("src/components/admin/AdminSignupFunnelTab.tsx");
    expect(f).toContain('data-testid="single-funnel-note"');
    expect(f).not.toContain("Entonnoir chiffré");
    expect(src("src/pages/admin/AdminTraffic.tsx")).toContain("Formulaire d'inscription");
  });

  it("dernier événement reçu, et non le dernier test GA4", () => {
    const g = src("src/components/admin/seo/GA4DiagnosticCard.tsx");
    const fn = g.slice(g.indexOf("const fetchLocalLast"), g.indexOf("const fetchLocalLast") + 500);
    expect(fn).not.toContain("admin_ga4_diag_test");
    expect(g).toContain("Dernier événement reçu par le site");
  });
});

describe("ADM17, Alma", () => {
  it("taux d'action : « Non mesuré » sans aucun clic", async () => {
    const { whisperActionMeasured } = await import("@/pages/admin/AdminAlma");
    expect(whisperActionMeasured({ emitted: 4242, actionRate: 0 })).toBe(false);
    expect(whisperActionMeasured({ emitted: 100, actionRate: 0.02 })).toBe(true);
    expect(whisperActionMeasured({ emitted: 0, actionRate: 0 })).toBe(true);
  });
  it("bulles : « … » pendant la lecture ; conversations : la période sans jour de plus", () => {
    expect(src("src/pages/admin/AdminAlma.tsx")).toContain('isError ? UNAVAILABLE_LABEL : isLoading ? "…" : v');
    expect(src("src/pages/admin/_components/alma/ConversationsTab.tsx")).toContain("Math.max(1, Math.round(");
  });
});

describe("ADM17, erreurs dites", () => {
  it("Pilotage entraide : blocs en échec, jamais « Bien joué »", async () => {
    fail = true;
    const { default: Tab } = await import("@/pages/admin/_components/MutualAidDashboardTab");
    wrap(<Tab />);
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((a) => a.textContent?.includes(UNAVAILABLE_LABEL))).toBe(true);
    expect(screen.queryByText("Aucune mission dormante. Bien joué.")).toBeNull();
    expect(screen.queryByText("Aucune clôture automatique enregistrée ce mois.")).toBeNull();
  });

  it("Affinité : lecture en échec dite, jamais « Aucune donnée »", async () => {
    fail = true;
    const mod = await import("@/pages/admin/_components/dashboard/AffinityPilotCard");
    const Card = (mod as any).default ?? (mod as any).AffinityPilotCard;
    wrap(<Card />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("Aucune donnée sur les 30 derniers jours.")).toBeNull();
  });

  it("libellés de surfaces en français, Paramètres sur la même définition", () => {
    for (const k of ["public_sit_detail", "owner_applications_list", "application_modal", "public_sitter_profile_rail", "public_owner_profile_rail"]) {
      expect(SURFACE_LABELS[k], k).toBeTruthy();
    }
    const s = src("src/pages/admin/AdminSettings.tsx");
    expect(s).toContain(".or(NOT_DELETED_FILTER)");
    expect(s).toContain("Membres (comptes supprimés exclus)");
  });
});
