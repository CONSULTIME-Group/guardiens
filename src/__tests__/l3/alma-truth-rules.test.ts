import { describe, it, expect } from "vitest";
import {
  expressedIntent, spaceGuidance, foreignPlaceIn, frenchPlaceIn, hasForeignSits, asksAboutListings,
  isStaleDraft, isMessagingQuestion, scrubTruth, foreignNoneSentence,
  SPACE_OWNER_TO_SITTER, SPACE_SITTER_TO_OWNER, SITTER_SEARCH_PATH, OWNER_CREATE_PATH, SETTINGS_SPACES_PATH,
} from "../../../supabase/functions/_shared/alma-truth";
import { computeNextAction } from "../../../supabase/functions/_shared/alma-next-action";
import { ALMA_SYSTEM_PROMPT } from "../../../supabase/functions/_shared/alma-system-prompt";

describe("règle 1 : espace actif", () => {
  it.each([
    "Je recherche une garde en toscane",
    "Je cherche à garder un chien en toscane.",
    "Où sont les annonces ? Sous la rubrique annonces, je ne trouve que la mienne.",
    "Je voudrais garder des chats cet été",
  ])("intention de gardien : « %s »", (q) => expect(expressedIntent(q)).toBe("sitter"));

  it.each([
    "Je cherche une garde pour mon chien",
    "Je pars en vacances et je veux faire garder mes chats",
    "Comment trouver un gardien ?",
  ])("intention de propriétaire : « %s »", (q) => expect(expressedIntent(q)).toBe("owner"));

  it.each(["Comment allez-vous ?", "supprimer mon compte", "Où est cette page ?"])("aucune intention seule : « %s »", (q) =>
    expect(expressedIntent(q)).toBeNull());

  it("une relance courte reprend l'intention précédente", () => {
    expect(expressedIntent("Où est cette page ?", ["Je cherche à garder un chien en toscane."])).toBe("sitter");
    expect(expressedIntent("Comment publier ?", ["Je cherche à garder un chien"])).toBeNull();
  });

  it("both en espace propriétaire, intention gardien : phrase exacte et passage en espace gardien", () => {
    const g = spaceGuidance({ accountRole: "both", activeRole: "owner", intent: "sitter" })!;
    expect(g.sentence).toBe(SPACE_OWNER_TO_SITTER);
    expect(g.action.path).toBe(SITTER_SEARCH_PATH);
  });
  it("cas symétrique : both en espace gardien qui veut faire garder", () => {
    const g = spaceGuidance({ accountRole: "both", activeRole: "sitter", intent: "owner" })!;
    expect(g.sentence).toBe(SPACE_SITTER_TO_OWNER);
    expect(g.action.path).toBe(OWNER_CREATE_PATH);
  });
  it("un seul rôle : proposition d'activer dans les réglages, sans bascule", () => {
    const a = spaceGuidance({ accountRole: "owner", activeRole: "owner", intent: "sitter" })!;
    const b = spaceGuidance({ accountRole: "sitter", activeRole: "sitter", intent: "owner" })!;
    expect([a.action.path, b.action.path]).toEqual([SETTINGS_SPACES_PATH, SETTINGS_SPACES_PATH]);
    expect(a.switchable || b.switchable).toBe(false);
  });
  it.each([
    ["both", "sitter", "sitter"], ["both", "owner", "owner"], ["sitter", "sitter", "sitter"], ["both", "owner", null],
  ] as const)("ne déclenche pas : %s / %s / %s", (accountRole, activeRole, intent) =>
    expect(spaceGuidance({ accountRole, activeRole, intent })).toBeNull());
});

describe("règle 2 : périmètre réel", () => {
  const sits = [{ country: "FR", city: "Damgan", departement_code: "56" }, { country: "PF", city: "Papeete", departement_code: "987" }];
  const deps = [{ code: "56", nom: "Morbihan", nom_region: "Bretagne" }, { code: "29", nom: "Finistère", nom_region: "Bretagne" }, { code: "74", nom: "Haute-Savoie", nom_region: "Auvergne-Rhône-Alpes" }, { code: "987", nom: "Polynésie française" }];
  it("Toscane et Italie : Italie, phrase exacte", () => {
    expect(foreignPlaceIn("une garde en toscane")?.iso).toBe("IT");
    expect(foreignNoneSentence("en Italie")).toBe("Guardiens propose des gardes en France, Polynésie française comprise. Il n'y a aucune garde en Italie aujourd'hui.");
  });
  it.each(["une garde à Papeete", "garde en Polynésie", "garde à Lyon", "Comment allez-vous ?"])("pas de pays étranger : « %s »", (q) =>
    expect(foreignPlaceIn(q)).toBeNull());
  it("toutes les annonces en France ou en Polynésie : aucune hors de France", () => {
    expect(hasForeignSits(sits)).toBe(false);
    expect(hasForeignSits([...sits, { country: "IT" }])).toBe(true);
  });
  it("lieu en France vérifié : Haute-Savoie sans annonce, Bretagne avec une annonce", () => {
    expect(frenchPlaceIn("je cherche une garde en haute-savoie", deps, sits)).toEqual({ label: "Haute-Savoie", count: 0 });
    expect(frenchPlaceIn("une garde en Bretagne", deps, sits)?.count).toBe(1);
    expect(frenchPlaceIn("une garde à Damgan", deps, sits)?.count).toBe(1);
  });
  it.each(["je cherche à garder un chien", "comment postuler ?"])("aucun lieu reconnu : « %s »", (q) =>
    expect(frenchPlaceIn(q, deps, sits)).toBeNull());
  it("question sur les annonces seulement", () => {
    expect(asksAboutListings("Je recherche une garde en toscane")).toBe(true);
    expect(asksAboutListings("Je pars en Toscane demain, des conseils ?")).toBe(false);
  });
  it("filet : « dossier » et « international » disparaissent", () => {
    const out = scrubTruth("Je ne vois aucune annonce dans votre dossier. Consultez les annonces à l'international. Bonne journée.", { messaging: false, foreignOpen: false });
    expect(out).toBe("Je ne vois aucune annonce sur Guardiens. Bonne journée.");
    expect(scrubTruth("Voir l'international.", { messaging: false, foreignOpen: true })).toContain("international");
  });
  it("aucune action internationale tant qu'aucune annonce hors de France n'existe", () => {
    const r = computeNextAction({ ...base(), question: "une garde à l'international", foreignOpen: false });
    expect([r.action?.path, ...r.chips.map((c) => c.path)]).not.toContain("/annonces/international");
  });
});

function base(): any {
  return {
    facts: { brouillons: [{ sit_id: "d1", titre: "Angus", debut: "2026-09-03" }], candidatures_envoyees: {}, candidatures_recues_non_ouvertes: 0, annonces_publiees: [], candidature_sans_reponse_jours: null },
    inventory: { departement: "56", hors_france: false, pays: "FR", gardes: [], demandes_entraide: [], offres_entraide: [], projets: [], associations: [], questions_sans_reponse: [] },
    accountRole: "both", activeRole: "owner", question: "Bonjour", register: "dossier", completion: 80, today: "2026-10-07",
  };
}

describe("règle 3 : brouillons périmés", () => {
  it("date de début passée : jamais « Publier le brouillon », reprise à l'étape des dates", () => {
    const r = computeNextAction(base());
    expect(r.action?.label).toBe("Reprendre ce brouillon avec de nouvelles dates");
    expect(r.action?.path).toBe("/sits/create?draftId=d1&etape=dates");
  });
  it("brouillon à venir ou sans date : « Publier le brouillon » reste proposé", () => {
    const b = base();
    b.facts.brouillons = [{ sit_id: "d2", titre: "Filou", debut: "2026-12-01" }];
    expect(computeNextAction(b).action?.label).toMatch(/^Publier le brouillon/);
    expect(isStaleDraft({ debut: null }, "2026-10-07")).toBe(false);
    expect(isStaleDraft({ debut: "2026-10-07" }, "2026-10-07")).toBe(false);
  });
  it("intention de gardien : aucune action propriétaire", () => {
    const r = computeNextAction({ ...base(), sitterIntent: true });
    const paths = [r.action?.path, ...r.chips.map((c) => c.path)].filter(Boolean) as string[];
    expect(paths.some((p) => p.startsWith("/sits/create"))).toBe(false);
  });
});

describe("règle 4 : messagerie seulement sur un message envoyé, lu ou reçu", () => {
  it.each([
    "Mon message a-t-il été lu ?",
    "Le propriétaire a-t-il reçu mon message ?",
    "J'ai envoyé un message hier, pas de réponse",
  ])("déclenche : « %s »", (q) => expect(isMessagingQuestion(q)).toBe(true));
  it.each([
    "Je ne peux trouver la page pour supprimer la photo de ma maison",
    "Où sont les annonces ?",
    "Comment écrire un bon message d'accueil ?",
    "Où est la messagerie ?",
  ])("ne déclenche pas : « %s »", (q) => expect(isMessagingQuestion(q)).toBe(false));
  it("la consigne messagerie ne part plus à chaque tour", () => {
    expect(ALMA_SYSTEM_PROMPT).not.toContain("Je ne peux pas consulter votre messagerie");
  });
  it("filet : la phrase disparaît hors question de message, reste sinon", () => {
    const t = "Je ne peux pas consulter votre messagerie ni vérifier l'envoi ou la lecture de ce message. La photo se gère dans la Galerie.";
    expect(scrubTruth(t, { messaging: false, foreignOpen: false })).toBe("La photo se gère dans la Galerie.");
    expect(scrubTruth(t, { messaging: true, foreignOpen: false })).toContain("messagerie");
  });
});
