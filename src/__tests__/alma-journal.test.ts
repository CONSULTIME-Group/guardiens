import { describe, it, expect } from "vitest";
import {
  buildAlmaJournal,
  type AlmaJournalFacts,
  type AlmaJournalRuleKey,
} from "@/lib/alma/journal";

/**
 * Lot Y, la page du jour d'Alma.
 *
 * Verrous : chaque règle se déclenche sur son cas et pas sur les autres,
 * plafond de quatre entrées, fraîcheur sur trois jours, disparition après
 * action, aucun chemin technique ni tiret cadratin dans les textes rendus.
 */

const owner = (over: Partial<AlmaJournalFacts> = {}): AlmaJournalFacts => ({
  activeRole: "owner",
  ...over,
});

const keys = (facts: AlmaJournalFacts): AlmaJournalRuleKey[] =>
  buildAlmaJournal(facts).entries.map((entry) => entry.ruleKey);

describe("buildAlmaJournal, déclenchement des règles", () => {
  it("candidatures_non_lues ne sort que s'il existe des candidatures jamais ouvertes", () => {
    expect(keys(owner({ unreadApplications: 3 }))).toEqual(["candidatures_non_lues"]);
    expect(keys(owner({ unreadApplications: 0 }))).toEqual([]);
  });

  it("photos_logement sort sous trois photos, jamais au dessus", () => {
    expect(keys(owner({ propertyPhotoCount: 2 }))).toEqual(["photos_logement"]);
    expect(keys(owner({ propertyPhotoCount: 3 }))).toEqual([]);
  });

  it("annonce_sans_candidature demande plus de sept jours en ligne", () => {
    expect(keys(owner({ publishedSitWithoutApplicationDays: 11 }))).toEqual([
      "annonce_sans_candidature",
    ]);
    expect(keys(owner({ publishedSitWithoutApplicationDays: 7 }))).toEqual([]);
  });

  it("alentours sort sous trente caractères", () => {
    expect(keys(owner({ regionHighlightsLength: 12 }))).toEqual(["alentours"]);
    expect(keys(owner({ regionHighlightsLength: 120 }))).toEqual([]);
  });

  it("annonce_brouillon nomme le jour du brouillon", () => {
    const page = buildAlmaJournal(owner({ draftSitWeekday: "mardi" }));
    expect(page.entries[0].ruleKey).toBe("annonce_brouillon");
    expect(page.entries[0].text).toContain("mardi");
  });

  it("profil reprend le libellé et les points du barème", () => {
    const page = buildAlmaJournal(
      owner({ topMissing: { label: "Compétences", points: 10, href: "/owner-profile?section=skills" } }),
    );
    expect(page.entries[0].ruleKey).toBe("profil");
    expect(page.entries[0].text.toLowerCase()).toContain("compétences");
    expect(page.entries[0].text).toContain("Dix");
  });

  it("candidature_en_attente demande plus de cinq jours, côté gardien", () => {
    expect(
      keys({ activeRole: "sitter", pendingApplication: { city: "Annecy", days: 6 } }),
    ).toEqual(["candidature_en_attente"]);
    expect(
      keys({ activeRole: "sitter", pendingApplication: { city: "Annecy", days: 5 } }),
    ).toEqual([]);
  });

  it("les règles propriétaire ne sortent jamais côté gardien", () => {
    expect(
      keys({ activeRole: "sitter", unreadApplications: 4, propertyPhotoCount: 0 }),
    ).toEqual([]);
  });
});

describe("buildAlmaJournal, plafond et priorité", () => {
  const full = owner({
    unreadApplications: 2,
    propertyPhotoCount: 0,
    publishedSitWithoutApplicationDays: 11,
    regionHighlightsLength: 0,
    draftSitWeekday: "mardi",
    topMissing: { label: "Compétences", points: 10, href: "/owner-profile?section=skills" },
    association: { name: "Le refuge des Coteaux", slug: "refuge-des-coteaux" },
  });

  it("ne rend jamais plus de quatre entrées", () => {
    expect(buildAlmaJournal(full).entries.length).toBe(4);
  });

  it("classe par utilité décroissante", () => {
    expect(keys(full)).toEqual([
      "candidatures_non_lues",
      "photos_logement",
      "annonce_sans_candidature",
      "alentours",
    ]);
  });

  it("l'envie d'Alma ne passe que s'il reste de la place", () => {
    const light = owner({
      unreadApplications: 1,
      association: { name: "Le refuge des Coteaux", slug: "refuge-des-coteaux" },
    });
    expect(keys(light)).toEqual(["candidatures_non_lues", "envie_benevolat"]);
  });

  it("l'envie ignorée deux fois ne revient pas avant un mois", () => {
    const base = {
      association: { name: "Le refuge des Coteaux", slug: "refuge-des-coteaux" },
      envieIgnoredCount: 2,
    };
    expect(keys(owner({ ...base, envieDaysSinceLastShown: 10 }))).toEqual([]);
    expect(keys(owner({ ...base, envieDaysSinceLastShown: 31 }))).toEqual(["envie_benevolat"]);
  });
});

describe("buildAlmaJournal, fraîcheur et action suivie", () => {
  it("une règle vue il y a deux jours ne ressort pas si une autre s'applique", () => {
    const page = buildAlmaJournal(
      owner({
        unreadApplications: 2,
        propertyPhotoCount: 1,
        shownRecently: ["candidatures_non_lues"],
      }),
    );
    expect(page.entries.map((e) => e.ruleKey)).toEqual(["photos_logement"]);
  });

  it("une règle vue récemment ressort si rien d'autre ne s'applique", () => {
    expect(
      keys(owner({ unreadApplications: 2, shownRecently: ["candidatures_non_lues"] })),
    ).toEqual(["candidatures_non_lues"]);
  });

  it("une règle dont l'action est faite disparaît", () => {
    expect(
      keys(owner({ unreadApplications: 2, actedKeys: ["candidatures_non_lues"] })),
    ).toEqual([]);
  });
});

describe("buildAlmaJournal, invitation", () => {
  it("une seule question, dérivée de l'entrée la plus haute", () => {
    const page = buildAlmaJournal(owner({ propertyPhotoCount: 0 }));
    expect(page.invitation?.question).toBe(
      "Vous avez des photos quelque part, ou il faut les faire ?",
    );
    expect(page.invitation?.replies.length).toBeGreaterThanOrEqual(2);
    expect(page.invitation?.replies.length).toBeLessThanOrEqual(3);
  });

  it("aucune invitation quand aucune règle ne s'applique", () => {
    const page = buildAlmaJournal(owner());
    expect(page.entries).toEqual([]);
    expect(page.invitation).toBeNull();
  });
});

describe("buildAlmaJournal, contraintes de texte", () => {
  const scenarios: AlmaJournalFacts[] = [0, 1, 2].map((seed) => ({
    activeRole: "owner",
    variantSeed: seed,
    unreadApplications: 3,
    propertyPhotoCount: 0,
    publishedSitWithoutApplicationDays: 11,
    regionHighlightsLength: 0,
    draftSitWeekday: "mardi",
    topMissing: { label: "Compétences", points: 10, href: "/owner-profile?section=skills" },
    association: { name: "Le refuge des Coteaux", slug: "refuge-des-coteaux" },
  }));

  const sitterScenarios: AlmaJournalFacts[] = [0, 1, 2].map((seed) => ({
    activeRole: "sitter",
    variantSeed: seed,
    pendingApplication: { city: "Annecy", days: 6 },
    topMissing: { label: "Compétences", points: 15, href: "/profile?section=competences" },
  }));

  it("aucun texte ne contient de chemin ni de tiret cadratin ou demi-cadratin", () => {
    for (const facts of [...scenarios, ...sitterScenarios]) {
      const page = buildAlmaJournal(facts);
      const texts = [
        ...page.entries.map((e) => e.text),
        ...page.entries.map((e) => e.typeLabel),
        ...page.entries.map((e) => e.action?.label ?? ""),
        page.invitation?.question ?? "",
        ...(page.invitation?.replies ?? []),
      ];
      for (const text of texts) {
        expect(text).not.toMatch(/\//);
        expect(text).not.toMatch(/[\u2014\u2013]/);
      }
    }
  });

  it("les formulations changent avec la graine", () => {
    const variants = [0, 1, 2].map(
      (seed) => buildAlmaJournal(owner({ propertyPhotoCount: 0, variantSeed: seed })).entries[0].text,
    );
    expect(new Set(variants).size).toBe(3);
  });

  it("Alma ne compte jamais l'absence de la personne", () => {
    for (const facts of [...scenarios, ...sitterScenarios]) {
      for (const entry of buildAlmaJournal(facts).entries) {
        expect(entry.text.toLowerCase()).not.toContain("ça fait longtemps");
        expect(entry.text.toLowerCase()).not.toContain("manqué");
        expect(entry.text.toLowerCase()).not.toContain("depuis votre dernière");
      }
    }
  });
});
