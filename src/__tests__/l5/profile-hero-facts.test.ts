import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { heroFactLine } from "@/components/profile/ProfileHero";
import { IDENTITY_EXPLANATION, IDENTITY_TOOLTIP } from "@/components/profile/IdentityVerifiedMark";
import { ownerHostedSitsCount, companionsLabel } from "@/lib/sitterProfileFacts";

const page = readFileSync("src/pages/PublicSitterProfile.tsx", "utf8");

describe("L5 hero : faits réels", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  it("gardien : membre, gardes réalisées, dernière visite", () => {
    const line = heroFactLine({ facet: "sitter", memberSince: "2025-03-01", completedSits: 2, lastSeenAt: "2026-10-09T12:00:00Z", now });
    expect(line[0]).toMatch(/^Membre depuis mars 2025$/);
    expect(line[1]).toBe("2 gardes réalisées");
    expect(line.length).toBe(3);
  });
  it("propriétaire : jamais de gardes réalisées dans le hero", () => {
    expect(heroFactLine({ facet: "owner", memberSince: null, completedSits: 4, lastSeenAt: null, now })).toEqual([]);
  });
  it("visite future ou invalide neutre", () => {
    expect(heroFactLine({ facet: "sitter", lastSeenAt: "2027-01-01", now })).toEqual([]);
    expect(heroFactLine({ facet: "sitter", lastSeenAt: "pas une date", now })).toEqual([]);
  });
});

describe("L5 identité vérifiée", () => {
  it("explique le contrôle automatique puis manuel, sans promesse de fiabilité", () => {
    const t = IDENTITY_EXPLANATION.join(" ");
    expect(t).toMatch(/analysée automatiquement/);
    expect(t).toMatch(/personne de l'équipe/);
    expect(t).toMatch(/ne garantit pas la fiabilité/);
    expect(IDENTITY_TOOLTIP.length).toBeGreaterThan(0);
  });
  it("le hero partagé sert les deux facettes, l'ancien en-tête gardien a disparu", () => {
    expect(page).toContain('facet={isSitterFacet ? "sitter" : "owner"}');
    expect(page).not.toContain("<SitterIdentityHero");
    expect(page).toContain("onOpenHeroPicker");
  });
});

describe("L5 propriétaire : annonces publiées différentes des gardes accueillies", () => {
  it("une annonce future sans avis ne compte aucune garde", () => {
    expect(ownerHostedSitsCount([])).toBe(0);
  });
  it("gardes distinctes avec avis, annulations exclues", () => {
    expect(ownerHostedSitsCount([
      { sit_id: "a" }, { sit_id: "a" }, { sit_id: "b", review_type: "annulation" }, { sit_id: null },
    ])).toBe(1);
  });
  it("la page n'utilise plus le total d'annonces pour la chronologie ni Alma", () => {
    expect(page).toContain("completedSits={ownerHostedSits}");
    expect(page).toContain("pets.length > 0 && ownerHostedSits > 0");
    expect(page).toMatch(/annonce\$\{ownerSitsTotal > 1 \? 's' : ''\} publiée/);
  });
});

describe("L5 faits pratiques repris, sections vides masquées", () => {
  it("accompagnants déclarés seulement", () => {
    expect(companionsLabel(null)).toBe("");
    expect(companionsLabel({ travels_with_own_animals: null, travels_with_children: false })).toBe("");
    expect(companionsLabel({ travels_with_own_animals: true, own_animals: ["Oui, un chien"] })).toBe("Ses animaux (un chien)");
  });
  it("présence, fréquence, préavis et accompagnants présentés", () => {
    for (const k of ['label: "Présence"', 'label: "Fréquence"', 'label: "Préavis"', 'label: "Accompagnants"']) {
      expect(page).toContain(k);
    }
  });
  it("aucun texte d'attente pour une section vide", () => {
    for (const t of ["arrive bientôt", "apparaîtront ici", "prépare sa première annonce", "accueillera son premier gardien"]) {
      expect(page).not.toContain(t);
    }
  });
  it("lettrage de marge retiré", () => {
    expect(existsSync("src/components/profile/MarginLettering.tsx")).toBe(false);
    expect(page).not.toContain("MarginLettering");
  });
  it("contact accessible sous 1024 px : barres collantes jusqu'à lg", () => {
    expect(page).not.toMatch(/"md:hidden fixed left-0 right-0/);
  });
});
