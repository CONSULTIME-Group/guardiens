/**
 * Republication en mode copie : le contenu de l'annonce source doit remplir le
 * formulaire, et aucune copie locale vide ne doit l'écraser ni annoncer une
 * restauration inexistante.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { localDraftHasContent } from "@/pages/CreateSit";

const src = readFileSync("src/pages/CreateSit.tsx", "utf-8");

describe("CreateSit, republication en mode copie", () => {
  it("charge l'annonce source et remplit titre, attentes, routine et message d'accueil", () => {
    // La requête source sélectionne bien les champs attendus.
    const selectLine = src.match(/from\("sits"\)\.select\("title, specific_expectations[^)]*\)/)?.[0] ?? "";
    for (const col of ["title", "specific_expectations", "daily_routine", "owner_message"]) {
      expect(selectLine).toContain(col);
    }
    // Et ces champs sont appliqués au formulaire.
    const applyBlock = src.slice(src.indexOf("if (sourceSitRes?.data)"), src.indexOf("setIsRepublish(true)"));
    expect(applyBlock).toContain("setTitle(s.title");
    expect(applyBlock).toContain("applyExpectations(s.specific_expectations");
    expect(applyBlock).toContain("setDailyRoutine(s.daily_routine");
    expect(applyBlock).toContain("setOwnerMessage(s.owner_message");
    // Les dates ne sont jamais copiées depuis la source.
    expect(applyBlock).not.toContain("setStartDate(");
    expect(applyBlock).not.toContain("setEndDate(");
  });

  it("la restauration locale est court-circuitée quand une annonce source est chargée", () => {
    expect(src).toContain("restoreLocalDraftIfFresher(remoteDraftUpdatedAt, remoteDraftId, !!sourceSitRes?.data)");
    expect(src).toMatch(/if \(sourceLoaded\) return;/);
  });

  it("une copie locale vide n'est ni écrite ni restaurée", () => {
    expect(localDraftHasContent(null)).toBe(false);
    expect(localDraftHasContent({ title: "", ownerMessage: "  ", openTo: [], sitEnvironments: [] })).toBe(false);
    expect(localDraftHasContent({ title: "Garde d'un chien à Lyon" })).toBe(true);
    expect(localDraftHasContent({ dailyRoutine: "Sortie le matin" })).toBe(true);
    expect(localDraftHasContent({ openTo: ["couple"] })).toBe(true);
    // Le garde-fou est branché des deux côtés, écriture et restauration.
    expect(src.match(/localDraftHasContent\(/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
