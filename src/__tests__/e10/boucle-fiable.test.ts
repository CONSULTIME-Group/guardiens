/**
 * Lot E10 (11/10/2026) : un besoin publié est toujours situé ; une rencontre
 * confirmée le reste.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { MISSION_PLACE_NOT_FOUND, resolveMissionCoords } from "@/lib/missionPlace";

describe("E10, lieu situé avant publication", () => {
  it("centre de la commune choisie d'abord, sans autre appel", async () => {
    const geocode = vi.fn();
    expect(await resolveMissionCoords({ fieldCoords: { lat: 1, lng: 2 }, postalCode: "79600", city: "Assais-les-Jumeaux" }, geocode)).toEqual({ lat: 1, lng: 2 });
    expect(geocode).not.toHaveBeenCalled();
  });
  it("annuaire officiel des communes avant le géocodeur", async () => {
    const geocode = vi.fn();
    const lookup = vi.fn(async () => ({ lat: 5, lng: 6 }));
    expect(await resolveMissionCoords({ fieldCoords: null, postalCode: "98714", city: "Papeete" }, geocode, lookup)).toEqual({ lat: 5, lng: 6 });
    expect(lookup).toHaveBeenCalledWith("98714", "Papeete");
    expect(geocode).not.toHaveBeenCalled();
  });
  it("puis le code postal, puis la commune, en France", async () => {
    const geocode = vi.fn(async (q: string) => (q === "79600" ? null : { lat: 3, lng: 4 }));
    expect(await resolveMissionCoords({ fieldCoords: null, postalCode: "79600", city: "Assais-les-Jumeaux" }, geocode)).toEqual({ lat: 3, lng: 4 });
    expect(geocode).toHaveBeenNthCalledWith(1, "79600", "FR");
    expect(geocode).toHaveBeenNthCalledWith(2, "Assais-les-Jumeaux", "FR");
  });
  it("lieu introuvable : aucune coordonnée, la publication attend", async () => {
    const geocode = vi.fn(async () => null);
    expect(await resolveMissionCoords({ fieldCoords: null, postalCode: "704", city: "Mascouche" }, geocode)).toBeNull();
    expect(MISSION_PLACE_NOT_FOUND).not.toMatch(/[–—]/);
    expect(MISSION_PLACE_NOT_FOUND).not.toMatch(/\bne\b|\bpas\b|\bjamais\b/i);
  });
  it("le formulaire bloque sans lieu et masque l'option étranger", () => {
    const src = readFileSync("src/pages/CreateSmallMission.tsx", "utf8");
    expect(src).toContain("resolveMissionCoords(");
    expect(src).toContain("if (!coords) {");
    expect(src).toContain("showAbroadToggle={false}");
    expect(src).toContain("setPlaceCoords({ lat: partial.latitude, lng: partial.longitude })");
    expect(src).toContain("(partial.city !== undefined && partial.city !== city) || partial.postal_code !== undefined");
  });
});

describe("E10, migration", () => {
  const sql = readFileSync("supabase/prepared-migrations/20261011230000_e10_boucle_fiable.sql", "utf8");
  it("un « non » après rencontre confirmée ne change plus le statut", () => {
    expect(sql).toContain("ELSIF m.status = 'cancelled' OR (m.status = 'completed' AND m.close_reason IS NOT DISTINCT FROM 'meetup_confirmed') THEN");
    expect(sql).toContain("AND status <> 'cancelled'");
    expect(sql).toContain("s.status, s.close_reason, s.date_needed");
  });
  it("coordonnées des besoins ouverts, bornées et sauvegardées", () => {
    expect(sql).toContain("_backup_mission_coords_e10_20261011");
    expect(sql).toContain("WHERE s.id = v.id AND s.latitude IS NULL");
    expect(sql).toContain("IF v_count > 3 THEN RAISE EXCEPTION");
  });
});

describe("E10, géocodage", () => {
  it("une panne passagère se retente, seule une commune introuvable est mémorisée", () => {
    const src = readFileSync("src/lib/geocode.ts", "utf8");
    expect(src).toContain('data.error === "City not found"');
  });
});
