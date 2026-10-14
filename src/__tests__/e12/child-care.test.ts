import { describe, expect, it } from "vitest";
import { isChildCareRequest } from "@/lib/missionChildCare";
import almaPrompt from "../../../supabase/functions/_shared/alma-system-prompt.ts?raw";
import composerSrc from "@/pages/CreateSmallMission.tsx?raw";
import sqlSrc from "../../../supabase/prepared-migrations/20261014130000_e12_garde_enfants.sql?raw";

describe("lot E12, garde d'enfants exclue de l'Entraide", () => {
  it.each([
    "Garde d'enfants mercredi après-midi",
    "Cherche baby-sitter samedi soir",
    "Besoin d'une nounou deux heures",
    "Quelqu'un pour garder mes enfants mardi",
    "Pouvez-vous garder ma fille pendant mon rendez-vous ?",
    "S'occuper de mes petits pendant une heure",
    "Aller chercher mon fils à l'école jeudi",
    "Sortie d'école le vendredi",
  ])("refuse : %s", (title) => {
    expect(isChildCareRequest(title)).toBe(true);
  });

  it.each([
    "Garder mon chien pendant le week-end",
    "Garde de mes deux chats",
    "Aide aux devoirs de maths pour un collégien",
    "Partie de Scrabble au café du coin",
    "Famille avec enfants cherche coup de main au potager",
    "Nourrir mes poules pendant trois jours",
  ])("laisse passer : %s", (title) => {
    expect(isChildCareRequest(title)).toBe(false);
  });

  it("le formulaire et la base refusent, le message est commun", () => {
    expect(composerSrc).toContain("isChildCareRequest(title, description)");
    expect(composerSrc).toContain('"child_care_in_mutual_aid"');
    expect(sqlSrc).toContain("HINT = 'child_care_in_mutual_aid'");
  });

  it("Alma ne propose plus la garde d'enfants", () => {
    expect(almaPrompt).not.toMatch(/garde d'enfants sont possibles/);
    expect(almaPrompt).toContain("La garde d'enfants reste hors de l'entraide");
  });
});
