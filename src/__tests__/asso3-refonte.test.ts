import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { associationPlaceLabel } from "@/lib/associationLabels";
import { viewsWithoutRevoke } from "@/__tests__/security/view-grants-guard.test";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("ASSO-2 : liste des associations", () => {
  it("n'affiche pas deux fois la même ville quand elle porte le nom du département", () => {
    expect(associationPlaceLabel("Paris", "Paris")).toBe("Paris");
    expect(associationPlaceLabel("Sevrier", "Haute-Savoie")).toBe("Sevrier, Haute-Savoie");
  });

  it("une seule grille, avec un filtre de besoin et sans regroupement par département", () => {
    const src = read("src/pages/AssociationsListing.tsx");
    expect(src).toContain('aria-label="Besoin de l\'association"');
    expect(src).not.toContain("Associations de protection animale : {departementName}");
    expect(src).not.toContain("AssociationNeedsHighlight");
  });
});

describe("ASSO-3 : fiche association", () => {
  const src = read("src/pages/AssociationDetail.tsx");

  it("porte un bloc Infos pratiques et un menu Partager (WhatsApp, Facebook, Copier le lien)", () => {
    expect(src).toContain("Infos pratiques");
    for (const label of ["WhatsApp", "Facebook", "Copier le lien"]) expect(src).toContain(label);
    expect(src).not.toContain("Partager sur WhatsApp");
  });

  it("annonce la rubrique de sources sous un intitulé neutre", () => {
    expect(src).toContain("Pour en savoir plus");
    expect(src).not.toContain("Ils en parlent");
  });
});

describe("ASSO-3 : migration 0165 (adresse postale)", () => {
  const sql = read("drizzle/migrations/0165_asso3_adresse_postale.sql");

  it("réserve l'adresse de rue aux lieux ouverts au public, en base", () => {
    expect(sql).toMatch(/CHECK \(address IS NULL OR association_type IN \('refuge','sanctuaire','faune_sauvage'\)\)/);
  });

  it("expose address dans la vue et retire les droits d'écriture", () => {
    expect(sql).toMatch(/a\.address/);
    expect(viewsWithoutRevoke(sql)).toEqual([]);
  });

  it("porte un contrat de post-déploiement", () => {
    const contracts = read("scripts/db/production-contracts.json");
    expect(contracts).toContain("0165_asso3_adresse_postale.sql");
  });
});
