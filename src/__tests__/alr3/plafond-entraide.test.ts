// Lot ALR3 (14/11/2026) : la demande d'entraide a son propre plafond.
// Audit du système d'alertes du 14/11/2026, constat A3 : 64 demandes sur 314
// livrées plus de 12 h après, parce qu'un récapitulatif de gardes du matin
// avait consommé le quota quotidien partagé de la catégorie « alert ».
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  decideDeferral,
  CAP_ALERT_PER_DAY,
  CAP_MUTUAL_AID_PER_DAY,
  CAP_MUTUAL_AID_PER_WEEK,
  MUTUAL_AID_ALERT_TEMPLATES,
} from "../../../supabase/functions/_shared/email-cap";

// 10 h à Paris, hors heures calmes.
const now = new Date("2026-11-14T09:00:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

describe("ALR3 · plafond propre à la demande d'entraide", () => {
  it("part même quand un récapitulatif a déjà pris le quota de la catégorie alert", () => {
    const decision = decideDeferral({
      now,
      templateName: "mission-help-needed",
      isUrgent: false,
      category: "alert",
      alertDaySentAt: Array.from({ length: CAP_ALERT_PER_DAY }, () => ago(2)),
      alertWeekSentAt: Array.from({ length: CAP_ALERT_PER_DAY }, () => ago(2)),
    } as Parameters<typeof decideDeferral>[0]);
    expect(decision.action).toBe("send");
  });

  it("reste reporté au-delà de son propre plafond quotidien", () => {
    const sent = Array.from({ length: CAP_MUTUAL_AID_PER_DAY }, (_, i) => ago(5 - i));
    const decision = decideDeferral({
      now,
      templateName: "mission-help-needed",
      isUrgent: false,
      category: "alert",
      mutualAidDaySentAt: sent,
      mutualAidWeekSentAt: sent,
    } as Parameters<typeof decideDeferral>[0]);
    expect(decision.action).toBe("defer");
  });

  it("garde les heures calmes", () => {
    const night = new Date("2026-11-14T23:00:00Z");
    const decision = decideDeferral({
      now: night,
      templateName: "mission-help-needed",
      isUrgent: false,
      category: "alert",
    } as Parameters<typeof decideDeferral>[0]);
    expect(decision.action).toBe("defer");
    if (decision.action === "defer") expect(decision.reason).toBe("quiet_hours");
  });

  it("le récapitulatif garde le plafond partagé, sans compter les demandes d'entraide", () => {
    const decision = decideDeferral({
      now,
      templateName: "sitter-daily-digest",
      isUrgent: false,
      category: "alert",
      mutualAidDaySentAt: [ago(1), ago(2)],
      mutualAidWeekSentAt: [ago(1), ago(2)],
    } as Parameters<typeof decideDeferral>[0]);
    expect(decision.action).toBe("send");
  });

  it("chiffres et gabarit déclarés", () => {
    expect(MUTUAL_AID_ALERT_TEMPLATES.has("mission-help-needed")).toBe(true);
    expect(CAP_MUTUAL_AID_PER_DAY).toBe(3);
    expect(CAP_MUTUAL_AID_PER_WEEK).toBe(10);
  });

  it("l'envoi retire la demande d'entraide du compteur partagé", () => {
    const src = readFileSync("supabase/functions/send-transactional-email/index.ts", "utf8");
    expect(src).toMatch(/!isMutualAid\(r\)/);
    expect(src).toMatch(/mutualAidDaySentAt: mutualAidDay/);
    expect(src).toMatch(/mutualAidWeekSentAt: mutualAidWeek/);
  });
});
