import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Garde-fou upload photo (passe du 14/08/2026) :
 *
 * 1. Une seule formulation d'échec, portée par la clé i18n upload.photo_failed,
 *    déclinée dans les deux langues, partagée par tous les parcours d'upload.
 * 2. Chaque parcours mesure son échec définitif via un événement dédié, sur
 *    le modèle avatar_compression_failed (métadonnées ext + size_kb).
 * 3. compressGalleryFile et compressMessagePhotoFile ont un repli dégradé
 *    (second essai à dimension et qualité réduites) avant d'abandonner.
 * 4. Les vignettes des pages publiques sont servies avec un facteur de
 *    densité 2 (les cadres de 20 à 24 px restent à 1x, choix assumé).
 */

const LOCALES = path.resolve(process.cwd(), "src/i18n/locales");
const LANGS = ["fr", "en"] as const;

const readKey = (lng: string): string | undefined => {
  const dict = JSON.parse(fs.readFileSync(path.join(LOCALES, `${lng}/common.json`), "utf8"));
  return dict?.upload?.photo_failed;
};

describe("upload photo : formulation unique", () => {
  it("la clé upload.photo_failed existe dans les deux langues", () => {
    for (const lng of LANGS) {
      const value = readKey(lng);
      expect(value, lng).toBeTruthy();
      expect(typeof value).toBe("string");
    }
  });

  it("aucune déclinaison ne contient de tiret cadratin, demi-cadratin ou emoji", () => {
    for (const lng of LANGS) {
      const value = readKey(lng) as string;
      expect(value, lng).not.toMatch(/[—–]/);
      expect(value, lng).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });

  it("le français vouvoie et reste affirmatif (pas de négation)", () => {
    const fr = readKey("fr") as string;
    expect(fr).toContain("Réessayez");
    expect(fr).not.toMatch(/\b(n['’]|pas pu|impossible)\b/i);
  });
});

describe("upload photo : télémétrie d'échec par parcours", () => {
  const PATHS: [string, string][] = [
    ["src/components/profile/SitterGallery.tsx", "sitter_gallery_upload_failed"],
    ["src/components/profile/StepExperience.tsx", "experience_photo_upload_failed"],
    ["src/components/pets/PetForm.tsx", "pet_photo_upload_failed"],
    ["src/pages/Messages.tsx", "message_photo_upload_failed"],
    ["src/components/missions/MissionPhotoUpload.tsx", "mission_photo_upload_failed"],
    ["src/components/owner-profile/OwnerStepAnimals.tsx", "pet_photo_upload_failed"],
    ["src/pages/ArticleEditor.tsx", "article_cover_upload_failed"],
  ];

  it("chaque parcours affiche la formulation unique et mesure l'échec", () => {
    for (const [file, event] of PATHS) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, file).toContain("upload.photo_failed");
      expect(source, file).toContain(event);
      expect(source, file).toContain("size_kb");
    }
  });

  it("les événements sont typés dans analytics", () => {
    const analytics = fs.readFileSync("src/lib/analytics.ts", "utf8");
    for (const [, event] of PATHS) {
      expect(analytics).toContain(`"${event}"`);
    }
  });

  it("les anciennes formulations en dur ont disparu des parcours", () => {
    const banned = [
      "Impossible d'uploader la photo",
      "n'a pas pu être envoyée",
      "Erreur lors de l'upload",
      "Format d'image non supporté ou fichier corrompu",
    ];
    for (const [file] of PATHS) {
      const source = fs.readFileSync(file, "utf8");
      for (const b of banned) {
        expect(source, `${file} contient encore « ${b} »`).not.toContain(b);
      }
    }
  });
});

describe("upload photo : repli dégradé", () => {
  it("compressGalleryFile tente un second essai à dimension réduite", () => {
    const source = fs.readFileSync("src/lib/compressImage.ts", "utf8");
    expect(source).toMatch(/GALLERY_FALLBACK_DIMENSION = 1024/);
    const fn = source.match(/export async function compressGalleryFile[\s\S]*?\n}/);
    expect(fn).toBeTruthy();
    expect((fn![0].match(/compressImageFile\(/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("compressMessagePhotoFile existe avec son propre repli", () => {
    const source = fs.readFileSync("src/lib/compressImage.ts", "utf8");
    expect(source).toMatch(/export async function compressMessagePhotoFile/);
    expect(source).toMatch(/MESSAGE_PHOTO_FALLBACK_DIMENSION = 768/);
    const fn = source.match(/export async function compressMessagePhotoFile[\s\S]*?\n}/);
    expect(fn).toBeTruthy();
    expect((fn![0].match(/compressImageFile\(/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("compressArticleCoverFile existe avec son propre repli", () => {
    const source = fs.readFileSync("src/lib/compressImage.ts", "utf8");
    expect(source).toMatch(/export async function compressArticleCoverFile/);
    expect(source).toMatch(/ARTICLE_COVER_FALLBACK_DIMENSION = 1024/);
    const fn = source.match(/export async function compressArticleCoverFile[\s\S]*?\n}/);
    expect(fn).toBeTruthy();
    expect((fn![0].match(/compressImageFile\(/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe("densité 2x sur les pages publiques", () => {
  const DENSITY_LOCKS: [string, string][] = [
    ["src/pages/PublicSitterProfile.tsx", "width: 386, height: 386"],
    ["src/components/search/SitterResultCard.tsx", "width: 880, height: 660"],
    ["src/components/search/listing/SearchListingCard.tsx", "width: 880, height: 660"],
    ["src/components/missions/MissionCardCover.tsx", "width: 800, height: 600"],
    ["src/components/sits/views/tabs/SitHero.tsx", "width: 768, height: 480"],
    ["src/components/sits/views/tabs/SitHero.tsx", "width: 704, height: 640"],
    ["src/components/sits/views/tabs/TabLogement.tsx", "width: 448, height: 320"],
    ["src/components/sits/PublicSitView.tsx", "width: 896, height: 512"],
  ];

  it("les cadres publics conservent leur facteur de densité 2", () => {
    for (const [file, snippet] of DENSITY_LOCKS) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, `${file} doit contenir « ${snippet} »`).toContain(snippet);
    }
  });

  it("les lightbox demandent le plafond d'ingestion de leur bucket", () => {
    // sitter-gallery : ingestion 1600 px
    expect(fs.readFileSync("src/components/profile/SitterGallery.tsx", "utf8"))
      .toContain("width: 1600, height: 1600, resize: \"contain\"");
    // property-photos : ingestion 1200 px
    expect(fs.readFileSync("src/components/sits/views/tabs/SitHero.tsx", "utf8"))
      .toContain("width: 1200, height: 1200, resize: \"contain\"");
    expect(fs.readFileSync("src/components/messages/MessageBubble.tsx", "utf8"))
      .toContain("width: 1200, height: 1200, resize: \"contain\"");
    expect(fs.readFileSync("src/components/owner-profile/OwnerStepAnimals.tsx", "utf8"))
      .toContain("width: 1200, height: 1200, resize: \"contain\"");
  });
});
