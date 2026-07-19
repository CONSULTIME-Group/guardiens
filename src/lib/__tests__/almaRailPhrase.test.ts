import { describe, it, expect } from "vitest";
import { pickAlmaRailPhrase } from "../almaRailPhrase";

describe("pickAlmaRailPhrase", () => {
  it("Alma masquée : renvoie la phrase de mise en retrait, quel que soit le contexte", () => {
    expect(
      pickAlmaRailPhrase({ variant: "confirmed", hidden: true }),
    ).toContain("Je reste à portée de voix");
    expect(
      pickAlmaRailPhrase({
        variant: "owner",
        hidden: true,
        ownerState: { ongoingSit: true, pendingApps: false, noActiveSit: false },
      }),
    ).toContain("Je reste à portée de voix");
  });

  describe("owner", () => {
    it("garde en cours, avec prénom du gardien", () => {
      const p = pickAlmaRailPhrase({
        variant: "owner",
        hidden: false,
        ownerState: {
          ongoingSit: true,
          ongoingSitterFirstName: "Camille",
          pendingApps: false,
          noActiveSit: false,
        },
      });
      expect(p).toContain("Camille");
      expect(p).toContain("veille sur la maison");
    });

    it("garde en cours, sans prénom : fallback générique", () => {
      const p = pickAlmaRailPhrase({
        variant: "owner",
        hidden: false,
        ownerState: {
          ongoingSit: true,
          pendingApps: false,
          noActiveSit: false,
        },
      });
      expect(p).toContain("votre gardien veille sur la maison");
    });

    it("candidatures en attente prennent le pas sur noActiveSit", () => {
      const p = pickAlmaRailPhrase({
        variant: "owner",
        hidden: false,
        ownerState: {
          ongoingSit: false,
          pendingApps: true,
          noActiveSit: true,
        },
      });
      expect(p).toContain("chaque candidature");
    });

    it("aucune annonce active : phrase d'invitation à raconter la maison", () => {
      const p = pickAlmaRailPhrase({
        variant: "owner",
        hidden: false,
        ownerState: { ongoingSit: false, pendingApps: false, noActiveSit: true },
      });
      expect(p).toContain("raconter votre maison");
    });

    it("annonce vivante (rien de neuf) : phrase de patience", () => {
      const p = pickAlmaRailPhrase({
        variant: "owner",
        hidden: false,
        ownerState: { ongoingSit: false, pendingApps: false, noActiveSit: false },
      });
      expect(p).toContain("Votre annonce vit");
    });
  });

  describe("newSitter", () => {
    it("openingCardVisible : phrase de bienvenue", () => {
      const p = pickAlmaRailPhrase({
        variant: "newSitter",
        hidden: false,
        openingCardVisible: true,
        profileCompletion: 20,
      });
      expect(p).toContain("Bienvenue chez vous");
    });

    it("openingCardVisible prime sur la phrase profil incomplet", () => {
      const p = pickAlmaRailPhrase({
        variant: "newSitter",
        hidden: false,
        openingCardVisible: true,
        profileCompletion: 40,
        checklistVisible: false,
      });
      expect(p).toContain("Bienvenue");
    });
  });

  describe("confirmed", () => {
    it("profile < 100 sans checklist visible : phrase profil", () => {
      const p = pickAlmaRailPhrase({
        variant: "confirmed",
        hidden: false,
        profileCompletion: 70,
        checklistVisible: false,
      });
      expect(p).toContain("Quelques touches à votre profil");
    });

    it("checklist visible saute la phrase profil (évite le doublon)", () => {
      const p = pickAlmaRailPhrase({
        variant: "confirmed",
        hidden: false,
        profileCompletion: 70,
        checklistVisible: true,
        isAvailable: true,
      });
      expect(p).not.toContain("Quelques touches");
      expect(p).toContain("Votre profil est prêt");
    });

    it("profil complet mais non disponible : phrase disponibilité", () => {
      const p = pickAlmaRailPhrase({
        variant: "confirmed",
        hidden: false,
        profileCompletion: 100,
        isAvailable: false,
      });
      expect(p).toContain("disponible");
    });

    it("profil complet et disponible : phrase de veille positive", () => {
      const p = pickAlmaRailPhrase({
        variant: "confirmed",
        hidden: false,
        profileCompletion: 100,
        isAvailable: true,
      });
      expect(p).toContain("Votre profil est prêt");
    });
  });
});
