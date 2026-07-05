import { describe, it, expect } from "vitest";
import { validateRefreshedContent, FORBIDDEN_PATTERNS } from "@/lib/refreshArticleValidator";
import { STRATEGIC_PILLARS, isStrategicPillar } from "@/config/articles-post-pivot";
import { STRATEGIC_PILLARS as DENO_PILLARS } from "../../supabase/functions/refresh-articles-post-pivot/pillars";
import { FORBIDDEN_PATTERNS as DENO_PATTERNS } from "../../supabase/functions/refresh-articles-post-pivot/validator";

describe("refreshArticleValidator", () => {
  it("rejette les patterns proscrits", () => {
    const samples = [
      "Nos tarifs 6,99 €/mois arrivent le 1er octobre 2026.",
      "L'offre est valable jusqu'au 30 septembre 2026.",
      "Cet outil est gratuit à vie.",
      "Testez gratuitement pendant 7 jours.",
      "Contactez votre voisin de confiance.",
      "Un séjour — magique — vous attend.",
      "Le prix passe à 65 €/an.",
      "Profitez d'une période gratuite exceptionnelle.",
    ];
    for (const s of samples) {
      const r = validateRefreshedContent(s);
      expect(r.ok, `Devrait rejeter: ${s}`).toBe(false);
      expect(r.violations.length).toBeGreaterThan(0);
    }
  });

  it("rejette les nouveaux patterns renforcés (à 0 €, profitez de la gratuité, 10 € oneshot)", () => {
    const NBSP = "\u00A0";
    const critical = [
      "L'inscription est à 0 €.",
      `Compte à 0${NBSP}€ pour les propriétaires.`,
      "à 0€ pour tous",
      "Profitez de la gratuité jusqu'à la fin.",
      "Formule à 10 € pour un mois.",
      "10 € oneshot disponible.",
    ];
    for (const s of critical) {
      const r = validateRefreshedContent(s);
      expect(r.ok, `Devrait rejeter: ${s}`).toBe(false);
    }
  });

  it("accepte un contenu conforme", () => {
    const clean = `# Titre\n\nGuardiens est gratuit aujourd'hui, sans engagement. Vous serez prévenu à l'avance quand cela changera.\n\nUn gardien de confiance prend soin de vos animaux.`;
    const r = validateRefreshedContent(clean);
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it("détecte au moins 14 patterns configurés (renforcement post-pivot)", () => {
    expect(FORBIDDEN_PATTERNS.length).toBeGreaterThanOrEqual(14);
  });
});

describe("STRATEGIC_PILLARS cohérence frontend / Deno", () => {
  it("les deux listes contiennent exactement les mêmes slugs", () => {
    expect([...STRATEGIC_PILLARS].sort()).toEqual([...DENO_PILLARS].sort());
  });

  it("les patterns du validateur sont identiques", () => {
    expect(FORBIDDEN_PATTERNS.length).toEqual(DENO_PATTERNS.length);
    for (let i = 0; i < FORBIDDEN_PATTERNS.length; i++) {
      expect(FORBIDDEN_PATTERNS[i].label).toEqual(DENO_PATTERNS[i].label);
      expect(FORBIDDEN_PATTERNS[i].pattern.source).toEqual(DENO_PATTERNS[i].pattern.source);
    }
  });

  it("isStrategicPillar reconnaît les 4 piliers connus", () => {
    expect(isStrategicPillar("nouveaux-tarifs-2026")).toBe(true);
    expect(isStrategicPillar("premiers-pas-sur-guardiens")).toBe(true);
    expect(isStrategicPillar("house-sitting-annecy")).toBe(false);
  });
});
