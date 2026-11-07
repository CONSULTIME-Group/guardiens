// Lot PUB1 : une sortie du formulaire dit si elle est choisie, imposée par
// le site ou un abandon réel.
import { describe, expect, it } from "vitest";
import { buildAbandonMetadata, classifyAbandonExit, normalizeExitPath } from "@/lib/sitCreateAbandon";

const base = { step: 0, hasDraftParam: false, formShown: true, lastField: "title", draftSaved: true };

describe("nature d'une sortie", () => {
  // Lot PUB2 : une fermeture n'est plus un abandon d'office (un rechargement
  // envoie le même signal), voir src/__tests__/pub2/fermeture-reouverture.test.ts.
  it("fermer la page est une fermeture à l'issue inconnue", () => {
    expect(classifyAbandonExit({ exit: "page_close", intent: "save_and_exit" })).toBe("closed");
  });

  it("enregistrer et quitter est un départ choisi", () => {
    expect(classifyAbandonExit({ exit: "route_change", intent: "save_and_exit", nextPath: "/dashboard" })).toBe("intentional");
  });

  it("choisir l'entraide pour une visite est un départ choisi", () => {
    expect(classifyAbandonExit({ exit: "route_change", intent: "mutual_aid", nextPath: "/petites-missions/creer" })).toBe("intentional");
  });

  it("le parcours d'arrivée imposé est une redirection", () => {
    expect(classifyAbandonExit({ exit: "route_change", intent: "arrival_resume" })).toBe("redirect");
    expect(classifyAbandonExit({ exit: "route_change", nextPath: "/onboarding/affinity" })).toBe("redirect");
  });

  it("partir vers le tableau de bord sans geste du formulaire est un abandon", () => {
    expect(classifyAbandonExit({ exit: "route_change", nextPath: "/dashboard" })).toBe("abandon");
  });

  it("un motif inconnu ne vaut pas départ choisi", () => {
    expect(classifyAbandonExit({ exit: "route_change", intent: "n'importe quoi", nextPath: "/sits" })).toBe("abandon");
  });
});

describe("métadonnées de sortie", () => {
  it("portent la destination sans identifiant ni paramètre", () => {
    const m = buildAbandonMetadata({
      ...base, exit: "route_change", intent: null,
      nextPath: "/sits/3e3e8680-512d-4e0d-991a-a2e7bb77bf1e?publier=1", draftExists: true,
    });
    expect(m.next_path).toBe("/sits/:id");
    expect(m.draft_exists).toBe(true);
    expect(m.exit_kind).toBe("abandon");
    expect(JSON.stringify(m)).not.toContain("3e3e8680");
  });

  it("disent qu'un brouillon existe même sans paramètre d'adresse (cas du 26/10)", () => {
    const m = buildAbandonMetadata({ ...base, exit: "route_change", nextPath: "/dashboard", draftExists: true });
    expect(m.has_draft).toBe(false);
    expect(m.draft_exists).toBe(true);
  });

  it("aucune destination pour une fermeture de page", () => {
    expect(buildAbandonMetadata({ ...base, exit: "page_close", nextPath: "/sits/create" }).next_path).toBeNull();
  });

  it("chemin non interne écarté", () => {
    expect(normalizeExitPath("https://exemple.org/x")).toBeNull();
  });
});
