import { describe, it, expect } from "vitest";
import { checkOutput, repairOutput, pickAiIdentityTemplate, AI_IDENTITY_TEMPLATES, aiIdentityBrief, checkLocked, VOICE_EXAMPLES, companionDirective } from "../../../supabase/functions/_shared/alma-companion";
import { foreignWordsWithoutListings, foreignPlaceInConversation, expressedIntent } from "../../../supabase/functions/_shared/alma-truth";
import { FRENCH_CITIES } from "../../../supabase/functions/_shared/alma-places";

const guard = (over: Record<string, unknown> = {}) => ({
  memberText: "je recherche une garde en toscane martine damgan",
  contextText: "je recherche une garde en toscane martine damgan il n'y a aucune garde en italie",
  gazetteer: FRENCH_CITIES,
  noListingPlaces: foreignWordsWithoutListings([{ country: "FR" }]),
  actionLabels: ["Postuler à cette garde", "Créer une annonce de garde"],
  hasPriorExchange: false,
  ...over,
});

describe("L4b, filet de sortie", () => {
  it("cas-46 : la relance garde le lieu demandé avant", () => {
    const prev = ["Je recherche une garde en toscane", "Je cherche à garder un chien en toscane.", "Où sont les annonces ?"];
    expect(expressedIntent("Où est cette page ?", prev)).toBe("sitter");
    expect(foreignPlaceInConversation("Où est cette page ?", prev)?.iso).toBe("IT");
  });
  it("un lieu sans annonce n'est jamais une destination", () => {
    const t = "Pour voir les annonces disponibles et trouver celle qui vous mènera en Toscane, passez en espace gardien.";
    expect(checkOutput(t, guard())).toContain("lieu_sans_annonce:toscane");
    expect(checkOutput("Il n'y a aucune garde en Italie aujourd'hui.", guard())).toEqual([]);
    expect(repairOutput(t + " Il n'y a aucune garde en Italie aujourd'hui.", guard())).toBe("Il n'y a aucune garde en Italie aujourd'hui.");
  });
  it("une ville absente des faits est retirée (cas-43, cas-45)", () => {
    const t = "Vous voyez vos propres annonces, comme celle pour votre maison à Paris ou vos animaux à Lyon. Les gardes sont dans votre espace gardien.";
    expect(checkOutput(t, guard())).toEqual(expect.arrayContaining(["lieu_hors_faits:paris", "lieu_hors_faits:lyon"]));
    expect(repairOutput(t, guard())).toBe("Les gardes sont dans votre espace gardien.");
  });
  it("une ville des faits reste citable", () => {
    expect(checkOutput("Votre brouillon pour Nantes attend de nouvelles dates.", guard({ memberText: "brouillon nantes", contextText: "brouillon nantes" }))).toEqual([]);
  });
  it("le libellé d'un bouton n'est pas recopié avec sa majuscule", () => {
    expect(checkOutput("Vous pouvez Postuler à cette garde.", guard())).toEqual(["libelle_recopie"]);
    expect(repairOutput("Vous pouvez publier sur la page Créer une annonce de garde.", guard())).toBe("Vous pouvez publier sur la page créer une annonce de garde.");
    expect(checkOutput("Postuler prend une minute.", guard())).toEqual([]);
  });
  it("aucune référence à un échange inexistant", () => {
    expect(checkOutput("Comme je vous ai déjà dit, c'est une IA.", guard())).toEqual(["echange_fantome"]);
    expect(checkOutput("Comme je vous ai déjà dit, c'est une IA.", guard({ hasPriorExchange: true }))).toEqual([]);
  });
  it("transparence : ouvertures variées, jamais « Je suis »", () => {
    for (const t of AI_IDENTITY_TEMPLATES) {
      expect(t).not.toMatch(/^Je suis/);
      expect(checkLocked(t, aiIdentityBrief(t))).toEqual([]);
    }
    expect(checkLocked("Je suis l'assistante IA de Guardiens.", aiIdentityBrief())).toContain("interdit:ouverture_je_suis");
    const first = pickAiIdentityTemplate([], () => 0);
    expect(pickAiIdentityTemplate([first], () => 0)).not.toBe(first);
  });
  it("trois exemples de voix, sans tiret long, transmis au modèle", () => {
    expect(VOICE_EXAMPLES).not.toMatch(/[\u2013\u2014]/);
    expect(VOICE_EXAMPLES).toMatch(/yorkshire/);
    expect(VOICE_EXAMPLES).toMatch(/Galerie/);
    expect(VOICE_EXAMPLES).toMatch(/Italie/);
    expect(companionDirective({ firstName: null, city: null, pets: [], currentSit: null, listings: [], lastExchange: null, recentOpeners: [], freeTalk: false })).toContain("EXEMPLES DE TON");
  });
});
