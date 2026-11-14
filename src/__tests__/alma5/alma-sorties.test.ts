/**
 * Lot ALMA5 (14/11/2026) : Alma connaît la rubrique Sorties, ouverte le 13/11.
 */
import { describe, expect, it } from "vitest";
import { ALMA_KNOWLEDGE_EXCLUDED_ROUTES, ALMA_SITE_KNOWLEDGE, foldText, selectKnowledge } from "../../../supabase/functions/_shared/alma-site-knowledge.ts";
import { OUTING_INTENT } from "../../../supabase/functions/_shared/alma-next-action.ts";
import { ALMA_SYSTEM_PROMPT } from "../../../supabase/functions/_shared/alma-system-prompt.ts";
import { ALMA_PAGE_LABELS } from "../../../supabase/functions/_shared/alma-page-labels.ts";

describe("ALMA5, Alma et les sorties", () => {
  it("les quatre pages Sorties sont décrites et sorties de la liste d'exclusion", () => {
    const paths = ALMA_SITE_KNOWLEDGE.flatMap((e) => [e.path, ...(e.aliases ?? [])]);
    for (const path of ["/sorties", "/sorties/:slug", "/sorties/proposer", "/sorties/alertes"]) {
      expect(paths, path).toContain(path);
      expect(ALMA_KNOWLEDGE_EXCLUDED_ROUTES, path).not.toContain(path);
      expect(ALMA_PAGE_LABELS[path], path).toBeTruthy();
    }
  });
  it("une partie de belote mène aux sorties, plus à l'entraide", () => {
    const entraide = ALMA_SITE_KNOWLEDGE.find((e) => e.key === "entraide");
    expect(entraide?.triggers).not.toContain("belote");
    expect(ALMA_SITE_KNOWLEDGE.find((e) => e.key === "sorties")?.triggers).toContain("belote");
  });
  it("l'envie de jouer ou de rencontrer du monde déclenche le geste sorties", () => {
    for (const q of ["je cherche des joueurs de belote", "j'aimerais rencontrer des gens près de chez moi", "une rando à plusieurs dimanche ?", "je m'ennuie un peu le soir"]) {
      expect(OUTING_INTENT.test(foldText(q)), q).toBe(true);
    }
    expect(OUTING_INTENT.test(foldText("je pars en vacances, qui garde mon chat"))).toBe(false);
  });
  it("le prompt décrit la sortie sans promesse d'argent", () => {
    expect(ALMA_SYSTEM_PROMPT).toContain("Les sorties sont des moments à quelques-uns entre membres");
    expect(ALMA_SYSTEM_PROMPT).toContain("personne ne gagne d'argent à organiser");
  });
});
