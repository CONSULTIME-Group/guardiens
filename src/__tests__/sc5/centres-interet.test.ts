import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  SENSITIVITIES_OPTIONS,
  SENSITIVITY_LABELS,
  PRESENCE_EXPECTED_OPTIONS,
  presenceExpectedLabel,
  OTHER_PASSIONS_MAX,
  OTHER_PASSION_MAX_LENGTH,
} from "@/lib/profileMatchingOptions";
import { ARRIVAL_PRESENCE_OPTIONS } from "@/lib/arrival";
import { cleanPassion, passionRefusal } from "@/components/profile/OtherPassionsField";
import { passionsOf } from "@/lib/sitterProfileFacts";
import {
  OUTDOOR_SPORT_INTERESTS,
  RURAL_INTERESTS,
  SENSITIVITY_EXPLANATION,
} from "../../../supabase/functions/_shared/affinity/vocab.ts";

/** Lot SC5 (10/11/2026) : centres d'intérêt, autre passion, limites, présence, langues. */

const NEW_INTERESTS = ["Jeux de société", "Potager", "Nature et oiseaux", "Pêche", "Équitation", "Couture et tricot", "Danse", "Escalade"];

describe("lot SC5 : listes", () => {
  it("huit centres d'intérêt de plus, à la suite, sans doublon", () => {
    expect(INTEREST_OPTIONS).toHaveLength(25);
    expect(INTEREST_OPTIONS.slice(-8)).toEqual(NEW_INTERESTS);
    expect(new Set(INTEREST_OPTIONS).size).toBe(INTEREST_OPTIONS.length);
  });

  it("les nouveaux centres d'intérêt tournés vers le dehors servent l'ambiance", () => {
    expect(OUTDOOR_SPORT_INTERESTS).toContain("Escalade");
    for (const i of ["Potager", "Nature et oiseaux", "Pêche", "Équitation"]) expect(RURAL_INTERESTS).toContain(i);
  });

  it("« Autre » quitte les langues proposées", () => {
    expect(LANGUAGE_OPTIONS).not.toContain("Autre");
  });
});

describe("lot SC5 : Je préfère éviter", () => {
  it("chaque limite a un libellé affirmatif, valeurs enregistrées inchangées", () => {
    for (const v of SENSITIVITIES_OPTIONS) {
      expect(SENSITIVITY_LABELS[v], v).toBeTruthy();
      expect(SENSITIVITY_LABELS[v].startsWith("Pas "), v).toBe(false);
    }
    expect(SENSITIVITIES_OPTIONS).toContain("Pas de reptiles");
  });

  it("la phrase lue par le propriétaire est affirmative", () => {
    for (const phrase of Object.values(SENSITIVITY_EXPLANATION)) {
      expect(phrase.startsWith("Préfère éviter"), phrase).toBe(true);
    }
  });

  it("le formulaire titre « Je préfère éviter » et passe les libellés", () => {
    const src = readFileSync("src/components/profile/StepPreferences.tsx", "utf8");
    expect(src).toContain("Je préfère éviter");
    expect(src).toContain("labels={SENSITIVITY_LABELS}");
  });
});

describe("lot SC5 : présence attendue", () => {
  it("un libellé par valeur, repris par l'arrivée", () => {
    for (const v of PRESENCE_EXPECTED_OPTIONS) expect(presenceExpectedLabel(v)).not.toBe(v);
    expect(ARRIVAL_PRESENCE_OPTIONS.map((o) => o.label)).toEqual(PRESENCE_EXPECTED_OPTIONS.map(presenceExpectedLabel));
    expect(presenceExpectedLabel("")).toBe("");
    expect(presenceExpectedLabel("Valeur ancienne")).toBe("Valeur ancienne");
  });
});

describe("lot SC5 : une autre passion", () => {
  it("texte nettoyé et borné à 30 caractères", () => {
    expect(cleanPassion("  Pétanque   du  dimanche ")).toBe("Pétanque du dimanche");
    expect(cleanPassion("x".repeat(50))).toHaveLength(OTHER_PASSION_MAX_LENGTH);
  });

  it("refus avant tout appel : vide, plein, doublon, coordonnées", () => {
    expect(passionRefusal("", [])).toBeTruthy();
    expect(passionRefusal("Astronomie", ["Pétanque", "Céramique"])).toBe("Deux passions, c'est complet.");
    expect(passionRefusal("pétanque", ["Pétanque"])).toBeTruthy();
    expect(passionRefusal("06 12 34 56 78", [])).toBeTruthy();
    expect(passionRefusal("Astronomie", ["Pétanque"])).toBeNull();
    expect(OTHER_PASSIONS_MAX).toBe(2);
  });

  it("lecture tolérante : colonne absente ou valeur inattendue = rien", () => {
    expect(passionsOf(null)).toEqual([]);
    expect(passionsOf({})).toEqual([]);
    expect(passionsOf({ other_passions: ["Pétanque", "", 3, "Céramique", "Danse"] })).toEqual(["Pétanque", "Céramique"]);
  });

  it("la fiche lit les passions à part, la migration borne et expose la colonne", () => {
    const fiche = readFileSync("src/pages/PublicSitterProfile.tsx", "utf8");
    expect(fiche).toContain('from("public_sitter_profiles").select("other_passions")');
    expect(fiche).toContain('from("public_owner_profiles").select("other_passions")');
    const sql = readFileSync("drizzle/migrations/0134_sc5_autres_passions.sql", "utf8");
    expect(sql).toContain("cardinality(p) <= 2");
    expect(sql).toContain("BETWEEN 1 AND 30");
    expect(sql).toMatch(/s\.guard_experience,\s*s\.other_passions\s*FROM sitter_profiles/);
    expect(sql).toMatch(/o\.created_at,\s*o\.other_passions\s*FROM owner_profiles/);
  });

  it("le calcul d'affinité ne lit pas les autres passions", () => {
    const score = readFileSync("supabase/functions/_shared/affinity/score.ts", "utf8");
    expect(score).not.toContain("other_passions");
  });
});
