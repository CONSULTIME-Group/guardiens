import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ASSOCIATION_NEEDS_VALUES,
  ASSOCIATION_THEMES,
  ASSOCIATION_TYPE_VALUES,
  associationNeedChipLabel,
  associationNeedCtaLabel,
  associationThemeRank,
  associationTypeLabel,
  isAnimalAssociationType,
} from "@/lib/associationLabels";
import { ASSOCIATIONS_FAQ } from "@/lib/associationFaq";

const migration = readFileSync("drizzle/migrations/0166_asso4_nouveaux_themes.sql", "utf8");

describe("ASSO-4 : thèmes et nouveaux types", () => {
  it("chaque type appartient à un seul thème, les animaux en premier", () => {
    const all = ASSOCIATION_THEMES.flatMap((t) => t.types as readonly string[]);
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...ASSOCIATION_TYPE_VALUES].sort());
    expect(ASSOCIATION_THEMES[0].key).toBe("animaux");
    expect(associationThemeRank("refuge")).toBe(0);
    expect(associationThemeRank("randonnee")).toBe(3);
    expect(isAnimalAssociationType("sanctuaire")).toBe(true);
    expect(isAnimalAssociationType("solidarite")).toBe(false);
  });

  it("chaque type porte un libellé propre, sans repli sur « Association »", () => {
    for (const t of ASSOCIATION_TYPE_VALUES.filter((v) => v !== "autre")) {
      expect(associationTypeLabel(t)).not.toBe("Association");
    }
  });

  it("la migration autorise exactement les types et besoins du code", () => {
    for (const t of ASSOCIATION_TYPE_VALUES) expect(migration).toContain(`'${t}'`);
    for (const n of ASSOCIATION_NEEDS_VALUES) expect(migration).toContain(`'${n}'`);
  });

  it("le besoin « participants » a sa puce et son bouton", () => {
    expect(associationNeedChipLabel("participants")).not.toBe("");
    expect(associationNeedCtaLabel("participants")).toBe("Rejoindre une sortie");
  });

  it("la FAQ de la page couvre les thèmes hors animaux, sans tiret cadratin", () => {
    const text = ASSOCIATIONS_FAQ.map((f) => `${f.question} ${f.answer}`).join(" ");
    expect(text).toMatch(/chantiers participatifs/);
    expect(text).not.toMatch(/[—–]/);
  });
});
