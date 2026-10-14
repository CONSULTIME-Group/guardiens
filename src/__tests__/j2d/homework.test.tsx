/**
 * Lot J2d : aide aux devoirs (CGU 7.4). Détection étroite, encadré
 * d'information non bloquant dans le formulaire de besoin, mention courte
 * sur le savoir-faire.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  HOMEWORK_CONDITIONS,
  HOMEWORK_SKILL_NOTE,
  isHomeworkHelpRequest,
  isHomeworkSkill,
} from "@/lib/missionHomework";
import { isChildCareRequest } from "@/lib/missionChildCare";
import HomeworkConditionsNote from "@/components/missions/HomeworkConditionsNote";

const read = (p: string) => readFileSync(p, "utf8");

describe("détection de l'aide aux devoirs", () => {
  it.each([
    "Aide aux devoirs de maths pour un collégien",
    "Cherche une aide au devoir en anglais",
    "Soutien scolaire en français, classe de 4e",
    "Accompagnement scolaire le mercredi",
    "Quelqu'un pour revoir les devoirs de physique",
  ])("repère : %s", (title) => {
    expect(isHomeworkHelpRequest(title)).toBe(true);
    expect(isChildCareRequest(title)).toBe(false);
  });

  it.each([
    "Partie de Scrabble au café du coin",
    "Famille avec enfants cherche coup de main au potager",
    "Cours d'anglais entre adultes",
    "Aide administrative pour mes impôts",
    "Garder mon chien pendant le week-end",
  ])("laisse : %s", (title) => {
    expect(isHomeworkHelpRequest(title)).toBe(false);
  });

  it("lit aussi la description", () => {
    expect(isHomeworkHelpRequest("Coup de main le mercredi", "Pour du soutien scolaire en maths, niveau 5e.")).toBe(true);
  });

  it("savoir-faire concerné", () => {
    expect(isHomeworkSkill("Aide aux devoirs")).toBe(true);
    expect(isHomeworkSkill("Soutien scolaire en maths")).toBe(true);
    expect(isHomeworkSkill("Jeux de société")).toBe(false);
  });
});

describe("encadré du formulaire", () => {
  it("quatre puces, le titre et le renvoi à l'article 7.4", () => {
    render(
      <MemoryRouter>
        <HomeworkConditionsNote />
      </MemoryRouter>,
    );
    const note = screen.getByTestId("homework-conditions-note");
    expect(note.getAttribute("role")).toBe("note");
    expect(note.querySelectorAll("li")).toHaveLength(4);
    expect(screen.getByText("Aide aux devoirs : les conditions")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/cgu");
    expect(note.textContent).toMatch(/article 7\.4/);
  });

  it("le formulaire l'affiche à l'étape 2 sans bloquer la publication", () => {
    const src = read("src/pages/CreateSmallMission.tsx");
    expect(src).toContain("isHomeworkHelpRequest(title, description)");
    expect(src).toContain("{homeworkHelp && <HomeworkConditionsNote />}");
    // Aucun refus : l'aide aux devoirs n'apparaît dans aucune garde de soumission.
    expect(src).not.toMatch(/if\s*\(\s*homeworkHelp\s*\)\s*\{?\s*(return|toast)/);
  });

  it("la mention du savoir-faire est posée là où il se choisit", () => {
    expect(read("src/components/profile/CompetenceAutocomplete.tsx")).toContain("competences.some(isHomeworkSkill)");
    expect(read("src/pages/arrival/ArriveeSavoirFaire.tsx")).toContain("competences.some(isHomeworkSkill)");
    expect(read("src/lib/skills/categories.ts")).toContain('"Aide aux devoirs"');
  });
});

describe("règles de rédaction", () => {
  const texts = [...HOMEWORK_CONDITIONS, HOMEWORK_SKILL_NOTE];
  it("sans tiret cadratin ni demi-cadratin, sans vocabulaire proscrit", () => {
    for (const t of texts) {
      expect(t).not.toMatch(/[–—]/);
      expect(t).not.toMatch(/\bvoisins?\b|à vie|offert|sans engagement/i);
    }
  });
  it("vouvoiement et formulations affirmatives", () => {
    for (const t of texts) {
      expect(t).not.toMatch(/(?<!\p{L})(tu|ton|ta|tes|toi)(?!\p{L})/iu);
      expect(t).toMatch(/(?<!\p{L})(vous|votre|vos)(?!\p{L})/iu);
      expect(t).not.toMatch(/\bne\s+\S+\s+(pas|jamais|plus)\b|\bn['’]\S+\s+(pas|jamais|plus)\b/i);
    }
  });
});
