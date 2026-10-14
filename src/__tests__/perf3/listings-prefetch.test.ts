/**
 * Lot perf 3 : lectures de /annonces lancées par le HTML pour un visiteur,
 * identiques à celles de loadSitBase, reprises une seule fois.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { LISTINGS_PREFETCH_SPEC, listingsPrefetchScript, PREFETCH_GLOBAL } from "../../../scripts/vite-plugin-listings-prefetch.mjs";
import { takeListingsPrefetch, PREFETCH_MAX_AGE_MS } from "@/lib/listingsPrefetch";

const run = (html: string) => new Function(html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""))();
const flush = () => new Promise((r) => setTimeout(r, 0));

const sit = { id: "s1", user_id: "o1", property_id: "p1" };
const closed = { id: "s2", user_id: "o2", property_id: null };

let calls: string[] = [];
beforeEach(() => {
  calls = [];
  localStorage.clear();
  (window as any)[PREFETCH_GLOBAL] = undefined;
  window.history.replaceState(null, "", "/annonces");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
    calls.push(url);
    expect(init.headers.apikey).toBe("anon");
    const path = url.split("/rest/v1/")[1];
    const body = path.startsWith("sits?") ? [sit] : path.startsWith("public_closed_sits?") ? [closed] : [{ id: "x" }];
    return { ok: true, json: async () => body } as any;
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("lectures lancées par le HTML (lot perf 3)", () => {
  it("parité : chaque lecture du script existe à l'identique dans loadSitBase", () => {
    const src = readFileSync("src/components/search/SearchSitter.tsx", "utf8");
    for (const [k, spec] of Object.entries(LISTINGS_PREFETCH_SPEC) as [string, any][]) {
      expect(src, k).toContain(`from("${spec.table}"`);
      expect(src, k).toContain(spec.select);
    }
    expect(src).toMatch(/\.or\(isPublic\s*\?\s*"status\.eq\.published"/);
    expect(src).toMatch(/order\("created_at", \{ ascending: false \}\)\.order\("id", \{ ascending: true \}\)/);
    expect(src).toMatch(/\.eq\("published", true\)/);
    expect(src).toMatch(/takeListingsPrefetch\(isPublic && !user && !startDate && !endDate\)/);
  });

  it("visiteur sur /annonces : deux salves, mêmes filtres, résultat complet", async () => {
    run(listingsPrefetchScript("https://x.supabase.co", "anon"));
    const slot = (window as any)[PREFETCH_GLOBAL];
    const data = await slot.p;
    expect(calls[0]).toBe("https://x.supabase.co/rest/v1/sits?select=id,user_id,property_id,title,slug,status,city,country,departement_code,start_date,end_date,created_at,unpublished_at,environments,is_urgent,cover_photo_url,accepting_applications,max_applications,property:properties!sits_property_id_fkey(type,environment,photos,cover_photo_url)&or=(status.eq.published)&order=created_at.desc,id.asc&offset=0&limit=1000");
    expect(calls[1]).toMatch(/public_closed_sits\?select=.*&order=id\.asc&offset=0&limit=1000$/);
    expect(calls.find((u) => u.includes("public_profiles?"))).toMatch(/id=in\.\(o1,o2\)&order=id\.asc/);
    expect(calls.find((u) => u.includes("public_pets?"))).toMatch(/property_id=in\.\(p1\)/);
    expect(calls.find((u) => u.includes("reviews?"))).toMatch(/reviewee_id=in\.\(o1,o2\)&published=eq\.true&order=id\.asc/);
    expect(Object.keys(data).sort()).toEqual(["badges", "closed", "gallery", "open", "ownerProfs", "owners", "pets", "reviews"]);
  });

  it("rien n'est lancé pour un membre, avec des dates, ou ailleurs que /annonces", async () => {
    localStorage.setItem("sb-abc-auth-token", "{}");
    run(listingsPrefetchScript("https://x.supabase.co", "anon"));
    localStorage.clear();
    window.history.replaceState(null, "", "/annonces?debut=2026-12-20");
    run(listingsPrefetchScript("https://x.supabase.co", "anon"));
    window.history.replaceState(null, "", "/annonces/garde-lyon");
    run(listingsPrefetchScript("https://x.supabase.co", "anon"));
    await flush();
    expect(calls).toHaveLength(0);
    expect((window as any)[PREFETCH_GLOBAL]).toBeUndefined();
  });

  it("une lecture pleine (1 000 lignes) ou en erreur rend null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => new Array(1000).fill(sit) })));
    run(listingsPrefetchScript("https://x.supabase.co", "anon"));
    expect(await (window as any)[PREFETCH_GLOBAL].p).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => [] })));
    run(listingsPrefetchScript("https://x.supabase.co", "anon"));
    expect(await (window as any)[PREFETCH_GLOBAL].p).toBeNull();
  });

  it("sans adresse ni clé au build, aucun script", () => {
    expect(listingsPrefetchScript("", "")).toBe("");
  });
});

describe("reprise par la recherche (lot perf 3)", () => {
  it("une seule fois, jamais hors éligibilité, jamais trop ancienne", async () => {
    run(listingsPrefetchScript("https://x.supabase.co", "anon"));
    expect(await takeListingsPrefetch(true)).not.toBeNull();
    expect(await takeListingsPrefetch(true)).toBeNull();

    run(listingsPrefetchScript("https://x.supabase.co", "anon"));
    expect(await takeListingsPrefetch(false)).toBeNull();
    expect((window as any)[PREFETCH_GLOBAL]).toBeNull();

    run(listingsPrefetchScript("https://x.supabase.co", "anon"));
    (window as any)[PREFETCH_GLOBAL].at -= PREFETCH_MAX_AGE_MS + 1;
    expect(await takeListingsPrefetch(true)).toBeNull();
  });
});
