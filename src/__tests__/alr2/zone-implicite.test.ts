// Lot ALR2 (14/11/2026) : alerte immédiate pour les gardiens sans zone d'alerte.
// Audit du système d'alertes du 14/11/2026, constat A2.
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  boundingBox,
  cacheCityKey,
  DEFAULT_ALERT_RADIUS_KM,
  DEFAULT_ZONE_SOURCE,
  defaultZonesFor,
} from "../../../supabase/functions/_shared/default-alert-zone";

const LYON = { lat: 45.764, lon: 4.8357 };
const OWNER = "owner";

describe("ALR2 · zone implicite de 30 km", () => {
  it("rayon décidé par Jérémie le 14/11/2026", () => {
    expect(DEFAULT_ALERT_RADIUS_KM).toBe(30);
  });

  it("sert les gardiens sans zone dans le rayon, et eux seuls", () => {
    const zones = defaultZonesFor(
      LYON,
      [
        { id: "villeurbanne", latitude: 45.7719, longitude: 4.8902 }, // 4 km
        { id: "vienne", latitude: 45.5255, longitude: 4.8745 }, // 27 km
        { id: "saint-etienne", latitude: 45.4397, longitude: 4.3872 }, // 50 km
        { id: "avec-zone", latitude: 45.77, longitude: 4.84 },
        { id: OWNER, latitude: 45.764, longitude: 4.8357 },
        { id: "sans-position", latitude: null, longitude: null },
      ],
      new Set(["avec-zone"]),
      OWNER,
    );
    expect(zones.map((z) => z.user_id)).toEqual(["villeurbanne", "vienne"]);
    for (const z of zones) {
      expect(z.zone_type).toBe("rayon");
      expect(z.radius_km).toBe(30);
      // Jamais « faite main » : elle reste sous le plafond par annonce.
      expect(z.source).toBe(DEFAULT_ZONE_SOURCE);
    }
  });

  it("rien sans position de l'annonce", () => {
    expect(defaultZonesFor({ lat: null, lon: null }, [{ id: "a", latitude: 45, longitude: 4 }], new Set(), OWNER)).toEqual([]);
  });

  it("le cadre de lecture couvre le rayon", () => {
    const b = boundingBox(LYON.lat, LYON.lon, 30);
    expect(b.maxLat - LYON.lat).toBeGreaterThan(30 / 111);
    expect(LYON.lon - b.minLon).toBeGreaterThan(30 / (111 * Math.cos((LYON.lat * Math.PI) / 180)));
  });

  it("clé de commune identique à lower(unaccent(city))", () => {
    expect(cacheCityKey("Vallon-Pont-d'Arc")).toBe("vallon-pont-d'arc");
    expect(cacheCityKey("Nîmes")).toBe("nimes");
    expect(cacheCityKey(null)).toBe("");
  });

  it("la fonction d'alerte lit la zone implicite et la position de repli", () => {
    const src = readFileSync("supabase/functions/notify-sitters-on-publish/index.ts", "utf8");
    expect(src).toMatch(/defaultZonesFor\(/);
    expect(src).toMatch(/for \(const zone of sitZones as any\[\]\)/);
    expect(src).toMatch(/from\("geocode_cache"\)/);
    // Une zone coupée par le membre compte comme un choix.
    expect(src).toMatch(/\.eq\("active", false\)/);
    // « France entière » enregistrée en region + FR compte comme France.
    expect(src).toMatch(/zone\.zone_type === "region" && zone\.region_code === "FR"\) return \{ match: true/);
    expect(src).toMatch(/departement, region_code, alert_types, active, source/);
    // Le choix « à chaque nouvelle annonce » reste la condition d'envoi.
    expect(src).toMatch(/sit_alert_frequency \?\? "immediate"\) !== "immediate"/);
  });
});
