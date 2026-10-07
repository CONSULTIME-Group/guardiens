import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  nextCoverAfterRemoval,
  publishedCoverWarning,
  propertyPhotoStoragePath,
} from "@/lib/galleryPhotoRemoval";
import { detectHomePhotoQuestion, HOME_PHOTO_ANSWER, HOME_PHOTO_PATH } from "../../../supabase/functions/_shared/alma-home-photo";
import { checkReplayAnswer } from "@/lib/alma/replayChecks";
import { ALMA_REPLAY_CASES } from "@/data/almaReplayCases";

const calls: string[] = [];
vi.mock("@/integrations/supabase/client", () => {
  const table = (name: string) => {
    const chain: any = {
      select: () => chain, eq: () => chain, limit: () => chain,
      maybeSingle: async () => ({ data: name === "properties" ? { id: "p1", photos: [], cover_photo_url: null } : null, error: null }),
      insert: async () => { calls.push(`insert:${name}`); return { error: null }; },
      update: () => { calls.push(`update:${name}`); return { eq: async () => ({ error: null }) }; },
    };
    return chain;
  };
  return {
    supabase: {
      from: (n: string) => table(n),
      storage: { from: () => ({ upload: async () => { calls.push("upload"); return { error: null }; }, getPublicUrl: () => ({ data: { publicUrl: "https://x/property-photos/u1/owner-gallery/a.webp" } }) }) },
    },
  };
});
vi.mock("@/lib/compressImage", () => ({ compressImageFile: async (f: File) => f }));
vi.mock("@/lib/imageDimensions", () => ({ getImageDimensions: async () => ({ width: 10, height: 10 }) }));

const G = (id: string, position: number, url = `https://x/property-photos/u1/owner-gallery/${id}.webp`) => ({
  id, photo_url: url, position, created_at: `2026-10-0${position + 1}T00:00:00Z`,
});

describe("L2, envoi : la Galerie d'abord, le logement ensuite", () => {
  beforeEach(() => { calls.length = 0; });

  it("depuis /sits/create (uploadOwnerGalleryPhoto) : ligne owner_gallery avant properties", async () => {
    const { uploadOwnerGalleryPhoto } = await import("@/lib/uploadOwnerGalleryPhoto");
    await uploadOwnerGalleryPhoto("u1", new File(["x"], "a.webp", { type: "image/webp" }));
    expect(calls).toEqual(["upload", "insert:owner_gallery", "update:properties"]);
  });

  it("depuis la gestion d'annonce (uploadOwnerPhoto) : même ordre", async () => {
    const { uploadOwnerPhoto } = await import("@/lib/uploadOwnerPhoto");
    await uploadOwnerPhoto({ userId: "u1", file: new File(["x"], "a.webp"), category: "home_life" as any });
    expect(calls).toEqual(["upload", "insert:owner_gallery", "update:properties"]);
  });

  it("depuis la Galerie : la photo crée sa ligne owner_gallery, jamais une écriture directe du logement", () => {
    const src = readFileSync("src/components/owner-profile/OwnerGallery.tsx", "utf8");
    expect(src).toContain('from("owner_gallery").insert(');
    expect(src).not.toMatch(/from\("properties"\)\s*\.\s*(update|insert)/);
  });

  it("le formulaire du profil n'écrit plus properties.photos", () => {
    const src = readFileSync("src/hooks/useOwnerProfile.ts", "utf8");
    expect(src).not.toContain('photos: "photos"');
  });
});

describe("L2, suppression avec remplacement de couverture", () => {
  const photos = [G("a", 0), G("b", 1), G("c", 2)];
  it("la photo suivante remplace la couverture", () => {
    expect(nextCoverAfterRemoval(photos, "b")?.id).toBe("c");
  });
  it("la dernière supprimée : retour à la première", () => {
    expect(nextCoverAfterRemoval(photos, "c")?.id).toBe("a");
  });
  it("plus aucune photo : couverture vide", () => {
    expect(nextCoverAfterRemoval([G("a", 0)], "a")).toBeNull();
  });
  it("chemin de stockage extrait de l'URL publique", () => {
    expect(propertyPhotoStoragePath("https://x/storage/v1/object/public/property-photos/u1/owner-gallery/a.webp?t=1")).toBe("u1/owner-gallery/a.webp");
    expect(propertyPhotoStoragePath("https://x/autre/a.webp")).toBeNull();
  });
});

describe("L2, couverture d'une annonce publiée", () => {
  it("message exact avec photo suivante", () => {
    expect(publishedCoverWarning("Garde de Filou", true)).toBe(
      "Cette photo est la couverture de votre annonce « Garde de Filou ». Elle sera remplacée par la photo suivante.",
    );
  });
  it("message exact sans photo restante", () => {
    expect(publishedCoverWarning("Garde de Filou", false)).toBe(
      "Cette photo est la couverture de votre annonce « Garde de Filou ». Elle sera remplacée par aucune photo.",
    );
  });
  it("la Galerie demande confirmation avant de toucher une annonce publiée", () => {
    const src = readFileSync("src/components/owner-profile/OwnerGallery.tsx", "utf8");
    expect(src).toContain('.eq("status", "published")');
    expect(src).toContain("publishedCoverWarning(");
    expect(src).toContain("owner_photo_still_referenced");
  });
});

describe("L2, Alma et la photo du logement", () => {
  it.each([
    "Je veux supprimer la photo de ma maison",
    "Je ne peux trouver la page pour supprimer la photo de ma maison",
    "Comment changer la photo de mon logement ?",
    "Où ajouter des photos de mon appartement",
  ])("détecte « %s »", (q) => expect(detectHomePhotoQuestion(q)).toBe(true));

  it.each([
    "Comment changer ma photo de profil ?",
    "comment postuler ?",
    "supprimer mon compte",
    "Ajouter une photo de mon chien",
  ])("ne détecte pas « %s »", (q) => expect(detectHomePhotoQuestion(q)).toBe(false));

  it("réponse : Galerie, sans messagerie, sans tiret long", () => {
    expect(HOME_PHOTO_ANSWER).toContain("Mon profil propriétaire, rubrique Galerie");
    expect(HOME_PHOTO_ANSWER).not.toMatch(/messagerie|[\u2013\u2014]/i);
    expect(HOME_PHOTO_PATH).toBe("/owner-profile?section=gallery");
  });

  it("les deux phrases réelles sont au rejeu et la réponse fixe les satisfait", () => {
    for (const id of ["cas-41", "cas-42"]) {
      const c = ALMA_REPLAY_CASES.find((x) => x.id === id)!;
      expect(c.expect?.actionPath).toBe("/owner-profile?section=gallery");
      const v = checkReplayAnswer({
        question: c.question, answer: HOME_PHOTO_ANSWER,
        action: { label: "Ouvrir ma Galerie", path: HOME_PHOTO_PATH }, expect: c.expect,
      });
      expect(v.reasons).toEqual([]);
    }
  });
});
