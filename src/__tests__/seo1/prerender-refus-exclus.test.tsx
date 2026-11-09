/**
 * Lot SEO1 (19/10/2026) : les refus « monthly_budget_exceeded » (ok = false)
 * sortent du compte des 30 jours, côté détecteur et côté seo_reserve_render
 * (migration appliquée le 19/10/2026, drizzle 0095). La Vue d'ensemble affiche la reprise
 * estimée et l'arriéré quand le voyant « Rendu SEO » est rouge.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONSUMER_RENDER_CEILING,
  nextRenderCycleStart,
  prerenderResumeSentence,
  renderCycleStart,
} from "@/lib/admin/prerenderResume";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const calls = vi.hoisted(() => ({ list: [] as Array<{ table: string; ops: Array<[string, unknown[]]> }> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    // Lot ADM14 : les voyants arrivent dans la liste de travail (admin_work_list).
    rpc: vi.fn(async () => ({
      data: { sources: { health: true }, signals: [], queues: [], health: [{ key: "seo", label: "Rendu SEO", state: "alert", detail: "Plafond mensuel atteint", link: "/admin/prerender" }] },
      error: null,
    })),
    from: (table: string) => {
      const entry = { table, ops: [] as Array<[string, unknown[]]> };
      calls.list.push(entry);
      const res = () => {
        if (table === "prerender_recache_log") {
          const isRange = entry.ops.some(([k]) => k === "range");
          return isRange ? { data: [{ created_at: "2026-10-08T09:10:16Z" }], error: null } : { count: 18970, data: null, error: null };
        }
        return { count: 120, data: null, error: null };
      };
      const b: any = new Proxy({}, {
        get: (_t, k: string) => {
          if (k === "then") return (ok: any, ko: any) => Promise.resolve(res()).then(ok, ko);
          return (...a: unknown[]) => (entry.ops.push([k, a]), b);
        },
      });
      return b;
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-1" } }) }));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));

import { SiteHealthStrip } from "@/pages/admin/_components/dashboard/SiteHealthStrip";

describe("détecteur : refus exclus du compte", () => {
  const src = read("supabase/functions/detect-deploy-and-mark-dirty/index.ts");
  it("les deux lectures du compte filtrent ok = true", () => {
    const reads = src.split('.from("prerender_recache_log")').slice(1).map((s) => s.slice(0, 260));
    const counts = reads.filter((r) => r.includes('count: "exact"'));
    expect(counts).toHaveLength(2);
    for (const r of counts) expect(r).toContain('.eq("ok", true)');
  });
  it("le refus reste journalisé avec ok = false", () => {
    expect(src).toContain('ok: globalReason !== "monthly_budget_exceeded"');
  });
});

describe("seo_reserve_render : migration préparée", () => {
  const sql = read("supabase/prepared-migrations/20261019120000_seo1_reserve_render_refus_exclus.sql");
  it("filtre ok = true dans le compte des 30 jours, même plafond", () => {
    expect(sql).toMatch(/WHERE created_at > clock_timestamp\(\) - interval '30 days' AND ok;/);
    expect(sql).toContain("IF used >= 9900 THEN RETURN false; END IF;");
    expect(sql).toMatch(/^BEGIN;$/m);
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.seo_reserve_render(uuid) TO service_role;");
  });
  it("appliquée le 19/10/2026 : drizzle 0095 reprend le filtre ok", () => {
    expect(read("drizzle/migrations/meta/_journal.json")).toContain("0095_seo1_rendu_et_associations");
    expect(read("drizzle/migrations/0095_seo1_rendu_et_associations.sql")).toContain("interval '30 days' AND ok");
  });
});

describe("reprise sur le cycle Prerender (lot ADM12, cycle du lot PR3)", () => {
  it("le cycle part du 4 du mois à 0 h, heure de Paris", () => {
    expect(renderCycleStart(new Date("2026-11-09T07:00:00Z")).toISOString()).toBe("2026-11-03T23:00:00.000Z");
    expect(renderCycleStart(new Date("2026-11-03T22:59:00Z")).toISOString()).toBe("2026-10-03T22:00:00.000Z");
    expect(renderCycleStart(new Date("2026-01-02T10:00:00Z")).toISOString()).toBe("2025-12-03T23:00:00.000Z");
  });
  it("la reprise tombe au début du cycle suivant", () => {
    expect(nextRenderCycleStart(new Date("2026-11-09T07:00:00Z")).toISOString()).toBe("2026-12-03T23:00:00.000Z");
    expect(nextRenderCycleStart(new Date("2026-12-20T07:00:00Z")).toISOString()).toBe("2027-01-03T23:00:00.000Z");
  });
  it("phrase lisible, sous et au plafond", () => {
    const cycleStart = new Date("2026-11-03T23:00:00Z");
    const nextCycleStart = new Date("2026-12-03T23:00:00Z");
    const sp = (t: string) => t.replace(/[\u202f\u00a0]/g, " ");
    expect(sp(prerenderResumeSentence({ okRendersInCycle: 1969, cycleStart, nextCycleStart, backlog: 0 })))
      .toBe("Rendu actif : 1 969 rendus depuis le 04/11/2026 (plafond 9 900), 0 page en attente de rendu.");
    // Au plafond, le voyant dit déjà « plafond atteint » : la ligne donne les chiffres et la reprise.
    expect(sp(prerenderResumeSentence({ okRendersInCycle: CONSUMER_RENDER_CEILING, cycleStart, nextCycleStart, backlog: 498 })))
      .toBe("9 900 rendus depuis le 04/11/2026 (plafond 9 900), reprise le 04/12/2026, 498 pages en attente de rendu.");
  });

  it("Vue d'ensemble : la ligne s'affiche sous le voyant rouge, refus exclus de la lecture", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><SiteHealthStrip /></MemoryRouter>
      </QueryClientProvider>,
    );
    const line = await screen.findByTestId("prerender-resume");
    expect(line.textContent!.replace(/[\u202f\u00a0]/g, " ")).toContain("18 970 rendus depuis le");
    expect(line.textContent).toContain("480 pages en attente de rendu");
    const logReads = calls.list.filter((c) => c.table === "prerender_recache_log");
    expect(logReads.length).toBe(1);
    for (const r of logReads) expect(r.ops).toContainEqual(["eq", ["ok", true]]);
  });
});
