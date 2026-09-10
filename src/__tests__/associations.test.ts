import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ASSOCIATION_TYPE_VALUES,
  associationTypeLabel,
  associationSpeciesLabel,
  associationInitials,
} from "@/lib/associationLabels";
import {
  ASSOCIATION_MIN_DESCRIPTION_LENGTH,
  isAssociationIndexable,
} from "@/lib/associationIndexability.js";
import { normalizePhotos } from "@/components/associations/types";
import { buildConsentEmail } from "@/lib/associationConsentEmail";

describe("associations, libellés", () => {
  it("traduit chaque type en français", () => {
    for (const value of ASSOCIATION_TYPE_VALUES) {
      const label = associationTypeLabel(value);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe(value);
    }
  });

  it("retombe sur la valeur brute pour une espèce inconnue", () => {
    expect(associationSpeciesLabel("licorne")).toBe("licorne");
  });

  it("construit des initiales lisibles", () => {
    expect(associationInitials("Refuge des Quatre Pattes")).toBe("RQ");
  });
});

describe("associations, indexabilité", () => {
  it("exige une présentation d'au moins 150 caractères", () => {
    expect(ASSOCIATION_MIN_DESCRIPTION_LENGTH).toBe(150);
    expect(isAssociationIndexable({ description: "a".repeat(149) })).toBe(false);
    expect(isAssociationIndexable({ description: "a".repeat(150) })).toBe(true);
    expect(isAssociationIndexable(null)).toBe(false);
  });
});

describe("associations, photos", () => {
  it("ignore les entrées sans URL", () => {
    const photos = normalizePhotos([{ url: "" }, { url: "https://exemple.fr/a.jpg" }]);
    expect(photos).toHaveLength(1);
    expect(photos[0].url).toBe("https://exemple.fr/a.jpg");
  });

  it("retourne une liste vide pour une valeur non tableau", () => {
    expect(normalizePhotos(null)).toEqual([]);
  });
});

describe("associations, ponctuation et vocabulaire", () => {
  const files = [
    "src/pages/AssociationsListing.tsx",
    "src/pages/AssociationDetail.tsx",
    "src/components/associations/DepartmentAssociations.tsx",
    "src/lib/associationLabels.ts",
    "src/lib/associationConsentEmail.ts",
    "src/pages/admin/AdminAssociations.tsx",
  ];

  it("n'utilise ni tiret cadratin ni demi-cadratin", () => {
    for (const file of files) {
      const content = readFileSync(resolve(process.cwd(), file), "utf-8");
      expect(content.includes("\u2014"), `${file} contient un tiret cadratin`).toBe(false);
      expect(content.includes("\u2013"), `${file} contient un demi-cadratin`).toBe(false);
    }
  });

  it("n'emploie jamais le mot proscrit", () => {
    for (const file of files) {
      const content = readFileSync(resolve(process.cwd(), file), "utf-8").toLowerCase();
      expect(/voisin/.test(content), `${file} contient un mot proscrit`).toBe(false);
    }
  });
});

describe("associations, email de demande d'accord", () => {
  it("cite le nom, l'URL de la fiche et le vouvoiement", () => {
    const text = buildConsentEmail("Refuge du Val", "https://guardiens.fr/associations/refuge-du-val");
    expect(text).toContain("Refuge du Val");
    expect(text).toContain("https://guardiens.fr/associations/refuge-du-val");
    expect(text).toContain("vous");
    expect(text.includes("\u2014")).toBe(false);
  });
});

describe("associations, routes", () => {
  it("déclare la route publique dans siteRoutes et le sitemap", () => {
    const routes = readFileSync(resolve(process.cwd(), "src/data/siteRoutes.ts"), "utf-8");
    expect(routes).toContain('path: "/associations"');
    const sitemap = readFileSync(resolve(process.cwd(), "scripts/generate-sitemap.mjs"), "utf-8");
    expect(sitemap).toContain("public_animal_associations");
    expect(sitemap).toContain("isAssociationIndexable");
  });

  it("est branchée dans App et listée dans llms.txt", () => {
    const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf-8");
    expect(app).toContain('path="/associations"');
    expect(app).toContain('path="/associations/:slug"');
    expect(app).toContain('path="/admin/associations"');
    const llms = readFileSync(resolve(process.cwd(), "public/llms.txt"), "utf-8");
    expect(llms).toContain("(/associations)");
  });
});
