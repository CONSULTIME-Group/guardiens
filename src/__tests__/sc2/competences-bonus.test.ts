/**
 * Verrou du lot SC2 (10/11/2026, arène claude/arene/2026-11-10-score-completion) :
 * « Compétences bonus » rangées dans le savoir-faire, champs sans effet retirés
 * du formulaire, gardes réalisées sur la fiche publique.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { guardExperienceLabel } from "@/lib/sitterProfileFacts";

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" || e.name === "integrations" ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });

const migration = readFileSync("drizzle/migrations/0131_sc2_competences_bonus.sql", "utf8");

describe("lot SC2 : compétences bonus", () => {
  it("le site n'écrit plus bonus_skills et ne montre plus « Compétences bonus »", () => {
    for (const f of walk("src")) {
      const t = readFileSync(f, "utf8");
      expect(t.includes("bonus_skills"), f).toBe(false);
      expect(t.includes("Compétences bonus"), f).toBe(false);
    }
  });

  it("la migration range chaque valeur dans le vocabulaire existant", () => {
    expect(migration).toContain("'Ménage occasionnel'");
    expect(migration).toContain("'Tonte et entretien jardin'");
    expect(migration).toMatch(/Jardinage' = ANY\(bonus_skills\) AND NOT has_garden/);
    expect(migration).toContain("special_animal_skills = f.new_special");
  });

  it("la migration échoue au premier score en baisse", () => {
    expect(migration).toMatch(/p\.profile_completion < b\.profile_completion/);
    expect(migration).toMatch(/RAISE EXCEPTION 'sc2_competences_bonus/);
    expect(migration).toMatch(/^BEGIN;/m);
    expect(migration).toMatch(/^COMMIT;/m);
  });

  it("la vue publique reste sans seuil de complétion et gagne guard_experience", () => {
    const view = migration.slice(migration.indexOf("CREATE OR REPLACE VIEW public.public_sitter_profiles"));
    expect(view).toContain("s.guard_experience");
    expect(view.includes("profile_completion")).toBe(false);
    expect(view).toContain("can_view_restricted_profile");
  });
});

describe("lot SC2 : champs sans effet retirés du formulaire", () => {
  it("taille de chien, races exigeantes, chats d'intérieur, règles strictes, composition du foyer", () => {
    const forms = [
      "src/components/profile/StepExperience.tsx",
      "src/components/profile/StepPreferences.tsx",
      "src/components/owner-profile/OwnerStepIdentity.tsx",
    ].map((f) => readFileSync(f, "utf8")).join("\n");
    for (const field of ["dog_sizes_accepted", "demanding_breeds_ok", "indoor_cats_only", "strict_rules_ok", "household_composition"]) {
      expect(forms.includes(`onChange({ ${field}`), field).toBe(false);
    }
  });

  it("fumeur et visites restent posés", () => {
    expect(readFileSync("src/components/profile/StepSitterProfile.tsx", "utf8")).toContain("smoker");
    expect(readFileSync("src/components/profile/StepPreferences.tsx", "utf8")).toContain("prefer_visitors");
  });
});

describe("lot SC2 : gardes réalisées sur la fiche", () => {
  it("libellés lisibles", () => {
    expect(guardExperienceLabel("Première fois")).toBe("Première garde à venir");
    expect(guardExperienceLabel("1-5 gardes")).toBe("De 1 à 5 gardes");
    expect(guardExperienceLabel("5-20 gardes")).toBe("De 5 à 20 gardes");
    expect(guardExperienceLabel("20+ gardes")).toBe("Plus de 20 gardes");
    expect(guardExperienceLabel("")).toBe("");
    expect(guardExperienceLabel(null)).toBe("");
  });

  it("la fiche lit la colonne à part, sans risquer la lecture principale", () => {
    const fiche = readFileSync("src/pages/PublicSitterProfile.tsx", "utf8");
    expect(fiche).toContain('select("guard_experience")');
    const cols = /const PUBLIC_SITTER_COLS =\s*"([^"]+)"/.exec(fiche)?.[1] ?? "";
    expect(cols.includes("guard_experience")).toBe(false);
  });
});
