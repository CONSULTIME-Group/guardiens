// Anti-régression du 17/08/2026 : un email review-reminder sur deux n'est pas
// parti (réponse non-2xx avalée par un console.error, drapeau de traitement
// posé quand même, échec invisible et définitif).
//
// Ce test verrouille trois propriétés structurelles des crons de relance :
//   1. tout échec d'envoi est tracé (recordReviewSendFailure : email_send_log
//      'failed' + signal admin),
//   2. le drapeau de traitement n'est posé qu'après vérification que tous les
//      envois attendus ont été acceptés (rejeu automatique sinon),
//   3. l'invitation « répondez à cet email » du gabarit est adossée à un
//      reply_to réel côté send-transactional-email.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FN = join(process.cwd(), "supabase", "functions");

describe("relances d'avis : drapeau conditionnel et signal admin", () => {
  it("send-avis-j1 ne pose review_j1_sent que si tous les envois sont acceptés", () => {
    const src = readFileSync(join(FN, "send-avis-j1", "index.ts"), "utf8");
    expect(src).toContain("recordReviewSendFailure");
    const guardIdx = src.indexOf("if (allAccepted)");
    const flagIdx = src.indexOf("review_j1_sent: true");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(flagIdx).toBeGreaterThan(guardIdx);
  });

  it("send-avis-j5 ne pose review_j5_sent que si tous les envois sont acceptés", () => {
    const src = readFileSync(join(FN, "send-avis-j5", "index.ts"), "utf8");
    expect(src).toContain("recordReviewSendFailure");
    const guardIdx = src.indexOf("if (allAccepted)");
    const flagIdx = src.indexOf("review_j5_sent: true");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(flagIdx).toBeGreaterThan(guardIdx);
  });

  it("review-followup (j10/j20) ne pose le drapeau que si tous les envois sont acceptés", () => {
    const src = readFileSync(join(FN, "_shared", "review-followup.ts"), "utf8");
    expect(src).toContain("recordReviewSendFailure");
    const guardIdx = src.indexOf("if (allAccepted)");
    const flagIdx = src.indexOf("[config.flagColumn]: true");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(flagIdx).toBeGreaterThan(guardIdx);
  });

  it("l'invitation à répondre de review-reminder est adossée à un reply_to réel", () => {
    const src = readFileSync(join(FN, "send-transactional-email", "index.ts"), "utf8");
    expect(src).toContain("templateName === 'review-reminder'");
    expect(src).toContain("resendPayload.reply_to = REPLY_TO_ADDRESS");
  });
});
