/**
 * Lot J2c : un texte retenu par l'outil automatisé (annonce, message,
 * candidature, proposition, besoin, présentation) affiche à l'écran la
 * vérification automatique, la règle en cause en une phrase et la façon de
 * demander un examen humain (CGU 14.4 et 14.5).
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import {
  automatedRetentionNotice,
  describeRetainedText,
  HUMAN_REVIEW_SENTENCE,
  type RetainedTextKind,
} from "@/lib/moderation";
import { describeFieldRefusal } from "@/lib/sitFieldModeration";
import { AUTOMATED_RULE_FALLBACK, AUTOMATED_RULE_STATEMENTS } from "../../../supabase/functions/_shared/moderation-rules";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const KINDS: RetainedTextKind[] = ["sit", "message", "application", "mission_response", "mission", "bio"];

describe("J2c, message à l'écran d'un texte retenu", () => {
  it("phrase d'examen humain exacte", () => {
    expect(HUMAN_REVIEW_SENTENCE).toBe("Pour demander un examen par une personne de l'équipe, écrivez à contact@guardiens.fr.");
  });

  it.each(KINDS)("%s : vérification automatique, constat, règle, examen humain", (kind) => {
    const t = describeRetainedText(kind, { status: "block", reasons: ["Proposition de paiement direct"], rule: "payment" });
    expect(t).toMatch(/vérification automatique/);
    expect(t).toContain("Constat : Proposition de paiement direct.");
    expect(t).toContain(`Règle en cause : ${AUTOMATED_RULE_STATEMENTS.payment}`);
    expect(t).toContain(HUMAN_REVIEW_SENTENCE);
    expect(t).not.toMatch(/[–—]/);
  });

  it("règle absente (ancienne fonction déployée) : phrase de l'article 14.4", () => {
    const t = describeRetainedText("message", { status: "block", reasons: [] });
    expect(t).toContain(AUTOMATED_RULE_FALLBACK);
    expect(t).toContain(HUMAN_REVIEW_SENTENCE);
    expect(t).not.toContain("Constat");
  });

  it("annonce : un champ retenu dit la règle des coordonnées, une réserve garde ses motifs", () => {
    const blocked = describeFieldRefusal({ status: "block", reasons: ["Numéro de téléphone détecté"], rule: "contact_details" });
    expect(blocked).toContain("Ce passage de l'annonce est retenu par une vérification automatique");
    expect(blocked).toContain("Article 14.4 des CGU");
    expect(blocked).toContain(HUMAN_REVIEW_SENTENCE);
    expect(describeFieldRefusal({ status: "warning", reasons: ["Ton commercial"] })).toBe("Ton commercial");
  });

  it("besoin : garde d'enfants et argent citent leur article", () => {
    expect(automatedRetentionNotice("mission", { rule: "child_care", facts: "votre texte décrit une garde d'enfants" }))
      .toContain("Article 7.3 des CGU");
    expect(automatedRetentionNotice("mission", { rule: "payment" })).toContain("Articles 6.3 et 7.2 des CGU");
  });

  it("les écrans appelants affichent ce message, plus aucun « Message bloqué »", () => {
    const files = {
      "src/pages/Messages.tsx": 'describeRetainedText("message", verdict)',
      "src/components/sits/ApplicationModal.tsx": 'describeRetainedText("application", verdict)',
      "src/components/missions/MissionResponseModal.tsx": 'describeRetainedText("mission_response", verdict)',
      "src/lib/sitFieldModeration.ts": 'describeRetainedText("sit", verdict)',
    };
    for (const [f, needle] of Object.entries(files)) {
      const src = read(f);
      expect(src, f).toContain(needle);
      expect(src, f).not.toContain('"Message bloqué"');
    }
    const mission = read("src/pages/CreateSmallMission.tsx");
    expect(mission).toContain('automatedRetentionNotice("mission"');
    expect(mission).toContain("description: CHILD_CARE_RETENTION");
    expect(mission).toContain("description: MONEY_RETENTION");
  });

  it("moderate-content renvoie la règle d'un texte retenu", () => {
    const fn = read("supabase/functions/moderate-content/index.ts");
    expect(fn).toContain('const rule = status === "block"');
    expect(fn).toContain("JSON.stringify({ status, reasons: allReasons, suggestion, rule })");
  });
});
