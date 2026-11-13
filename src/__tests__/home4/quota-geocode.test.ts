/**
 * Lot HOME4 (13/11/2026) : quota des recherches geocode envoyées à Nominatim.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  GEOCODE_GLOBAL_BUCKET, GEOCODE_GLOBAL_HOURLY, GEOCODE_PER_CALLER_HOURLY,
  allowOutboundGeocode, callerAddress, callerBucket,
} from "../../../supabase/functions/_shared/geocode-quota";

const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

describe("quota geocode", () => {
  it("lit l'adresse de l'appelant, la première de la chaîne transmise", () => {
    expect(callerAddress(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(callerAddress(headers({ "cf-connecting-ip": "198.51.100.4", "x-forwarded-for": "203.0.113.7" }))).toBe("198.51.100.4");
    expect(callerAddress(headers({}))).toBe("inconnu");
  });

  it("range l'appelant sous une empreinte, jamais sous son adresse", async () => {
    const bucket = await callerBucket("203.0.113.7");
    expect(bucket).toMatch(/^ip_[0-9a-f]{32}$/);
    expect(bucket).not.toContain("203");
    expect(await callerBucket("203.0.113.7")).toBe(bucket);
    expect(await callerBucket("203.0.113.8")).not.toBe(bucket);
  });

  it("prend l'appelant puis le total, avec leurs limites", async () => {
    const calls: Array<[string, number]> = [];
    const ok = await allowOutboundGeocode("203.0.113.7", async (b, l) => { calls.push([b, l]); return true; });
    expect(ok).toBe(true);
    expect(calls[0][1]).toBe(GEOCODE_PER_CALLER_HOURLY);
    expect(calls[1]).toEqual([GEOCODE_GLOBAL_BUCKET, GEOCODE_GLOBAL_HOURLY]);
  });

  it("refuse un appelant au-delà de sa limite, sans entamer le total", async () => {
    const calls: string[] = [];
    const ok = await allowOutboundGeocode("203.0.113.7", async (b) => { calls.push(b); return false; });
    expect(ok).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("refuse quand le total de l'heure est atteint", async () => {
    expect(await allowOutboundGeocode("203.0.113.7", async (b) => b !== GEOCODE_GLOBAL_BUCKET)).toBe(false);
  });

  it("laisse passer quand le compteur est en panne", async () => {
    expect(await allowOutboundGeocode("203.0.113.7", async () => null)).toBe(true);
    expect(await allowOutboundGeocode("203.0.113.7", async () => { throw new Error("panne"); })).toBe(true);
  });

  it("la fonction prend le quota juste avant Nominatim, après le cache et le référentiel officiel", () => {
    const src = readFileSync("supabase/functions/geocode/index.ts", "utf8");
    const quota = src.indexOf("await allowOutbound()");
    expect(quota).toBeGreaterThan(src.indexOf("geocodeOfficialFr(cityName"));
    expect(quota).toBeLessThan(src.indexOf("nominatim.openstreetmap.org/search"));
    expect(src).toContain('rpc("geocode_quota_take"');
  });
});
