/**
 * Lot perf 16 (04/11/2026) : stabilité de l'accueil. Mesure réelle (analytics_events,
 * web_vital, mobile et tablette, 28 jours, guardiens.fr) : le pied de page (CLS moyen
 * 1,37 sur 8 vues) et « Comment ça marche » (0,55 sur 11 vues) glissaient quand la
 * vitrine « En ce moment » remplaçait son squelette, réduit à une barre de 32 px.
 * Le squelette garde désormais la structure et la hauteur de la vitrine chargée.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/components/landing/LiveListingsStrip.tsx", "utf8");
const skeleton = src.slice(src.indexOf("if (sitsLoading || loadingMissions) {"), src.indexOf("  return (\n    <section id=\"en-ce-moment\""));

describe("perf 16, squelette de la vitrine de l'accueil", () => {
  it("même section, mêmes marges verticales que la vitrine chargée", () => {
    expect(skeleton).toContain('py-[52px] scroll-mt-24 md:py-16');
  });

  it("six cartes de réserve, ratio 4/3 et corps de 162 px comme la vitrine", () => {
    expect(skeleton).toContain("[0, 1, 2, 3, 4, 5].map");
    expect(skeleton).toContain("aspect-[4/3]");
    expect(skeleton).toContain("h-[162px]");
  });

  it("titre et lien de bas de bande réservés", () => {
    expect(skeleton).toContain("md:h-12");
    expect(skeleton).toContain("mt-8 h-5");
  });
});
