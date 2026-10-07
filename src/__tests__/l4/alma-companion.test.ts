import { describe, it, expect } from "vitest";
import {
  animalFromText, asksIfHuman, checkLocked, ownerQuestionBrief, aiIdentityBrief, repeatsOpener, openerKey,
} from "../../../supabase/functions/_shared/alma-companion";
import { buildOwnerQuestionAnswer } from "../../../supabase/functions/_shared/alma-owner-question";
import { measureCompanion } from "@/lib/alma/companionMetrics";
import { checkReplayAnswer, sameOpener } from "@/lib/alma/replayChecks";
import { animalToPresent, presentAnimalTitle } from "@/lib/sitAnimalMention";

const TITLE = "Nous recherchons une personne ou un couple retraité pour garder notre petit yorkshire de 11 ans lors d'un voyage";
const facts = { id: "s1", title: TITLE, open: true, locationLabel: "69380, Rhône", communeMissing: true, startDate: "2027-01-09", endDate: "2027-01-20", pets: {}, textAnimal: "yorkshire" };
const brief = ownerQuestionBrief({
  locationLabel: "69380, Rhône", communeMissing: true, startDate: "2027-01-09", endDate: "2027-01-20", pets: [],
  title: TITLE, description: null, viewer: "can_apply",
  action: { label: "Postuler à cette annonce", path: "/sits/s1?postuler=1", reason: "x" },
  template: buildOwnerQuestionAnswer(facts as any, "can_apply"),
});

describe("L4, faits verrouillés", () => {
  it("cas 39 : le gabarit ne dit plus « aucun animal déclaré » et cite le yorkshire", () => {
    expect(brief.template).not.toMatch(/aucun animal/i);
    expect(brief.template).toContain("yorkshire");
  });
  it("une réponse libre complète passe le contrôle", () => {
    const ok = "La garde se situe vers 69380, dans le Rhône, du 9 janvier au 20 janvier 2027, avec le petit yorkshire de l'annonce. Le nom du village, c'est au propriétaire de vous le dire : envoyez votre candidature avec votre message, il vous répondra.";
    expect(checkLocked(ok, brief)).toEqual([]);
  });
  it("fait manquant ou interdit : repli", () => {
    expect(checkLocked("Le propriétaire vous répondra si vous postulez.", brief).some((x) => x.startsWith("manque:"))).toBe(true);
    expect(checkLocked("69380, du 9 janvier au 20 janvier, yorkshire. Moi je vis à Lyon. Postulez, le propriétaire répondra.", brief)).toContain("interdit:vie_alma");
  });
  it("animal du titre", () => expect(animalFromText(TITLE)).toBe("yorkshire"));
});

describe("L4, transparence", () => {
  it.each(["Est-ce que je parle à une vraie personne ?", "Tu es un robot ?", "Vous êtes une IA ?"])("détecte « %s »", (q) => expect(asksIfHuman(q)).toBe(true));
  it.each(["Comment postuler ?", "Mon chien est un robot de gentillesse", "Supprimer mon compte"])("ne détecte pas « %s »", (q) => expect(asksIfHuman(q)).toBe(false));
  it("un déni est refusé, la nature d'IA est exigée", () => {
    const b = aiIdentityBrief();
    expect(checkLocked("Je suis une vraie personne, rassurez-vous.", b).length).toBeGreaterThan(0);
    expect(checkLocked("Je suis l'assistante IA de Guardiens, sous les traits d'Alma. Que cherchez-vous ?", b)).toEqual([]);
    expect(checkLocked(b.template, b)).toEqual([]);
  });
});

describe("L4, variété et mesures", () => {
  it("amorce répétée repérée", () => {
    expect(repeatsOpener("Bonne question, voici ce que je vois.", ["Bonne question, voici ce que je sais."])).toBe(true);
    expect(sameOpener("Bonjour, la garde est", "Pour la garde, voici")).toBe(false);
    expect(openerKey("Bonjour ! La garde, ici.")).toBe("bonjour la garde ici");
  });
  it("mesures du Pilotage", () => {
    const m = measureCompanion([
      { answer: "Voici ce que je vois ici.", classification: { fallback_template: true } },
      { answer: "Voici ce que je vois là.", classification: { fallback_template: false } },
      { answer: "Autre départ complet.", classification: null },
    ]);
    expect(m).toEqual({ answers: 3, sharedOpeners: 2, fallbacks: 1, lockedChecked: 2 });
  });
  it("rejeu : faits attendus et nature d'IA", () => {
    const v = checkReplayAnswer({ question: "Tu es un robot ?", answer: "Je suis humaine.", action: { label: "x", path: "/annonces" }, expect: { aiDisclosure: true } });
    expect(v.reasons).toContain("nature d'IA non dite");
  });
});

describe("L4, encart propriétaire", () => {
  it("annonce publiée sans fiche animal qui cite un yorkshire", () => {
    expect(animalToPresent({ status: "published", title: TITLE }, 0)).toBe("yorkshire");
    expect(presentAnimalTitle("yorkshire")).toBe("Présentez votre yorkshire aux gardiens");
    expect(animalToPresent({ status: "published", title: TITLE }, 1)).toBeNull();
    expect(animalToPresent({ status: "draft", title: TITLE }, 0)).toBeNull();
  });
});
