/**
 * Lot perf 9 : en France, le géocodage serveur lit d'abord le centre officiel
 * de la commune (geo.api.gouv.fr), avant Nominatim, et ne met jamais en cache
 * un point douteux (homonymes, réponse illisible).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  geocodeOfficialFr,
  normalizeCommuneName,
  officialCommuneUrl,
  pickOfficialCommune,
} from "../../../supabase/functions/_shared/geocode-official-fr";

const commune = (nom: string, lng: number, lat: number, population = 1000) => ({ nom, population, centre: { type: "Point", coordinates: [lng, lat] } });

describe("centre officiel d'une commune (lot perf 9)", () => {
  it("Clarensac : une seule commune au nom exact", () => {
    expect(pickOfficialCommune([commune("Clarensac", 4.22, 43.82, 4300)], "Clarensac", false)).toEqual({ lat: 43.82, lng: 4.22, nom: "Clarensac" });
  });
  it("accents, casse, tirets et « St » ignorés", () => {
    expect(normalizeCommuneName("St-Étienne")).toBe(normalizeCommuneName("Saint Etienne"));
    expect(pickOfficialCommune([commune("Saint-Étienne", 4.39, 45.43)], "st etienne", false)?.nom).toBe("Saint-Étienne");
  });
  it("homonymes : aucun point, Nominatim garde la main", () => {
    expect(pickOfficialCommune([commune("Saint-Martin", 1, 45), commune("Saint-Martin", 2, 46)], "Saint-Martin", false)).toBeNull();
  });
  it("nom approchant seulement : aucun point", () => {
    expect(pickOfficialCommune([commune("Clarensac-le-Haut", 4.2, 43.8)], "Clarensac", false)).toBeNull();
  });
  it("code postal : la commune la plus peuplée", () => {
    const rows = [commune("Petite", 4.1, 45.1, 300), commune("Grande", 4.2, 45.2, 9000)];
    expect(pickOfficialCommune(rows, "69330", true)?.nom).toBe("Grande");
  });
  it("réponse illisible : aucun point", () => {
    expect(pickOfficialCommune(null, "Lyon", false)).toBeNull();
    expect(pickOfficialCommune([{ nom: "Lyon", centre: { coordinates: [0, 0] } }], "Lyon", false)).toBeNull();
    expect(pickOfficialCommune([{ nom: "Lyon" }], "Lyon", false)).toBeNull();
  });
  it("adresse de recherche par nom ou par code postal", () => {
    expect(officialCommuneUrl("Clarensac", false)).toContain("nom=Clarensac");
    expect(officialCommuneUrl("30870", true)).toContain("codePostal=30870");
  });
  it("réseau en panne ou réponse en erreur : null, jamais d'exception", async () => {
    const down = (() => Promise.reject(new Error("down"))) as unknown as typeof fetch;
    const http500 = (() => Promise.resolve({ ok: false, status: 500, json: async () => [] })) as unknown as typeof fetch;
    await expect(geocodeOfficialFr("Clarensac", false, down)).resolves.toBeNull();
    await expect(geocodeOfficialFr("Clarensac", false, http500)).resolves.toBeNull();
  });
  it("réponse valide : point rendu", async () => {
    const ok = (() => Promise.resolve({ ok: true, json: async () => [commune("Clarensac", 4.22, 43.82)] })) as unknown as typeof fetch;
    await expect(geocodeOfficialFr("Clarensac", false, ok)).resolves.toEqual({ lat: 43.82, lng: 4.22, nom: "Clarensac" });
  });
  it("la fonction geocode interroge la source officielle avant Nominatim", () => {
    const src = readFileSync("supabase/functions/geocode/index.ts", "utf8");
    const official = src.indexOf("await geocodeOfficialFr(");
    const nominatim = src.indexOf("nominatim.openstreetmap.org");
    expect(official).toBeGreaterThan(0);
    expect(official).toBeLessThan(nominatim);
  });
});
