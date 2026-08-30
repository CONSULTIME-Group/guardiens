import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const fn = readFileSync("supabase/functions/send-mission-nudges/index.ts", "utf8");
const registry = readFileSync(
  "supabase/functions/_shared/transactional-email-templates/registry.ts",
  "utf8",
);
const closeTpl = readFileSync(
  "supabase/functions/_shared/transactional-email-templates/mission-nudge-close.tsx",
  "utf8",
);
const helperTpl = readFileSync(
  "supabase/functions/_shared/transactional-email-templates/mission-nudge-feedback-helper.tsx",
  "utf8",
);

describe("relances de fin de parcours entraide", () => {
  it("expose les deux nouveaux types de relance", () => {
    expect(fn).toContain("body.kind === 'close_reminder'");
    expect(fn).toContain("body.kind === 'feedback_helper'");
  });

  it("l'invitation à clôturer ne vise que les publications en cours dont la date est passée", () => {
    expect(fn).toContain("'in_progress'");
    expect(fn).toContain("out_of_window");
  });

  it("le retour de l'aidant n'est envoyé qu'à un aidant retenu sans retour existant", () => {
    expect(fn).toContain("no_accepted_helper");
    expect(fn).toContain("feedback_already_left");
  });

  it("l'envoi générique garde les garde-fous d'anti-renvoi", () => {
    expect(fn).toContain("in('status', ['sent', 'pending', 'deferred'])");
    expect(fn).toContain("suppressed_emails");
    expect(fn).toContain("product_emails");
  });

  it("les gabarits sont enregistrés", () => {
    expect(registry).toContain("'mission-nudge-close': missionNudgeClose");
    expect(registry).toContain("'mission-nudge-feedback-helper': missionNudgeFeedbackHelper");
  });

  it("les gabarits ne parlent jamais d'argent", () => {
    const money = /(euro|€|tarif|prix|paiement|rémunér|gratuit)/i;
    expect(money.test(closeTpl)).toBe(false);
    expect(money.test(helperTpl)).toBe(false);
  });
});
