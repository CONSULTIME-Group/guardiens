import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { shouldRefresh, fetchOrCache } from "../../scripts/lib/sitemapCache.mjs";

/**
 * Garde-fou du 12/08/2026. Une clé d'invalidation nulle avait figé le sitemap
 * de production sur un état intermédiaire : `head === null` était compris comme
 * « rien n'a changé », donc l'entrée de cache était resservie éternellement.
 */
describe("cache du sitemap, clé d'invalidation nulle", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("force le rechargement quand la clé est nulle", () => {
    expect(shouldRefresh({ head: null, cached: { head: null }, hasEntries: true })).toBe(true);
    expect(shouldRefresh({ head: undefined, cached: { head: undefined }, hasEntries: true })).toBe(true);
  });

  it("réutilise le cache seulement quand la clé est identique et non nulle", () => {
    expect(shouldRefresh({ head: "abc", cached: { head: "abc" }, hasEntries: true })).toBe(false);
    expect(shouldRefresh({ head: "abc", cached: { head: "xyz" }, hasEntries: true })).toBe(true);
    expect(shouldRefresh({ head: "abc", cached: null, hasEntries: false })).toBe(true);
  });

  it("ne ressert jamais une entrée de cache avec une clé nulle", async () => {
    const cache = { sources: { s: { head: null } }, entries: { s: ["ancien"] } };
    const fetcher = vi.fn().mockResolvedValue([1]);
    const result = await fetchOrCache("s", cache, async () => null, fetcher, () => ["neuf"]);
    expect(fetcher).toHaveBeenCalled();
    expect(result).toEqual(["neuf"]);
  });

  it("journalise explicitement l'absence de clé", async () => {
    const warn = vi.spyOn(console, "warn");
    const cache = { sources: {}, entries: {} };
    await fetchOrCache("public_profiles", cache, async () => null, async () => [], () => []);
    expect(warn.mock.calls.flat().join(" ")).toContain("clé d'invalidation absente");
  });

  it("le générateur n'implémente pas sa propre logique de cache", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../scripts/generate-sitemap.mjs"),
      "utf-8",
    );
    expect(src).toContain('from "./lib/sitemapCache.mjs"');
    expect(src).not.toMatch(/cached\.head === head/);
  });
});
