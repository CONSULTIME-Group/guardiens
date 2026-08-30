import { describe, it, expect } from "vitest";
import {
  sitLikeSignals,
  rehomingSignals,
  writeSitPrefill,
  readSitPrefill,
  SIT_PREFILL_KEY,
  hasMoneyMention,
  moneyWordingSignals,
} from "../missionContentGuards";

describe("sitLikeSignals", () => {
  it("détecte une garde de chevaux sur 5 jours (cas Aix-en-Provence)", () => {
    const r = sitLikeSignals(
      "Gardiennage 5 j de mes 2 chevaux",
      "Nous partons 5 jours en octobre, nous souhaiterions qu'une personne passe tous les jours.",
    );
    expect(r).not.toBeNull();
    expect(r!.matched.join(" ")).toMatch(/durée/);
  });

  it("détecte une garde de chat sur 2 mois (cas Saint-Étienne)", () => {
    const r = sitLikeSignals(
      "Garde de chat pendant minimum 2 mois",
      "Nous recherchons une personne de confiance pour garder notre chat de 5 ans.",
    );
    expect(r).not.toBeNull();
  });

  it("détecte une offre de garde même sans durée explicite", () => {
    const r = sitLikeSignals("Je peux garder votre chat", "Disponible le week-end.");
    expect(r).not.toBeNull();
  });

  it("n'accroche pas un arrosage de plantes", () => {
    expect(
      sitLikeSignals("Arroser mes plantes 2 semaines", "Deux passages par semaine suffisent."),
    ).toBeNull();
  });

  it("n'accroche pas une promenade de chien ponctuelle", () => {
    expect(
      sitLikeSignals("Promener Filou 3 fois cette semaine", "Sorties de 30 minutes."),
    ).toBeNull();
  });
});

describe("rehomingSignals", () => {
  it("détecte un chaton à adopter (cas Saint-Étienne)", () => {
    const r = rehomingSignals("Chaton a adopté", "Chaton femelle à faire adopter.");
    expect(r).not.toBeNull();
  });

  it("détecte un chaton disponible en adoption (cas Nice)", () => {
    const r = rehomingSignals("Chaton disponible en adoption", "Chaton de deux mois.");
    expect(r).not.toBeNull();
  });

  it("n'accroche pas un don de plants (pas d'espèce animale)", () => {
    expect(rehomingSignals("Je donne des plants de tomates", "À venir chercher.")).toBeNull();
  });
});

describe("pré-remplissage de bascule vers /sits/create", () => {
  it("écrit puis lit une seule fois", () => {
    writeSitPrefill({ title: "Garde de mon chat", description: "Une semaine en août" });
    expect(sessionStorage.getItem(SIT_PREFILL_KEY)).not.toBeNull();
    const first = readSitPrefill();
    expect(first?.title).toBe("Garde de mon chat");
    expect(readSitPrefill()).toBeNull();
  });
});

describe("MONEY_RX, mentions monétaires bloquantes", () => {
  it.each([
    "Je paie 20 €",
    "20 euros de l'heure",
    "Contre 15 balles",
    "Paiement par PayPal",
    "Je peux régler en Lydia",
    "Virement possible",
    "Paiement CESU",
    "Réglé en espèces",
    "en liquide",
    "un chèque à l'ordre de",
    "Prix : 30 CHF",
  ])("bloque %s", (text) => {
    expect(hasMoneyMention("Coup de main urgent", text, "")).toBe(true);
  });

  it.each([
    "Deux espèces animales à surveiller",
    "Boules, mon chien, adore les balades",
    "Arroser mes plantes pendant une semaine",
  ])("laisse passer %s", (text) => {
    expect(hasMoneyMention("Arrosage de plantes", text, "Un café et des tomates")).toBe(false);
  });

  it("teste bien les trois champs concaténés", () => {
    expect(hasMoneyMention("Aide déménagement", "Deux heures", "30 €")).toBe(true);
  });
});

describe("moneyWordingSignals, vocabulaire ambigu non bloquant", () => {
  it("signale un dédommagement", () => {
    expect(moneyWordingSignals("Aide jardinage", "Petit dédommagement possible", "")).not.toBeNull();
  });
  it("ne signale rien sur un texte neutre", () => {
    expect(moneyWordingSignals("Aide jardinage", "Tailler la haie", "Des légumes")).toBeNull();
  });
});
