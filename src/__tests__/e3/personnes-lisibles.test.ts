/**
 * Lot E3 (11/10/2026) : personnes lisibles sur la page Entraide.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { helperActivityLabel, helperFirstMessage, helperSaysHow, helperSkills, sortHelpers } from "@/lib/helperDisplay";

describe("E3, savoir-faire montrés", () => {
  it("nettoyés, sans doublon, 4 au plus", () => {
    expect(helperSkills([" Potager ", "potager", "Pâtisserie", "Patisserie", "", null, "Courses", "Bricolage", "Transport"]))
      .toEqual(["Potager", "Pâtisserie", "Courses", "Bricolage"]);
  });
  it("libellés propres à la garde montrés en dernier, libellés longs raccourcis", () => {
    expect(helperSkills(["Administration médicaments animaux", "Potager", "Entretien piscine", "Courses"]))
      .toEqual(["Potager", "Courses", "Administration médicaments animaux", "Entretien piscine"]);
    const long = helperSkills(["Tonte et entretien jardin, ménage, repassage et petites courses"])[0];
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith("…")).toBe(true);
  });
  it("aide aux devoirs gardée (décision du 11/10, échange gratuit)", () => {
    expect(helperSkills(["Aide aux devoirs"])).toEqual(["Aide aux devoirs"]);
  });
  it("une phrase ou un savoir-faire suffit pour passer devant", () => {
    expect(helperSaysHow({ id: "a", competences: [" "], helps_with: "" })).toBe(false);
    expect(helperSaysHow({ id: "a", competences: ["Potager"] })).toBe(true);
    expect(helperSaysHow({ id: "a", helps_with: "Arroser" })).toBe(true);
  });
});

describe("E3, activité", () => {
  const today = new Date(2026, 9, 11, 18, 0);
  it("cette semaine, ce mois-ci, rien au-delà", () => {
    expect(helperActivityLabel("2026-10-11", today)).toBe("En ligne cette semaine");
    expect(helperActivityLabel("2026-10-04", today)).toBe("En ligne cette semaine");
    expect(helperActivityLabel("2026-09-20", today)).toBe("En ligne ce mois-ci");
    expect(helperActivityLabel("2026-08-01", today)).toBeNull();
    expect(helperActivityLabel(null, today)).toBeNull();
  });
});

describe("E3, ordre de la liste", () => {
  const people = [
    { id: "vide-proche", d: 1, competences: [], helps_with: null, last_active_on: "2026-10-10" },
    { id: "savoir-loin", d: 20, competences: ["Potager"], helps_with: null, last_active_on: null },
    { id: "phrase-proche", d: 2, competences: null, helps_with: "Courses", last_active_on: null },
    { id: "savoir-sans-lieu", d: null, competences: ["Bricolage"], helps_with: null, last_active_on: "2026-10-11" },
  ];
  it("dans 30 km : ceux qui disent comment aider d'abord ; au-delà : la distance ; personne retiré", () => {
    const out = sortHelpers(people, (h) => h.d);
    expect(out.map((h) => h.id)).toEqual(["phrase-proche", "savoir-loin", "vide-proche", "savoir-sans-lieu"]);
    const far = [{ id: "savoir-150", d: 150, competences: ["Potager"] }, { id: "vide-2", d: 2, competences: [] }];
    expect(sortHelpers(far, (h) => h.d).map((h) => h.id)).toEqual(["vide-2", "savoir-150"]);
  });
  it("sans lieu : activité la plus récente", () => {
    const out = sortHelpers(people, null);
    expect(out.map((h) => h.id)).toEqual(["savoir-sans-lieu", "savoir-loin", "phrase-proche", "vide-proche"]);
  });
});

describe("E3, premier message", () => {
  it("cite deux savoir-faire au plus", () => {
    const text = helperFirstMessage("Camille", ["Potager", "Courses", "Bricolage"]);
    expect(text).toContain("Bonjour Camille,");
    expect(text).toContain("vous proposez votre aide pour : Potager, Courses.");
    expect(text).not.toMatch(/[–—]/);
  });
  it("sans savoir-faire, texte générique", () => {
    expect(helperFirstMessage("", [])).toContain("disponible pour donner un coup de main");
  });
});

describe("E3, brouillon dans la messagerie", () => {
  it("lu une fois, posé après le chargement des messages, seulement sur une conversation vierge", () => {
    const src = readFileSync("src/pages/Messages.tsx", "utf8");
    expect(src).toContain("pendingDraftRef.current = { convId: searchParams.get(\"c\"), text: draft };");
    expect(src).toContain("shouldPrefillDraft({ messages: ordered, currentInput: current })");
  });
});

describe("E3, branchements", () => {
  it("la page Entraide et les pages villes lisent les nouvelles colonnes et trient avec sortHelpers", () => {
    for (const path of ["src/pages/EntraideHub.tsx", "src/pages/MissionsCityPage.tsx"]) {
      const src = readFileSync(path, "utf8");
      expect(src).toContain("helps_with, competences, last_active_on");
      expect(src).toContain("sortHelpers(");
    }
  });
  it("la carte montre les savoir-faire et ouvre la conversation avec un brouillon", () => {
    const src = readFileSync("src/components/entraide/EntraideCards.tsx", "utf8");
    expect(src).toContain("Peut vous aider pour : ");
    expect(src).toContain("&draft=${encodeURIComponent(draft)}");
  });
  it("migration : colonnes ajoutées en fin de vue, même filtre", () => {
    const sql = readFileSync("supabase/prepared-migrations/20261011190000_e3_personnes_lisibles.sql", "utf8");
    expect(sql).toMatch(/p\.helps_with,\s+\(array_cat/);
    expect(sql).toContain("COALESCE(op.competences, '{}'::text[]), COALESCE(sp.competences, '{}'::text[])))[1:8] AS competences");
    expect(sql).toContain("::date AS last_active_on");
    expect(sql).toContain("(p.available_for_help = true)");
  });
});
