import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { readAllRows } from "../../supabase/functions/_shared/read-all-rows.ts";

// Verrou LECT1 du 11/11/2026 : l'API coupe chaque réponse à 1 000 lignes.
describe("readAllRows", () => {
  const source = (total: number) => {
    const calls: Array<[number, number]> = [];
    const page = (from: number, to: number) => {
      calls.push([from, to]);
      const data = Array.from({ length: Math.max(0, Math.min(total, to + 1) - from) }, (_, i) => from + i);
      return Promise.resolve({ data, error: null });
    };
    return { page, calls };
  };

  it("lit toute la population au-delà de 1 000 lignes", async () => {
    const { page, calls } = source(1796);
    const rows = await readAllRows<number>(page);
    expect(rows).toHaveLength(1796);
    expect(new Set(rows).size).toBe(1796);
    expect(calls).toEqual([[0, 999], [1000, 1999]]);
  });

  it("s'arrête sur une page incomplète ou vide", async () => {
    expect(await readAllRows<number>(source(0).page)).toEqual([]);
    const exact = source(2000);
    expect(await readAllRows<number>(exact.page)).toHaveLength(2000);
    expect(exact.calls).toHaveLength(3);
  });

  it("remonte l'erreur de lecture", async () => {
    await expect(readAllRows(() => Promise.resolve({ data: null, error: new Error("lecture") }))).rejects.toThrow("lecture");
  });

  it("respecte le plafond de lignes", async () => {
    const rows = await readAllRows<number>(source(10_000).page, 1000, 3000);
    expect(rows).toHaveLength(3000);
  });
});

describe("populations lues par pages", () => {
  const cases: Array<[string, string]> = [
    ["supabase/functions/send-weekly-nearby-digest/index.ts", "email_preferences"],
    ["supabase/functions/notify-sitters-on-publish/index.ts", "alert_preferences"],
    ["supabase/functions/send-alert-digest/index.ts", "alert_preferences"],
  ];
  it.each(cases)("%s lit %s par readAllRows, avec un tri stable", (path, table) => {
    const text = readFileSync(path, "utf8");
    const start = text.indexOf("readAllRows<any>(");
    expect(start).toBeGreaterThan(-1);
    const block = text.slice(start, text.indexOf(".range(from, to)", start));
    expect(block).toContain(`.from("${table}")`);
    expect(block).toMatch(/\.order\("(id|user_id)", \{ ascending: true \}\)/);
  });
});
