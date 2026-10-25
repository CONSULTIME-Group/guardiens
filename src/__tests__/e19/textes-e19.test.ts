/**
 * Lot E19 : phrases neuves (preuve en repli, issue annulée, mot retenu),
 * affirmatives et sans tiret long.
 */
import { describe, expect, it } from "vitest";
import { proofSentence, type EntraideProof } from "@/lib/entraideProofs";
import { MEETUP_CANCELLED_TEXT, meetupSavedToast, meetupWordRetainedNotice } from "@/lib/meetupOutcome";

const proof = (over: Partial<EntraideProof>): EntraideProof => ({
  mission_id: "p1",
  owner_first_name: "Laurence",
  helper_first_name: "Karim",
  city: "Annecy",
  latitude_approx: 45.9,
  longitude_approx: 6.13,
  word: null,
  happened_at: "2026-10-01T10:00:00Z",
  ...over,
});

describe("preuve publique", () => {
  it("garde les deux prénoms quand la vue les livre", () => {
    expect(proofSentence(proof({}))).toBe("Laurence a reçu un coup de main de Karim à Annecy.");
  });

  it("dit « près de {ville} » sans prénom en repli", () => {
    expect(proofSentence(proof({ owner_first_name: null, helper_first_name: null }))).toBe("Un coup de main a eu lieu près d'Annecy.");
    expect(proofSentence(proof({ owner_first_name: null, helper_first_name: null, city: "Lyon" }))).toBe("Un coup de main a eu lieu près de Lyon.");
    expect(proofSentence(proof({ owner_first_name: null, helper_first_name: null, city: null }))).toBe("Un coup de main a eu lieu près de chez vous.");
  });

  it("n'affiche jamais un prénom seul", () => {
    expect(proofSentence(proof({ owner_first_name: null }))).not.toContain("Karim");
  });
});

describe("textes de fin d'échange", () => {
  it("issue annulée et mot retenu", () => {
    expect(meetupSavedToast("cancelled")).toBe("C'est noté. Le coup de main est annulé.");
    expect(meetupWordRetainedNotice("contact_details")).toContain("Article 14.4 des CGU");
    expect(meetupWordRetainedNotice(null)).toContain("contact@guardiens.fr");
  });

  it("affirmatifs, sans tiret long, sans vocabulaire proscrit", () => {
    const texts = [
      MEETUP_CANCELLED_TEXT,
      meetupSavedToast("happened"),
      meetupSavedToast("cancelled"),
      meetupWordRetainedNotice("hate"),
      proofSentence(proof({ owner_first_name: null })),
    ];
    for (const text of texts) {
      expect(text).not.toMatch(/[\u2013\u2014]/);
      expect(text).not.toMatch(/\b(ne|pas|jamais)\b|n'/i);
      expect(text).not.toMatch(/\b(voisins?|mission|annonce|candidature|preneur)\b/i);
    }
  });
});
