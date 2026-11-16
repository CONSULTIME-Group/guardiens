/** Lot RCM1 : un recache Prerender refait la copie téléphone, celle que Google indexe. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("supabase/functions/consume-seo-dirty/index.ts", "utf8");

describe("RCM1, recache de la copie téléphone", () => {
  it("le corps envoyé à Prerender porte adaptiveType mobile", () => {
    expect(src).toContain('const RECACHE_ADAPTIVE_TYPE = "mobile";');
    expect(src).toMatch(/adaptiveType: RECACHE_ADAPTIVE_TYPE/);
    expect(src).toContain("body: JSON.stringify(recacheBody(url, token))");
  });
  it("un seul appel recache par adresse (budget de rendus inchangé)", () => {
    expect(src.match(/api\.prerender\.io\/recache/g)?.length).toBe(1);
  });
});
