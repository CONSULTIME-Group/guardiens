// Verrou du lot QUOTA1 (12/11/2026) : deux causes de rendus Prerender répétés
// (claude/diagnostic-quota-rendu-12-novembre-2026.md, pistes 1 et 3).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(p), "utf8");

describe("QUOTA1, compteurs de villes", () => {
  const src = read("supabase/functions/geocode-city-pages/index.ts");
  it("le recalcul ne part que si le passage a géocodé une page", () => {
    expect(src.match(/recalc_seo_city_nearby_counts"\)/g)).toHaveLength(1);
    expect(src).toMatch(/if \(geocodees > 0\) \{\s*const \{ error: rpcErr \} = await supabase\.rpc\("recalc_seo_city_nearby_counts"\)/);
  });
  it("la réponse dit si le recalcul a eu lieu", () => {
    expect(src).toContain("rejetees_coherence, recalcule, restantes");
  });
});

describe("QUOTA1, délai entre deux vagues", () => {
  const src = read("supabase/functions/detect-deploy-and-mark-dirty/index.ts");
  const num = (name: string) => Number(src.match(new RegExp(`const ${name} = (\\d+);`))?.[1]);
  it("120 heures entre deux vagues", () => {
    expect(num("MIN_MARK_INTERVAL_HOURS")).toBe(120);
  });
  it("le délai reste sous l'expiration du cache (7 jours) et ne dépasse pas le filet", () => {
    const hours = num("MIN_MARK_INTERVAL_HOURS");
    const net = num("FAMILY_MAX_AGE_DAYS");
    expect(net).toBe(5);
    expect(hours).toBeLessThanOrEqual(net * 24);
    expect(hours).toBeLessThan(7 * 24);
  });
});
