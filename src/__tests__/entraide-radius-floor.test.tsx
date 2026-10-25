import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { radiusLineText, ALERT_SETTINGS_PATH } from "@/components/entraide/MutualAidRadiusLine";

describe("gabarit mission-help-needed, phrase de distance", async () => {
  // Lot E20 : la vague s'arrête à 30 km, la ligne « Personne de plus proche
  // pour le moment » et le lien de réglage du rayon sont sans objet.
  const src = readFileSync("supabase/functions/_shared/transactional-email-templates/mission-help-needed.tsx", "utf8");

  it("lot E20 : plus de ligne lointaine ni de lien de rayon, sans tiret", () => {
    expect(src).not.toContain("farDistanceLine");
    expect(src).not.toContain("Personne de plus proche pour le moment");
    expect(src).not.toContain("Choisir la distance qui me convient");
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
