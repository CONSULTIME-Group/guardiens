import { describe, it, expect, vi } from "vitest";

const TOTAL = 1326;
const ranges: Array<[number, number]> = [];
vi.mock("@/integrations/supabase/client", () => {
  const make = (head: boolean) => {
    const q: any = {
      select: () => q, in: () => q, neq: () => q, order: () => q,
      range: (a: number, b: number) => {
        ranges.push([a, b]);
        const n = Math.max(0, Math.min(b, TOTAL - 1) - a + 1);
        return Promise.resolve({ data: Array.from({ length: n }, (_, i) => ({ id: String(a + i) })), error: null });
      },
      then: (res: any) => Promise.resolve({ count: TOTAL, error: null }).then(res),
    };
    void head;
    return q;
  };
  return { supabase: { from: () => make(false) } };
});

import { fetchSitterPool, countSitterPool } from "@/lib/fetchSitterPool";

describe("vivier réel", () => {
  it("lit au-delà de 1 000 lignes par pages", async () => {
    const rows = await fetchSitterPool("id", "me");
    expect(rows).toHaveLength(TOTAL);
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
  });
  it("compte exactement", async () => {
    expect(await countSitterPool("me")).toBe(TOTAL);
  });
});
