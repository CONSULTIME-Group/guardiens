/**
 * Lot F (11/10/2026) : fiche gardien ouverte, gouache en héros, conditions
 * de garde en section. Garde de structure et logique pure des libellés.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { aroundCity, gardeZoneLabel, noticeDelayLabel } from "@/lib/sitterProfileFacts";

const page = readFileSync("src/pages/PublicSitterProfile.tsx", "utf8");
const hero = readFileSync("src/components/profile/ProfileHero.tsx", "utf8");
const sections = readFileSync("src/components/profile/sitter/SitterF1Sections.tsx", "utf8");

describe("zone de garde : rayon et zones en une seule ligne", () => {
  it("élision devant une voyelle", () => {
    expect(aroundCity("Écully")).toBe("autour d'Écully");
    expect(aroundCity("Lyon")).toBe("autour de Lyon");
  });
  it("rayon déclaré et zones plus larges", () => {
    expect(gardeZoneLabel({ radiusKm: 40, city: "Écully", zoneLabels: ["Près de chez soi", "France entière"] }))
      .toBe("Jusqu'à 40 km autour d'Écully ; aussi : France entière");
  });
  it("rayon seul", () => {
    expect(gardeZoneLabel({ radiusKm: 20, city: "Lyon", zoneLabels: [] })).toBe("Jusqu'à 20 km autour de Lyon");
  });
  it("zones seules, sans rayon déclaré", () => {
    expect(gardeZoneLabel({ radiusKm: null, city: "Lyon", zoneLabels: ["Près de chez soi", "Europe"] }))
      .toBe("Près de chez soi ; aussi : Europe");
    expect(gardeZoneLabel({ radiusKm: null, city: "Lyon", zoneLabels: ["Europe"] })).toBe("Europe");
  });
  it("rien de déclaré : rien d'affiché", () => {
    expect(gardeZoneLabel({ radiusKm: null, city: "Lyon", zoneLabels: [] })).toBe("");
  });
});

describe("délai pour prévenir le gardien", () => {
  it("phrase lisible à partir du libellé du formulaire", () => {
    expect(noticeDelayLabel("2 semaines")).toBe("2 semaines avant la garde, idéalement");
    expect(noticeDelayLabel("")).toBe("");
  });
});

describe("structure de la fiche ouverte", () => {
  it("plus de spirale ni de feuille de 1024 px sur la fiche publique", () => {
    expect(page).toContain("profile-open");
    expect(page).not.toContain('className="profile-notebook-spiral"');
    expect(page).not.toContain("max-w-[1024px]");
  });
  it("gouache en héros entière, au plus à sa taille native", () => {
    expect(page).toMatch(/<ProfileHero\s+inNotebook\s+open/);
    expect(hero).toContain("max-w-[1536px]");
  });
  it("conditions de garde en section, carte contact allégée", () => {
    expect(page).toContain("<SitterConditionsSection");
    expect(page).not.toContain('label: "Mobilité"');
    expect(page).not.toContain('label: "Rayon"');
  });
  it("aucune icône décorative ni tiret dans les nouvelles sections", () => {
    const start = sections.indexOf("En bref : preuves chiffrées");
    const added = sections.slice(start);
    expect(start).toBeGreaterThan(0);
    expect(added).not.toMatch(/lucide-react|<svg/);
    expect(added).not.toMatch(/[—–]/);
  });
});
