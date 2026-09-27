import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { radiusLineText, ALERT_SETTINGS_PATH } from "@/components/entraide/MutualAidRadiusLine";

describe("gabarit mission-help-needed, phrase de distance", async () => {
  // Le gabarit importe des modules npm: ; on teste la logique exportée par lecture du source
  // puis le rendu du composant quand l'environnement le permet.
  const src = readFileSync("supabase/functions/_shared/transactional-email-templates/mission-help-needed.tsx", "utf8");
  const body = src.slice(src.indexOf("export function farDistanceLine"), src.indexOf("const MissionHelpNeededEmail"));
  // eslint-disable-next-line no-new-func
  const farDistanceLine = new Function(
    "FAR_DISTANCE_KM",
    `${body.replace("export function", "function").replace(/: number \| null \| undefined|\?: number \| null|: string \| null/g, "")}; return farDistanceLine;`,
  )(30) as (d?: number | null) => string | null;

  it("affiche la distance réelle au-delà de 30 km", () => {
    expect(farDistanceLine(42.6)).toBe("À 43 km de chez vous. Personne de plus proche pour le moment.");
  });
  it("n'affiche rien à 30 km ou moins, ni sans distance", () => {
    expect(farDistanceLine(30)).toBeNull();
    expect(farDistanceLine(4)).toBeNull();
    expect(farDistanceLine(null)).toBeNull();
    expect(farDistanceLine(undefined)).toBeNull();
  });
  it("conditionne phrase et lien au même test, libellé exact", () => {
    expect(src).toContain("{farLine && (");
    expect(src).toContain("Choisir la distance qui me convient");
    expect(src).toContain("/settings?section=alerts");
    expect(src).not.toMatch(/[—–]/);
  });
  it("notify-mission-wave transmet la distance au gabarit", () => {
    const fn = readFileSync("supabase/functions/notify-mission-wave/index.ts", "utf8");
    expect(fn).toContain("distanceKm: h.distance_km");
    expect(fn).toContain('rpc("detect_missions_without_audience")');
  });
});

describe("ligne de rayon", () => {
  it("formule exacte et réglage existant", () => {
    expect(radiusLineText(30)).toBe("Vous recevez les besoins dans un rayon de 30 km.");
    expect(ALERT_SETTINGS_PATH).toBe("/settings?section=alerts");
    const { container } = render(<p>{radiusLineText(50)}</p>);
    expect(container.textContent).toContain("50 km");
  });
});
