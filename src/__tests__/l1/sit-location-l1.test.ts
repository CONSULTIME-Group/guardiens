import { describe, it, expect } from "vitest";
import { sitLocationLabel, SIT_LOCATION_UNKNOWN, deptCodeFromPostal } from "@/lib/sitLocation";
import * as edge from "../../../supabase/functions/_shared/sit-location";
import {
  getSitPublishBlockers,
  getBlockingBlockers,
  buildSitPublishInput,
  SIT_CITY_REQUIRED_MESSAGE,
} from "@/lib/sitPublishRules";
import { describeSitWriteError } from "@/lib/sitDbErrors";
import { missingCityTitle, sitNeedsCity } from "@/components/sits/owner/MissingSitCityBanner";
import {
  detectAddressedToOwner,
  buildOwnerQuestionAnswer,
  sitDetailAction,
  asksAboutAlma,
  OWNER_QUESTION_SENTENCE,
} from "../../../supabase/functions/_shared/alma-owner-question";
import { computeNextAction } from "../../../supabase/functions/_shared/alma-next-action";
import { emptyInventory } from "../../../supabase/functions/_shared/alma-inventory";

describe("L1, localisation d'une annonce", () => {
  it("ville de l'annonce en premier", () => {
    expect(sitLocationLabel({ sitCity: "Zellwiller", ownerCity: "Barr", postalCode: "67140", departementName: "Bas-Rhin" })).toBe("Zellwiller");
  });
  it("ville du profil à défaut", () => {
    expect(sitLocationLabel({ sitCity: null, ownerCity: "Zellwiller", postalCode: "67140" })).toBe("Zellwiller");
  });
  it("code postal et département seuls, sans deviner de commune", () => {
    expect(sitLocationLabel({ sitCity: "", ownerCity: null, postalCode: "69380", departementName: "Rhône" })).toBe("69380, Rhône");
  });
  it("rien : libellé neutre, jamais vide ni null", () => {
    const l = sitLocationLabel({});
    expect(l).toBe(SIT_LOCATION_UNKNOWN);
    expect(l).not.toMatch(/null|undefined/);
    expect(sitLocationLabel({ sitCity: "null", ownerCity: "  " })).toBe(SIT_LOCATION_UNKNOWN);
  });
  it("copie Edge identique", () => {
    for (const i of [{ sitCity: "A" }, { ownerCity: "B" }, { postalCode: "69380", departementName: "Rhône" }, {}]) {
      expect(edge.sitLocationLabel(i)).toBe(sitLocationLabel(i));
    }
    expect(deptCodeFromPostal("98714")).toBe("987");
    expect(deptCodeFromPostal("69380")).toBe("69");
  });
});

const base = {
  sit: { title: "Garde", start_date: "2099-01-01", end_date: "2099-01-10", specific_expectations: "x".repeat(60) },
  property: { photos: ["a"] },
  pets: [{}],
};

describe("L1, commune exigée pour publier", () => {
  it("sans commune ni ville de profil : refus avec le message exact", () => {
    const b = getBlockingBlockers(getSitPublishBlockers(buildSitPublishInput(base)));
    expect(b.map((x) => x.label)).toContain(
      "Indiquez la commune de votre logement pour que les gardiens sachent où se trouve la garde.",
    );
    expect(SIT_CITY_REQUIRED_MESSAGE).not.toMatch(/[\u2013\u2014]/);
  });
  it("ville du profil reprise automatiquement", () => {
    const b = getSitPublishBlockers(buildSitPublishInput({ ...base, ownerCity: "Lozanne" }));
    expect(b.some((x) => x.id === "city")).toBe(false);
  });
  it("commune de l'annonce suffit", () => {
    const b = getSitPublishBlockers(buildSitPublishInput({ ...base, sit: { ...base.sit, city: "Lozanne" } }));
    expect(b.some((x) => x.id === "city")).toBe(false);
  });
  it("le refus de la base est traduit par le même message", () => {
    expect(describeSitWriteError({ code: "P0001", message: SIT_CITY_REQUIRED_MESSAGE })).toBe(SIT_CITY_REQUIRED_MESSAGE);
  });
  it("encart propriétaire générique", () => {
    expect(missingCityTitle(2)).toBe("Ajoutez la commune de votre logement : 2 gardiens ont déjà postulé");
    expect(sitNeedsCity({ id: "x", status: "published", city: null }, null)).toBe(true);
    expect(sitNeedsCity({ id: "x", status: "published", city: null }, "Lozanne")).toBe(false);
    expect(sitNeedsCity({ id: "x", status: "draft", city: null }, null)).toBe(false);
  });
});

describe("L1, question adressée au propriétaire", () => {
  const yes = [
    "Bonjour quel est le nom de votre joli village ?",
    "Pouvez-vous me préciser la ville",
    "Votre chien s'entend-il avec les chats ?",
    "La maison a-t-elle un jardin clos ?",
    "Quels sont vos horaires de départ ?",
    "Avez-vous un wifi dans le logement ?",
  ];
  const no = [
    "comment postuler ?",
    "supprimer mon compte",
    "Comment se passe une garde ?",
    "Alma, tu habites où ?",
  ];
  for (const q of yes) it(`déclenche : ${q}`, () => expect(detectAddressedToOwner(q)).toBe(true));
  for (const q of no) it(`ne déclenche pas : ${q}`, () => expect(detectAddressedToOwner(q)).toBe(false));

  it("Alma interrogée sur elle-même est reconnue", () => {
    expect(asksAboutAlma("Alma, tu habites où ?")).toBe(true);
    expect(asksAboutAlma("quel est le nom de votre joli village ?")).toBe(false);
  });

  it("réponse : faits de la fiche puis orientation vers la candidature", () => {
    const a = buildOwnerQuestionAnswer(
      { id: "s1", title: "Yorkshire", open: true, locationLabel: "69380, Rhône", communeMissing: true, startDate: "2026-10-20", endDate: "2026-10-30", pets: { chien: 1 } },
      "can_apply",
    );
    expect(a).toContain("69380, Rhône");
    expect(a).toContain("1 chien");
    expect(a).toContain(OWNER_QUESTION_SENTENCE);
    expect(a).not.toMatch(/Lyon|Córdoba|voisin|gratuit|[\u2013\u2014]/);
  });
});

describe("L1, action proposée sur sit_detail", () => {
  const id = "85315487-7c43-4e10-a97e-821aefd10a8c";
  it("gardien sans candidature : postuler sur cette annonce", () => {
    expect(sitDetailAction(id, "can_apply", null).path).toBe(`/sits/${id}?postuler=1`);
  });
  it("candidature existante : conversation", () => {
    expect(sitDetailAction(id, "applied", "c1").path).toBe("/messages/c1");
  });
  it("espace propriétaire : passer en espace gardien", () => {
    expect(sitDetailAction(id, "owner_space", null).path).toBe(`/sits/${id}?espace=gardien&postuler=1`);
  });
  it("jamais une autre annonce tant que celle-ci est ouverte", () => {
    const inventory = emptyInventory();
    inventory.gardes = [{ titre: "Autre", ville: "Lyon", lien: "/annonces/autre", id: "autre" } as any];
    const r = computeNextAction({
      facts: { candidatures_envoyees: {}, brouillons: [], annonces_publiees: [], candidatures_recues_non_ouvertes: 0, gardes_confirmees: [] } as any,
      inventory,
      accountRole: "sitter",
      activeRole: "sitter",
      question: "Bonjour quel est le nom de votre joli village ?",
      register: "reassurance",
      completion: 80,
      pagePath: `/sits/${id}`,
      viewedSit: { id, action: sitDetailAction(id, "can_apply", null) },
    });
    expect(r.action?.path).toBe(`/sits/${id}?postuler=1`);
    const all = [r.action?.path, ...r.chips.map((c) => c.path)].filter(Boolean) as string[];
    expect(all.some((p) => /\/(sits|annonces)\/autre/.test(p))).toBe(false);
  });
});
