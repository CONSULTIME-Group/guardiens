/**
 * Lot Z2, audits C-16 et C-17 (13/10/2026) : textes de la fiche d'un besoin.
 *
 * - C-16 : « Résiliable à tout moment » (vocabulaire d'abonnement sur un
 *   service gratuit) devient ce que la personne peut faire : retirer sa réponse.
 * - C-17 : « vous répondra ici même » annonçait une réponse sur la page, alors
 *   que la suite passe par la messagerie.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/pages/SmallMissionDetail.tsx", "utf8");

describe("C-16 et C-17, fiche du besoin", () => {
  it("plus de vocabulaire d'abonnement sous « Je peux »", () => {
    expect(SRC).not.toMatch(/Résiliable/i);
    expect(SRC).toContain("Vous pouvez retirer votre réponse à tout moment");
  });

  it("le retrait de réponse existe bien sur la page", () => {
    expect(SRC).toContain("Retirer ma réponse");
    expect(SRC).toContain('update({ status: "withdrawn" as any })');
  });

  it("la réponse de l'auteur arrive dans la messagerie", () => {
    expect(SRC).not.toContain("vous répondra ici même");
    expect(SRC).toContain("vous répondra dans la messagerie, une notification vous préviendra.");
  });

  it("aucun tiret cadratin ni demi-cadratin dans ces deux textes", () => {
    const lines = SRC.split("\n").filter((l) => l.includes("retirer votre réponse") || l.includes("vous répondra dans la messagerie"));
    expect(lines.length).toBe(2);
    for (const l of lines) expect(l).not.toMatch(/[–—]/);
  });
});
