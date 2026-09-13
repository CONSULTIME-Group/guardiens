/**
 * Verrou N2 B et C : table des amorces par surface, amorce liée au whisper,
 * et phrase de présentation affichée une seule fois.
 */
import { describe, it, expect } from "vitest";
import {
  ALMA_COMPOSER_INTRO,
  promptStarters,
  promptSurfaceFromPath,
  resolvePromptStarters,
  shouldShowComposerIntro,
} from "@/lib/alma/prompt-starters";

describe("amorces contextuelles d'Alma", () => {
  it("associe chaque chemin à sa surface d'amorces", () => {
    expect(promptSurfaceFromPath("/dashboard")).toBe("dashboard");
    expect(promptSurfaceFromPath("/sits")).toBe("my_sits");
    expect(promptSurfaceFromPath("/annonces")).toBe("listings");
    expect(promptSurfaceFromPath("/recherche-gardiens")).toBe("listings");
    expect(promptSurfaceFromPath("/gardiens/42")).toBe("public_sitter");
    expect(promptSurfaceFromPath("/profile")).toBe("own_profile");
    expect(promptSurfaceFromPath("/owner-profile")).toBe("own_profile");
    expect(promptSurfaceFromPath("/house-guide/7")).toBe("house_guide");
    expect(promptSurfaceFromPath("/messages")).toBe("messages");
    expect(promptSurfaceFromPath("/settings")).toBe("settings");
    expect(promptSurfaceFromPath("/conseils")).toBe("other");
  });

  it("rend la table au mot près", () => {
    expect(promptStarters("dashboard")).toEqual([
      "Par où je commence ?",
      "Qu'est-ce qui manque à mon profil ?",
    ]);
    expect(promptStarters("my_sits", { hasDraftSit: true })).toEqual([
      "Relisez mon annonce",
      "Ce qui fait qu'une annonce reçoit des candidatures",
    ]);
    expect(
      promptStarters("my_sits", { hasPublishedSitWithoutApplication: true }),
    ).toEqual([
      "Pourquoi mon annonce reste sans candidature",
      "Comment la rendre plus attirante",
    ]);
    expect(promptStarters("listings")).toEqual([
      "Cette garde me correspond ?",
      "Comment bien me présenter à un propriétaire",
    ]);
    expect(promptStarters("public_sitter")).toEqual([
      "Ce gardien convient à mes animaux ?",
      "Quelles questions poser avant de dire oui",
    ]);
    expect(promptStarters("own_profile")).toEqual([
      "Qu'est-ce qui manque à mon profil ?",
      "Ce qui rassure un propriétaire en un regard",
    ]);
    expect(promptStarters("house_guide")).toEqual([
      "Qu'est-ce que j'oublie dans mon guide ?",
    ]);
    expect(promptStarters("messages")).toEqual(["Comment répondre à cette personne"]);
    expect(promptStarters("settings")).toEqual([
      "Comment fonctionne la vérification d'identité",
    ]);
    expect(promptStarters("other")).toEqual([
      "Comment se passe une garde ?",
      "Qu'est-ce que je prépare avant de partir ?",
    ]);
  });

  it("rend au maximum deux amorces sur toute surface", () => {
    for (const s of ["dashboard", "my_sits", "listings", "other"] as const) {
      expect(promptStarters(s).length).toBeLessThanOrEqual(2);
    }
  });

  it("remplace la première amorce par une question liée au whisper", () => {
    const out = resolvePromptStarters({
      surface: "dashboard",
      whisperType: "owner_traffic_no_action",
    });
    expect(out[0]).toBe("Pourquoi mon annonce reste sans candidature");
    expect(out).toHaveLength(2);
  });

  it("affiche la phrase de présentation une seule fois", () => {
    expect(ALMA_COMPOSER_INTRO).toBe(
      "Je lis votre dossier et je connais les guides du site. Posez moi votre question.",
    );
    expect(shouldShowComposerIntro(null)).toBe(true);
    expect(shouldShowComposerIntro("true")).toBe(false);
  });
});
