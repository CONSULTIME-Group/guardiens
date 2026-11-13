/**
 * Lot GEO1 (13/11/2026) : relais Photon quand Nominatim refuse (403 mesuré le
 * 13/11 sur la fonction geocode). Réponses réelles de Photon capturées le 13/11.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { NOMINATIM_HEADERS, photonUrl, pickPhotonPlace } from "../../../supabase/functions/_shared/geocode-photon";

const fixture = (name: string) => JSON.parse(readFileSync(`src/__tests__/geo1/fixtures/${name}.json`, "utf8"));

describe("relais Photon", () => {
  it("trouve Genève, Saint-Ludger, Marrakech et Anvers dans leur pays", () => {
    const geneve = pickPhotonPlace(fixture("genve"), "ch");
    expect(geneve?.name).toBe("Genève");
    expect(geneve!.lat).toBeCloseTo(46.2, 1);
    expect(geneve!.lng).toBeCloseTo(6.15, 1);
    expect(pickPhotonPlace(fixture("saintludger"), "ca")?.name).toBe("Saint-Ludger");
    expect(pickPhotonPlace(fixture("marrakech"), "ma")?.lat).toBeCloseTo(31.6, 1);
    expect(pickPhotonPlace(fixture("anvers"), "be")?.lng).toBeCloseTo(4.4, 1);
  });

  it("écarte un lieu d'un autre pays que celui demandé", () => {
    expect(pickPhotonPlace(fixture("genve"), "fr")).toBeNull();
  });

  it("rend null sur une réponse vide ou malformée", () => {
    expect(pickPhotonPlace({ features: [] }, "ch")).toBeNull();
    expect(pickPhotonPlace(null, "ch")).toBeNull();
    expect(pickPhotonPlace({ features: [{ geometry: { coordinates: ["x", 1] }, properties: { countrycode: "CH" } }] }, "ch")).toBeNull();
  });

  it("à pertinence voisine, une ville passe devant un quartier", () => {
    const body = { features: [
      { geometry: { coordinates: [1, 2] }, properties: { countrycode: "BE", osm_value: "suburb", name: "Quartier" } },
      { geometry: { coordinates: [3, 4] }, properties: { countrycode: "BE", osm_value: "city", name: "Ville" } },
    ] };
    expect(pickPhotonPlace(body, "be")?.name).toBe("Ville");
  });

  it("limite la recherche aux lieux habités et au pays", () => {
    const url = photonUrl("Saint-Ludger", "ca");
    expect(url).toContain("osm_tag=place");
    expect(url).toContain("countrycode=CA");
    expect(url).toContain("q=Saint-Ludger");
  });

  it("s'identifie auprès de Nominatim avec un contact", () => {
    expect(NOMINATIM_HEADERS["User-Agent"]).toContain("contact@guardiens.fr");
  });

  it("la fonction appelle Photon seulement après un refus de Nominatim, et jamais pour un code postal", () => {
    const src = readFileSync("supabase/functions/geocode/index.ts", "utf8");
    expect(src.indexOf("photonUrl(")).toBeGreaterThan(src.indexOf("nominatim.openstreetmap.org/search"));
    expect(src).toContain("if (unavailable && !isFrPostal)");
    expect(src.indexOf("await allowOutbound()")).toBeLessThan(src.indexOf("photonUrl("));
  });
});
