/**
 * Lot L2 élargi (08/11/2026, arène tableau de bord v2 et demande de Jérémie) :
 * Alma écrit autre chose d'une annonce à l'autre, et ne reprend que les faits
 * déclarés par le membre.
 * Recette : sur 10 profils de test, au moins 6 textes différents, et chaque
 * lieu, animal, date ou créneau cité figure dans les champs déclarés.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { proposeExpressTexts, expressVariantIndex, EXPRESS_VARIANT_COUNT } from "@/lib/sitExpress";
import { MIN_SUB_DESCRIPTION, MAX_TITLE_LENGTH } from "@/lib/sitPublishRules";
import {
  citedSlots,
  stripUndeclaredSlots,
  letterVariant,
  DECLARED_FACTS_RULE,
} from "../../../supabase/functions/_shared/alma-declared-facts.ts";

const DASH = /[–—]/;
const GENDER = /(chienne|chatte|\bil\b|\belle\b|\bprête\b|\bseule\b)/i;
const INVENTED = /(famille|parents|enfants|jura|annecy|golden|teckel|\blundi|\bmardi|\bmercredi|\bjeudi|\bvendredi|\bsamedi|\bdimanche|\d+\s?h\b)/i;

const PROFILES = [
  { seed: "a1f0c2d4-0001", period: "noel", pets: [{ name: "Caramel", species: "cat" }, { name: "Noisette", species: "cat" }], city: "Lyon" },
  { seed: "b2e1d3c5-0002", period: "noel", pets: [{ name: "Pompon", species: "dog" }], city: "Écully" },
  { seed: "c3d2e4b6-0003", period: "noel", pets: [], city: "Annecy" },
  { seed: "d4c3f5a7-0004", period: "hiver", pets: [{ name: "Figue", species: "dog" }, { name: "Olive", species: "cat" }], city: "Grenoble" },
  { seed: "e5b4a6f8-0005", period: "ete", pets: [{ name: "Biscotte", species: "dog" }], city: null },
  { seed: "f6a5b7e9-0006", period: "printemps", pets: [{ name: "", species: "horse" }], city: "Vialas" },
  { seed: "07f6c8da-0007", period: "plus_tard", pets: [{ name: "Mila", species: "dog" }, { name: "Rex", species: "cat" }, { name: "Nala", species: "rabbit" }], city: "Lyon" },
  { seed: "18e7d9cb-0008", period: "noel", pets: [{ name: "Tigrou", species: "cat" }], city: "Marseille" },
  { seed: "29d8eabc-0009", period: "hiver", pets: [], city: "Nantes" },
  { seed: "3ac9fbad-0010", period: "noel", pets: [{ name: "Saucisse", species: "dog" }], city: "Lyon" },
] as const;

describe("L2, textes proposés par le parcours express", () => {
  const texts = PROFILES.map((p) => proposeExpressTexts({ period: p.period, pets: [...p.pets], city: p.city, seed: p.seed }));

  it("au moins 6 textes différents sur 10 profils", () => {
    const shapes = new Set(
      texts.map((t, i) => {
        // On compare la forme, noms et commune retirés, pour mesurer la variété réelle.
        const p = PROFILES[i];
        let all = `${t.title}|${t.absenceReason}|${t.sitterExpectations}`;
        for (const pet of p.pets) if (pet.name) all = all.split(pet.name).join("X");
        if (p.city) all = all.split(p.city).join("V");
        return all;
      }),
    );
    expect(shapes.size).toBeGreaterThanOrEqual(6);
  });

  it("chaque animal et chaque lieu cité est déclaré, rien d'inventé", () => {
    texts.forEach((t, i) => {
      const p = PROFILES[i];
      const all = `${t.title} ${t.absenceReason} ${t.sitterExpectations}`;
      const withoutDeclared = p.city ? all.split(p.city).join("") : all;
      expect(withoutDeclared).not.toMatch(INVENTED);
      if (!p.city) expect(t.title).not.toContain(", à ");
      for (const v of [t.title, t.absenceReason, t.sitterExpectations]) {
        expect(v).not.toMatch(DASH);
        expect(v).not.toMatch(GENDER);
      }
      expect(t.absenceReason.length).toBeGreaterThanOrEqual(MIN_SUB_DESCRIPTION);
      expect(t.sitterExpectations.length).toBeGreaterThanOrEqual(MIN_SUB_DESCRIPTION);
      expect(t.title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    });
  });

  it("une même annonce garde son texte, sans graine la première formulation", () => {
    const p = PROFILES[0];
    const a = proposeExpressTexts({ period: p.period, pets: [...p.pets], city: p.city, seed: p.seed });
    const b = proposeExpressTexts({ period: p.period, pets: [...p.pets], city: p.city, seed: p.seed });
    expect(a).toEqual(b);
    expect(expressVariantIndex(null, 0)).toBe(0);
    const spread = new Set(Array.from({ length: 60 }, (_, i) => expressVariantIndex(`seed-${i}`, 1)));
    expect(spread.size).toBe(EXPRESS_VARIANT_COUNT);
  });
});

describe("L2, filet des faits déclarés", () => {
  it("relève jours et heures", () => {
    expect(citedSlots("Je suis libre jeudi dès 18 h, ou samedi à 9h30.").sort()).toEqual(["18h", "9h", "jeudi", "samedi"]);
    expect(citedSlots("Du 19 au 27 décembre.")).toEqual([]);
  });

  it("retire la phrase au créneau inventé, garde le reste", () => {
    const r = stripUndeclaredSlots("Bonjour Martine, Caramel a l'air adorable. Je suis libre jeudi dès 18 h pour un appel. Au plaisir de vous lire.", "{\"animaux\":[\"Caramel\"]}");
    expect(r.removed).toBe(1);
    expect(r.text).toBe("Bonjour Martine, Caramel a l'air adorable. Au plaisir de vous lire.");
  });

  it("garde un jour présent dans le contexte (jour des dates déclarées)", () => {
    const r = stripUndeclaredSlots("La garde commence le samedi 19 décembre.", "{\"date_debut\":\"2026-12-19\"} samedi");
    expect(r.removed).toBe(0);
  });

  it("accroches et clôtures variées", () => {
    const variants = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(letterVariant(`u-${i}:s`))));
    expect(variants.size).toBeGreaterThanOrEqual(6);
  });

  it("toutes les rédactions d'Alma au nom d'un membre portent la règle", () => {
    for (const f of ["draft-application-letter", "draft-conversation-opener", "draft-sit-from-prompt", "draft-review", "generate-bio-drafts", "adapt-sit-with-alma"]) {
      expect(readFileSync(`supabase/functions/${f}/index.ts`, "utf8")).toContain("${DECLARED_FACTS_RULE}");
    }
    expect(DECLARED_FACTS_RULE).toMatch(/jour, heure ou créneau/);
    const letter = readFileSync("supabase/functions/draft-application-letter/index.ts", "utf8");
    expect(letter).toContain("stripUndeclaredSlots(draft, contextText)");
    expect(readFileSync("supabase/functions/draft-conversation-opener/index.ts", "utf8")).toContain("stripUndeclaredSlots(draft, JSON.stringify(userPayload))");
  });

  it("le paragraphe des compagnons de voyage reste sans genre", () => {
    const modal = readFileSync("src/components/sits/ApplicationModal.tsx", "utf8");
    expect(modal).not.toContain("Je suis prête");
    expect(modal).toContain("J'en discuterai volontiers avec vous");
  });
});
