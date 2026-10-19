/**
 * Lot SEO1 (19/10/2026) : les refus « monthly_budget_exceeded » (ok = false)
 * sortent du compte des 30 jours, côté détecteur et côté seo_reserve_render
 * (migration préparée, non appliquée). La Vue d'ensemble affiche la reprise
 * estimée et l'arriéré quand le voyant « Rendu SEO » est rouge.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  blockingRenderOffset,
  CONSUMER_RENDER_CEILING,
  estimatedResumeAt,
  prerenderResumeSentence,
} from "@/lib/admin/prerenderResume";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const calls = vi.hoisted(() => ({ list: [] as Array<{ table: string; ops: Array<[string, unknown[]]> }> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async () => ({
      data: [{ key: "seo", label: "Rendu SEO", state: "alert", detail: "Plafond mensuel atteint", link: "/admin/prerender" }],
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
  it("non appliquée : aucun fichier drizzle ne la reprend", () => {
    expect(read("drizzle/migrations/meta/_journal.json")).not.toContain("seo1");
  });
});

describe("reprise estimée", () => {
  it("rien ne bloque sous le plafond", () => {
    expect(blockingRenderOffset(CONSUMER_RENDER_CEILING - 1)).toBeNull();
    expect(blockingRenderOffset(CONSUMER_RENDER_CEILING)).toBe(0);
    expect(blockingRenderOffset(18970)).toBe(9070);
  });
  it("reprise = rendu bloquant + 30 jours", () => {
    expect(estimatedResumeAt("2026-10-08T09:10:16Z")!.toISOString()).toBe("2026-11-07T09:10:16.000Z");
    expect(estimatedResumeAt(null)).toBeNull();
  });
  it("phrase lisible", () => {
    const s = prerenderResumeSentence({ okRendersInWindow: 18970, resumeAt: new Date("2026-11-07T09:10:16Z"), backlog: 498 });
    expect(s).toBe("Plafond atteint : 18970 rendus sur 30 jours (plafond 9900), reprise estimée le 07/11/2026, 498 pages en attente de rendu.");
  });

  it("Vue d'ensemble : la ligne s'affiche sous le voyant rouge, refus exclus de la lecture", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><SiteHealthStrip /></MemoryRouter>
      </QueryClientProvider>,
    );
    const line = await screen.findByTestId("prerender-resume");
    expect(line.textContent).toContain("reprise estimée le 07/11/2026");
    expect(line.textContent).toContain("480 pages en attente de rendu");
    const logReads = calls.list.filter((c) => c.table === "prerender_recache_log");
    expect(logReads.length).toBe(2);
    for (const r of logReads) expect(r.ops).toContainEqual(["eq", ["ok", true]]);
  });
});
