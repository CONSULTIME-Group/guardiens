import { describe, it, expect } from "vitest";
import { ALMA_SYSTEM_PROMPT } from "../../../supabase/functions/_shared/alma-system-prompt";
import { MESSAGING_DIRECTIVE } from "../../../supabase/functions/_shared/alma-truth";
import { checkOutput, repairOutput } from "../../../supabase/functions/_shared/alma-companion";

const g = {
  noListingPlaces: [], gazetteer: [], memberText: "", contextText: "",
  actionLabels: [], hasPriorExchange: true,
} as Parameters<typeof checkOutput>[1];

describe("ALMA-V1 · gestes réels dans le prompt", () => {
  it("cite les vrais gestes d'annonce et d'entraide", () => {
    expect(ALMA_SYSTEM_PROMPT).toContain("GESTES RÉELS DU SITE");
    for (const label of ["Modifier l'annonce", "Dépublier", "Supprimer l'annonce", "Archiver"]) {
      expect(ALMA_SYSTEM_PROMPT).toContain(label);
    }
    expect(ALMA_SYSTEM_PROMPT).toContain("prévenu par message et par email");
    expect(ALMA_SYSTEM_PROMPT).toMatch(/« Modifier la description » corrige le texte/);
    expect(ALMA_SYSTEM_PROMPT).toMatch(/« Clore ce besoin »/);
    expect(ALMA_SYSTEM_PROMPT).not.toMatch(/elle ne se modifie pas/);
  });

  it("décrit les coches de lecture", () => {
    expect(ALMA_SYSTEM_PROMPT).toMatch(/coche grise indique « envoyé, pas encore lu »/);
    expect(ALMA_SYSTEM_PROMPT).toMatch(/deux coches vertes indiquent « lu »/);
    expect(MESSAGING_DIRECTIVE).toMatch(/deux coches vertes veulent dire lu/);
  });

  it("le bloc suit la voix : vouvoiement, aucun tiret cadratin, aucun chemin", () => {
    const block = ALMA_SYSTEM_PROMPT.slice(ALMA_SYSTEM_PROMPT.indexOf("GESTES RÉELS DU SITE"), ALMA_SYSTEM_PROMPT.indexOf("URGENCE"));
    expect(block).not.toMatch(/[—–]/);
    expect(block).not.toMatch(/\s\/[a-z]/);
    expect(block).not.toMatch(/gratuit/i);
  });
});

describe("ALMA-V1 · filet de sortie", () => {
  const BAD = [
    "La messagerie de Guardiens n'affiche aucun accusé de lecture pour les messages privés.",
    "Passez l'annonce en pause depuis sa fiche.",
    "Votre annonce peut être fermée aux candidatures.",
    "Vous pouvez désactiver l'option qui accepte de nouvelles candidatures.",
    "Ouvrez la fiche de votre demande d'entraide et utilisez le bouton d'édition.",
  ];
  for (const sentence of BAD) {
    it(`signale : ${sentence.slice(0, 40)}`, () => {
      expect(checkOutput(sentence, g)).toContain("geste_inexistant");
    });
  }

  const GOOD = [
    "Sous votre dernier message, deux coches vertes indiquent qu'il est lu.",
    "Dépubliez votre annonce depuis sa fiche, les gardiens sont prévenus par message et par email.",
    "Clôturez la demande puis publiez-en une nouvelle avec vos précisions.",
    "Le bouton Modifier l'annonce change le texte et les photos.",
  ];
  for (const sentence of GOOD) {
    it(`laisse passer : ${sentence.slice(0, 40)}`, () => {
      expect(checkOutput(sentence, g)).not.toContain("geste_inexistant");
    });
  }

  it("la réparation retire la phrase inventée et garde le reste", () => {
    const answer = "Deux coches vertes indiquent un message lu. La messagerie n'affiche aucun accusé de lecture. Ouvrez votre messagerie pour le voir.";
    const fixed = repairOutput(answer, g);
    expect(fixed).toContain("Deux coches vertes");
    expect(fixed).toContain("Ouvrez votre messagerie");
    expect(fixed).not.toMatch(/aucun accusé/);
  });
});
