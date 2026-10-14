/**
 * Lot H3 : les communes demandées au même instant partent en une requête,
 * une ancienne fonction (sans lot) repasse par l'appel unitaire, et une
 * commune située est gardée dans le navigateur pour la visite suivante.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

const coords: Record<string, { lat: number; lng: number }> = {
  Lyon: { lat: 45.76, lng: 4.83 },
  Vialas: { lat: 44.33, lng: 3.89 },
  Rodilhan: { lat: 43.82, lng: 4.43 },
};

beforeEach(() => {
  vi.resetModules();
  invoke.mockReset();
  localStorage.clear();
});

describe("géocodage groupé (lot H3)", () => {
  it("regroupe les communes demandées ensemble en un seul appel", async () => {
    invoke.mockImplementation(async (_fn: string, { body }: any) => ({
      data: { results: body.places.map((p: any) => ({ ...coords[p.city], city: p.city })) },
      error: null,
    }));
    const { geocodeCity } = await import("@/lib/geocode");
    const out = await Promise.all(["Lyon", "Vialas", "Rodilhan"].map((c) => geocodeCity(c, "FR")));
    expect(out.map((r) => r?.lat)).toEqual([45.76, 44.33, 43.82]);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][1].body.places).toHaveLength(3);
  });

  it("ancienne fonction sans lot : repli commune par commune", async () => {
    invoke.mockImplementation(async (_fn: string, { body }: any) => {
      if (body.places) return { data: { error: "Invalid city" }, error: { message: "400" } };
      return { data: { ...coords[body.city], city: body.city }, error: null };
    });
    const { geocodeCity } = await import("@/lib/geocode");
    const out = await Promise.all(["Lyon", "Vialas"].map((c) => geocodeCity(c, "FR")));
    expect(out.map((r) => r?.lng)).toEqual([4.83, 3.89]);
    expect(invoke.mock.calls.filter((c) => c[1].body.city)).toHaveLength(2);
  });

  it("une commune différée par le serveur est redemandée seule", async () => {
    invoke.mockImplementation(async (_fn: string, { body }: any) => {
      if (body.places) return { data: { results: [{ ...coords.Lyon, city: "Lyon" }, { error: "DEFERRED", fallback: true, lat: null, lng: null }] }, error: null };
      return { data: { ...coords[body.city], city: body.city }, error: null };
    });
    const { geocodeCity } = await import("@/lib/geocode");
    const [a, b] = await Promise.all([geocodeCity("Lyon", "FR"), geocodeCity("Vialas", "FR")]);
    expect(a?.lat).toBe(45.76);
    expect(b?.lat).toBe(44.33);
  });

  it("garde une commune située pour la visite suivante, jamais une commune introuvable", async () => {
    invoke.mockImplementation(async (_fn: string, { body }: any) => {
      if (body.city === "Nullepart") return { data: { error: "City not found", lat: null, lng: null }, error: null };
      return { data: { ...coords[body.city], city: body.city }, error: null };
    });
    let mod = await import("@/lib/geocode");
    await mod.geocodeCity("Lyon", "FR");
    await mod.geocodeCity("Nullepart", "FR");
    await new Promise((r) => setTimeout(r, 600));
    const stored = JSON.parse(localStorage.getItem("guardiens_geocode_v1") || "{}");
    expect(Object.keys(stored)).toEqual(["lyon::fr"]);

    vi.resetModules();
    invoke.mockReset();
    mod = await import("@/lib/geocode");
    expect((await mod.geocodeCity("Lyon", "FR"))?.lat).toBe(45.76);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("une erreur ou une exception rend null sans lever", async () => {
    invoke.mockImplementation(() => { throw new Error("timeout"); });
    const { geocodeCity } = await import("@/lib/geocode");
    await expect(Promise.all([geocodeCity("A-ville"), geocodeCity("B-ville")])).resolves.toEqual([null, null]);
  });
});

describe("liste des annonces sans point de recherche (lot H3)", () => {
  it("SearchSitter ne géocode pas avant d'afficher une recherche sans point", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/search/SearchSitter.tsx", "utf8");
    expect(src).toMatch(/searchCoords \? await locateSitPlaces\(items\) : new Map/);
    expect(src).toMatch(/deferredMapItemsRef\.current = searchCoords \? null : enriched/);
  });
});
