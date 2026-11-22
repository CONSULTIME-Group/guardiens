/**
 * Lot PHOTO2 : photos d'expérience enfin enregistrées, motif des échecs
 * d'envoi journalisé, filigrane du titulaire accepté à la vérification
 * d'identité.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { uploadFailureMetadata, uploadFailureReason } from "@/lib/uploadFailure";

const read = (p: string) => readFileSync(p, "utf8");

describe("PHOTO2, photos d'expérience", () => {
  const src = read("src/components/profile/StepExperience.tsx");
  it("l'envoi vers la galerie se fait sans écrasement", () => {
    // L'écrasement demande un droit de lecture absent sur sitter-gallery :
    // chaque envoi était refusé par la règle d'accès du stockage.
    expect(src).toContain('.from("sitter-gallery").upload(path, toUpload, { upsert: false })');
    expect(src).not.toMatch(/from\("sitter-gallery"\)\.upload\([^)]*upsert: true/);
  });
  it("aucun envoi vers sitter-gallery ne demande l'écrasement dans le site", () => {
    for (const f of ["src/components/profile/SitterGallery.tsx", "src/pages/Messages.tsx", "src/components/profile/StepExperience.tsx"]) {
      expect(read(f)).not.toMatch(/from\("sitter-gallery"\)[\s\S]{0,80}?\.upload\([^)]*upsert: true/);
    }
  });
});

describe("PHOTO2, motif d'un échec d'envoi", () => {
  it("le motif est nettoyé et borné", () => {
    expect(uploadFailureReason({ message: "new row violates row-level security policy" })).toBe("new row violates row-level security policy");
    expect(uploadFailureReason(new Error("Échec <img src=x> \"toBlob\" null"))).toBe("Échec img srcx toBlob null");
    expect(uploadFailureReason("x".repeat(300)).length).toBe(120);
    expect(uploadFailureReason(null)).toBe("unknown");
  });
  it("l'événement porte extension, taille, étape et motif, sans nom de fichier", () => {
    const file = new File([new Uint8Array(2048)], "Mon Chien Rex.JPG", { type: "image/jpeg" });
    expect(uploadFailureMetadata(file, "upload", { message: "Payload too large" })).toEqual({ ext: "jpg", size_kb: 2, stage: "upload", reason: "Payload too large" });
  });
  it("les quatre points d'envoi passent par le motif", () => {
    for (const f of ["src/components/profile/StepExperience.tsx", "src/components/pets/PetForm.tsx", "src/components/owner-profile/OwnerStepAnimals.tsx", "src/lib/compressImage.ts"]) {
      expect(read(f)).toContain("uploadFailureMetadata(file,");
    }
  });
});

describe("PHOTO2, filigrane à la vérification d'identité", () => {
  const fn = read("supabase/functions/verify-identity/index.ts");
  it("la consigne accepte le filigrane posé par le titulaire", () => {
    expect(fn).toContain("A watermark added by the holder");
    expect(fn).toContain("never set is_valid=false and never lower confidence because of it");
    expect(fn).toContain('rejection_category "other"');
  });
});
