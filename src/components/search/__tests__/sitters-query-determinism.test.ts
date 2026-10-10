/**
 * Test 5 : déterminisme et complétude du vivier (SearchOwner).
 *
 * Lot 1 international : plus de plafond de 500. Le vivier est lu par la RPC
 * search_sitter_pool, trié par user_id puis paginé par pages de 1 000 jusqu'à
 * la dernière page incomplète.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const lib = readFileSync(resolve(process.cwd(), "src/lib/sitterSearch.ts"), "utf8");
const src = readFileSync(resolve(process.cwd(), "src/components/search/SearchOwner.tsx"), "utf8");

describe("déterminisme de la requête gardiens", () => {
  it("la lecture porte un .order(\"user_id\") explicite avant le .range()", () => {
    expect(lib).toMatch(/\.order\(\s*["'`]user_id["'`],\s*\{\s*ascending:\s*true\s*\}\s*\)\s*\.range\(/);
  });

  it("aucun plafond de tranche ne subsiste dans SearchOwner", () => {
    expect(src).not.toMatch(/SITTERS_SERVER_CAP/);
    expect(src).not.toMatch(/\.limit\(500\)/);
  });

  it("deux appels successifs sur le même jeu renvoient le même ordre", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ user_id: `u-${9 - i}` }));
    const sorted = [...rows].sort((a, b) => a.user_id.localeCompare(b.user_id));
    const rpc = vi.fn(() => {
      const chain: any = {
        order: () => chain,
        range: async (from: number, to: number) => ({ data: sorted.slice(from, to + 1), error: null }),
      };
      return chain;
    });
    vi.doMock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
    const { fetchSitterSearchPool } = await import("@/lib/sitterSearch");
    const a = (await fetchSitterSearchPool("FR")).map((r) => r.user_id);
    const b = (await fetchSitterSearchPool("FR")).map((r) => r.user_id);
    expect(a).toEqual(b);
    vi.doUnmock("@/integrations/supabase/client");
  });
});
