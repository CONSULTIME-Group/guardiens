// Entraide, lot 3 : relance de fin d'échange, preuves, compteurs.
import { describe, it, expect } from "vitest";
import {
  isMeetupDue,
  meetupReferenceDate,
  meetupPromptBody,
  proofEmailLine,
  pickNearestProof,
  proofWeekLabel,
  MEETUP_SERVICE_START,
  PROOF_RADIUS_KM,
  type ProofRow,
} from "../../supabase/functions/_shared/mission-meetup";
import {
  selectProofs,
  weekLabel,
  proofSentence,
  PROOF_LIMIT,
  type EntraideProof,
} from "@/lib/entraideProofs";
import { helpCountsLabel } from "@/components/entraide/HelpCounts";

const now = new Date("2026-10-05T09:00:00Z");

describe("relance de fin d'échange", () => {
  it("part le lendemain de la date du besoin", () => {
    expect(isMeetupDue({ date_needed: "2026-10-04" }, now)).toBe(true);
    expect(isMeetupDue({ date_needed: "2026-10-05" }, now)).toBe(false);
  });

  it("préfère la date de fin quand elle existe", () => {
    expect(meetupReferenceDate({ date_needed: "2026-10-01", end_date: "2026-10-03" })?.toISOString())
      .toBe(new Date("2026-10-03T00:00:00Z").toISOString());
  });

  it("part trois jours après l'acceptation quand aucune date n'est indiquée", () => {
    expect(isMeetupDue({ accepted_at: "2026-10-02T08:00:00Z" }, now)).toBe(true);
    expect(isMeetupDue({ accepted_at: "2026-10-03T10:00:00Z" }, now)).toBe(false);
  });

  it("retombe sur la date de la réponse quand l'acceptation n'est pas datée", () => {
    expect(isMeetupDue({ response_created_at: "2026-09-30T08:00:00Z" }, now)).toBe(true);
  });

  it("laisse de côté les besoins antérieurs à la mise en service", () => {
    expect(MEETUP_SERVICE_START).toBe("2026-09-21");
    expect(isMeetupDue({ date_needed: "2026-09-10" }, now)).toBe(false);
  });

  it("écrit une phrase de relance lisible", () => {
    expect(meetupPromptBody("Karim", "Nourrir les poules")).toBe(
      "Dites-nous en un clic si le coup de main avec Karim a eu lieu, pour « Nourrir les poules ».",
    );
    expect(meetupPromptBody(null, null)).toBe(
      "Dites-nous en un clic si le coup de main avec la personne du coin a eu lieu.",
    );
  });
});

const proofRow = (over: Partial<ProofRow>): ProofRow => ({
  mission_id: "m1",
  owner_first_name: "Laurence",
  helper_first_name: "Karim",
  city: "Annecy",
  latitude_approx: 45.9,
  longitude_approx: 6.13,
  word: "Très simple, on a bien discuté.",
  happened_at: "2026-10-01T10:00:00Z",
  ...over,
});

describe("ligne de preuve dans l'email de vague", () => {
  it("ne sort une preuve que dans le rayon de cinquante kilomètres", () => {
    const near = pickNearestProof([proofRow({})], 45.9, 6.2);
    expect(near?.distance_km).toBeLessThan(PROOF_RADIUS_KM);

    expect(pickNearestProof([proofRow({})], 48.85, 2.35)).toBeNull();
  });

  it("garde la plus récente quand plusieurs sont proches", () => {
    const picked = pickNearestProof([
      proofRow({ mission_id: "vieux", happened_at: "2026-09-25T10:00:00Z" }),
      proofRow({ mission_id: "recent", happened_at: "2026-10-02T10:00:00Z" }),
    ], 45.9, 6.13);
    expect(picked?.proof.mission_id).toBe("recent");
  });

  it("écrit la ligne avec la date, la distance et les deux prénoms", () => {
    expect(proofEmailLine({
      owner_first_name: "Laurence",
      helper_first_name: "Karim",
      distance_km: 6.2,
      mission_title: "ses poules",
      week_label: "La semaine dernière",
    })).toBe("La semaine dernière, à 6 km : Laurence a reçu un coup de main de Karim pour ses poules.");
  });

  it("dit la semaine en français", () => {
    expect(proofWeekLabel("2026-10-05T08:00:00Z", now)).toBe("Aujourd'hui");
    expect(proofWeekLabel("2026-10-04T08:00:00Z", now)).toBe("Hier");
    expect(proofWeekLabel("2026-09-28T08:00:00Z", now)).toBe("La semaine dernière");
  });
});

const proof = (over: Partial<EntraideProof>): EntraideProof => ({
  mission_id: "p1",
  owner_first_name: "Laurence",
  helper_first_name: "Karim",
  city: "Annecy",
  latitude_approx: 45.9,
  longitude_approx: 6.13,
  word: "Un moment agréable.",
  happened_at: "2026-10-01T10:00:00Z",
  ...over,
});

describe("cartes de preuve du hub", () => {
  it("montre au plus trois cartes", () => {
    const many = Array.from({ length: 8 }, (_, i) => proof({ mission_id: `p${i}` }));
    expect(selectProofs(many, null)).toHaveLength(PROOF_LIMIT);
  });

  it("privilégie les rencontres du rayon de cinquante kilomètres", () => {
    const list = [
      proof({ mission_id: "loin", latitude_approx: 48.85, longitude_approx: 2.35, happened_at: "2026-10-04T10:00:00Z" }),
      proof({ mission_id: "proche", happened_at: "2026-09-30T10:00:00Z" }),
    ];
    expect(selectProofs(list, [45.9, 6.13]).map((p) => p.mission_id)).toEqual(["proche"]);
  });

  it("montre les plus récentes de France quand rien n'est proche", () => {
    const list = [
      proof({ mission_id: "paris", latitude_approx: 48.85, longitude_approx: 2.35, happened_at: "2026-10-04T10:00:00Z" }),
      proof({ mission_id: "lille", latitude_approx: 50.63, longitude_approx: 3.06, happened_at: "2026-09-20T10:00:00Z" }),
    ];
    expect(selectProofs(list, [43.3, 5.4]).map((p) => p.mission_id)).toEqual(["paris", "lille"]);
  });

  it("écrit une phrase avec prénoms et ville, sans nom de famille ni adresse", () => {
    const sentence = proofSentence(proof({}));
    expect(sentence).toBe("Laurence a reçu un coup de main de Karim à Annecy.");
    expect(sentence).not.toMatch(/rue|avenue|\d{5}/i);
  });

  it("dit la date en semaine", () => {
    expect(weekLabel("2026-10-02T09:00:00Z", now)).toBe("Il y a 3 jours");
    expect(weekLabel(null, now)).toBe("Récemment");
  });
});

describe("compteur de coups de main", () => {
  it("reste absent tant qu'aucun coup de main n'est confirmé", () => {
    expect(helpCountsLabel(0, 0)).toBeNull();
  });

  it("accorde les deux compteurs", () => {
    expect(helpCountsLabel(3, 1)).toBe("3 coups de main donnés, 1 reçu");
    expect(helpCountsLabel(1, 0)).toBe("1 coup de main donné");
    expect(helpCountsLabel(0, 2)).toBe("2 reçus");
  });
});

describe("textes du lot", () => {
  it("garde les textes affirmatifs et sans tiret cadratin", () => {
    const texts = [
      meetupPromptBody("Karim", "Nourrir les poules"),
      proofSentence(proof({})),
      proofEmailLine({ owner_first_name: "Laurence", helper_first_name: "Karim", distance_km: 6, week_label: "Hier" }),
      helpCountsLabel(2, 1) ?? "",
    ];
    for (const text of texts) {
      expect(text).not.toContain("—");
      expect(text).not.toContain("–");
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
