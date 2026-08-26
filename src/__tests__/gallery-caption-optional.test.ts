import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { galleryPhotoAlt } from "@/lib/galleryPhotoAlt";

const SOURCE = fs.readFileSync("src/components/profile/SitterGallery.tsx", "utf8");

describe("légende facultative dans la modale d'ajout de photo", () => {
  it("le libellé n'est plus marqué obligatoire", () => {
    expect(SOURCE).toContain("Légende (facultatif)");
    expect(SOURCE).not.toContain("Légende *");
  });

  it("le bouton d'envoi ne dépend plus de la légende", () => {
    const btn = SOURCE.match(/disabled=\{[^}]*uploading[^}]*\}/g) || [];
    expect(btn.length).toBeGreaterThan(0);
    for (const d of btn) expect(d).not.toContain("caption");
  });

  it("aucune vérification manuelle de la légende avant envoi", () => {
    expect(SOURCE).not.toMatch(/if\s*\(\s*!\s*caption/);
    expect(SOURCE).not.toMatch(/!file\s*\|\|\s*!caption/);
  });

  it("la soumission écrit une chaîne vide quand la légende est absente", () => {
    // la valeur envoyée reste (caption ?? "").trim(), donc "" et non null
    expect(SOURCE).toContain('caption: (caption ?? "").trim()');
    expect(("" as string).trim()).toBe("");
  });
});

describe("galleryPhotoAlt", () => {
  it("utilise la légende quand elle existe", () => {
    expect(galleryPhotoAlt({ caption: "Luna à la plage" })).toBe("Luna à la plage");
  });

  it("compose type, race et ville sans légende", () => {
    expect(
      galleryPhotoAlt({ caption: "", animal_type: "chien", animal_breed: "golden retriever", city: "Annecy" }),
    ).toBe("Chien, golden retriever, à Annecy");
  });

  it("ne renvoie jamais une chaîne vide, quelle que soit la combinaison", () => {
    const values = [null, "", "chien"];
    for (const caption of [null, "", "  "]) {
      for (const animal_type of values) {
        for (const animal_breed of [null, "", "berger"]) {
          for (const city of [null, "", "Lyon"]) {
            for (const first of [null, "", "Elisa"]) {
              const alt = galleryPhotoAlt({ caption, animal_type, animal_breed, city }, first);
              expect(alt.trim().length).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  it("replie sur le prénom du gardien quand rien n'est renseigné", () => {
    expect(galleryPhotoAlt({}, "Elisa")).toBe("Photo de la galerie de Elisa");
    expect(galleryPhotoAlt(null)).toBe("Photo de la galerie du gardien");
  });
});
