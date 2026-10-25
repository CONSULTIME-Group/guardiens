// Lot E20 « Vague proche » : les réglages d'alerte suivent le plafond de 30 km
// de l'entraide, les gardes gardent 50 et 100 km.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ALLOWED_ALERT_RADII,
  MUTUAL_AID_MAX_RADIUS_KM,
  MUTUAL_AID_RADIUS_LINE,
  alertRadiusOptions,
  clampAlertRadius,
  showMutualAidRadiusLine,
} from "@/lib/alertRadius";

const NEG = /\b(ne|pas|jamais|aucun|aucune|rien)\b|n'|n’/i;

describe("rayons proposés", () => {
  it("Entraide seule : 30 km au plus", () => {
    expect(MUTUAL_AID_MAX_RADIUS_KM).toBe(30);
    expect(alertRadiusOptions(["missions"])).toEqual([5, 15, 30]);
  });
  it("Gardes, seules ou avec l'entraide : 50 et 100 km restent", () => {
    expect(alertRadiusOptions(["gardes"])).toEqual([...ALLOWED_ALERT_RADII]);
    expect(alertRadiusOptions(["gardes", "missions"])).toEqual([...ALLOWED_ALERT_RADII]);
  });
  it("une alerte Entraide seule redescend à 30 km", () => {
    expect(clampAlertRadius(100, ["missions"])).toBe(30);
    expect(clampAlertRadius(15, ["missions"])).toBe(15);
    expect(clampAlertRadius(100, ["gardes", "missions"])).toBe(100);
  });
});

describe("phrase pour l'entraide", () => {
  it("texte affirmatif, vouvoiement, sans tiret", () => {
    expect(MUTUAL_AID_RADIUS_LINE).toBe("Pour l'entraide, vous recevez les besoins à moins de 30 km.");
    expect(MUTUAL_AID_RADIUS_LINE).not.toMatch(NEG);
    expect(MUTUAL_AID_RADIUS_LINE).not.toMatch(/[—–]/);
  });
  it("affichée quand l'entraide est couverte au-delà de 30 km", () => {
    expect(showMutualAidRadiusLine(["gardes", "missions"], "rayon", 50)).toBe(true);
    expect(showMutualAidRadiusLine(["gardes", "missions"], "rayon", 30)).toBe(false);
    expect(showMutualAidRadiusLine(["gardes", "missions"], "departement", null)).toBe(true);
    expect(showMutualAidRadiusLine(["gardes"], "rayon", 100)).toBe(false);
    expect(showMutualAidRadiusLine(["missions"], "rayon", 15)).toBe(false);
  });
  it("câblée dans les réglages d'alerte et Mon secteur", () => {
    const alerts = readFileSync("src/components/settings/AlertsSection.tsx", "utf8");
    expect(alerts).toContain("const radiusOptions = alertRadiusOptions(formAlertTypes);");
    expect(alerts).toContain("setFormRadiusKm((r) => clampAlertRadius(r, formAlertTypes));");
    expect(alerts).toContain("{MUTUAL_AID_RADIUS_LINE}");
    expect(alerts).not.toContain("const radiusOptions = [5, 15, 30, 50, 100];");
    const secteur = readFileSync("src/pages/MonSecteur.tsx", "utf8");
    expect(secteur).toContain("{radius > MUTUAL_AID_MAX_RADIUS_KM && (");
  });
});
