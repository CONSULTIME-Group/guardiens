import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  digestOpportunity,
  missingOpportunitySentence,
  type MissingOpportunityKey,
} from "@/lib/missingOpportunities";
import {
  matchesNeedKeyword,
  normalizeFreeText,
  SPECIAL_NEED_SIGNALS,
} from "../../../supabase/functions/_shared/affinity/vocab.ts";

/** Lot SC6 (10/11/2026) : relances lues par l'email, compteur véhicule, mot-clé « propre ». */

const stats = (items: { key: MissingOpportunityKey; concerned: number; answered: boolean }[], total = 23) => ({
  total_sits: total,
  items,
});

describe("lot SC6 : un manque dans le récapitulatif quotidien", () => {
  it("prend le manque qui concerne le plus d'annonces, avec son lien et son libellé", () => {
    const o = digestOpportunity(
      stats([
        { key: "languages", concerned: 12, answered: false },
        { key: "vehicle", concerned: 8, answered: false },
        { key: "species", concerned: 20, answered: true },
      ]),
    );
    expect(o).toEqual({
      key: "languages",
      sentence: "12 des 23 annonces en ligne mentionnent des langues parlées. Vos langues les aident à vous situer.",
      href: "/profile?section=profil",
      ctaLabel: "Ajouter mes langues",
    });
  });

  it("à égalité, le véhicule passe devant ; le lien ouvre la question des trajets", () => {
    const o = digestOpportunity(stats([
      { key: "pace", concerned: 8, answered: false },
      { key: "vehicle", concerned: 8, answered: false },
    ]));
    expect(o?.key).toBe("vehicle");
    expect(o?.href).toBe("/profile?section=profil&focus=trips");
    expect(o?.ctaLabel).toBe("Dire comment je me déplace");
  });

  it("rien quand tout est répondu, quand rien n'est concerné ou sans compteurs", () => {
    expect(digestOpportunity(stats([{ key: "vehicle", concerned: 8, answered: true }]))).toBeNull();
    expect(digestOpportunity(stats([{ key: "vehicle", concerned: 0, answered: false }]))).toBeNull();
    expect(digestOpportunity(null)).toBeNull();
  });

  it("chaque phrase est affirmative", () => {
    const keys: MissingOpportunityKey[] = ["radius", "vehicle", "species", "work", "sitter_type", "pace", "languages"];
    for (const k of keys) {
      const s = missingOpportunitySentence(k, 3, 10);
      expect(s, k).not.toMatch(/\bn'|\bne\b|\bpas\b|\bjamais\b|\baucun/);
      expect(s.endsWith("."), k).toBe(true);
    }
  });

  it("l'email lit la même RPC au-dessus du seuil et passe la phrase au gabarit", () => {
    const fn = readFileSync("supabase/functions/send-sitter-daily-digest/index.ts", "utf8");
    expect(fn).toContain("supabase.rpc('sitter_missing_opportunities', { _sitter_id: sitterId })");
    expect(fn).toContain("if (canApply) {");
    expect(fn).toContain("opportunitySentence,");
    const tpl = readFileSync("supabase/functions/_shared/transactional-email-templates/sitter-daily-digest.tsx", "utf8");
    expect(tpl).toContain("canApply !== false && opportunitySentence && opportunityHref");
    expect(tpl).toContain("buildProfileUrl(opportunityHref)");
  });
});

describe("lot SC6 : compteur véhicule", () => {
  it("une réponse = has_vehicle non nul, surcharge sans paramètre retirée", () => {
    const sql = readFileSync("drizzle/migrations/0135_sc6_compteur_vehicule.sql", "utf8");
    expect(sql).toContain("DROP FUNCTION IF EXISTS public.sitter_missing_opportunities();");
    expect(sql).toContain("'answered', (v_sp.has_vehicle IS NOT NULL),");
    expect(sql).not.toContain("v_sp.has_license IS NOT NULL");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.sitter_missing_opportunities(uuid) TO authenticated, service_role;");
  });
});

describe("lot SC6 : propreté", () => {
  const skill = SPECIAL_NEED_SIGNALS.find((s) => s.skill === "Chiot / chaton non propre")!;
  const hit = (text: string) => skill.keywords.some((k) => matchesNeedKeyword(normalizeFreeText(text), k));

  it("une litière propre ne demande aucune compétence", () => {
    expect(hit("Qu'elle ait de l'eau fraîche, une litière propre et un endroit confortable")).toBe(false);
    expect(hit("toujours de l'eau fraîche, de litières propres")).toBe(false);
  });

  it("un animal à rendre propre la demande", () => {
    expect(hit("Il n'est pas encore propre la nuit")).toBe(true);
    expect(hit("chaton non propre")).toBe(true);
    expect(hit("apprentissage de la propreté en cours")).toBe(true);
    expect(hit("un chiot de 3 mois")).toBe(true);
  });
});
