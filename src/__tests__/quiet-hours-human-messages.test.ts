import { describe, it, expect } from "vitest";
import { decideDeferral } from "../../supabase/functions/_shared/email-cap";

/**
 * Heures calmes, regle du 07/08/2026 : elles ne s'appliquent plus aux messages
 * humains ni a la categorie transactionnelle, elles restent en place pour
 * product, digest et alert.
 */
const at23h = new Date("2026-08-07T21:00:00Z"); // 23h00 Paris (UTC+2)

const base = {
  now: at23h,
  hourSentAt: [],
  daySentAt: [],
};

describe("heures calmes et messages humains", () => {
  it("envoie immediatement un nouveau message a 23h00", () => {
    expect(decideDeferral({ ...base, templateName: "new-message", category: "transactional" }))
      .toEqual({ action: "send" });
  });

  it("envoie immediatement une nouvelle candidature a 23h00", () => {
    expect(decideDeferral({ ...base, templateName: "new-application", category: "transactional" }))
      .toEqual({ action: "send" });
  });

  it("envoie immediatement un rappel de message non lu a 23h00", () => {
    expect(decideDeferral({
      ...base,
      templateName: "unread-messages-reminder",
      category: "transactional",
    })).toEqual({ action: "send" });
  });

  it("reporte au matin un email de conseils envoye a 23h00", () => {
    const decision = decideDeferral({
      ...base,
      templateName: "conseils-publication-annonce",
      category: "product",
    });
    expect(decision.action).toBe("defer");
    if (decision.action !== "defer") return;
    expect(decision.reason).toBe("quiet_hours");
    const parisHour = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      hour12: false,
    }).format(decision.scheduledFor);
    expect(parseInt(parisHour, 10)).toBe(8);
  });

  it("reporte au matin un digest envoye a 23h00", () => {
    const decision = decideDeferral({
      ...base,
      templateName: "sitter-daily-digest",
      category: "digest",
    });
    expect(decision.action).toBe("defer");
    if (decision.action !== "defer") return;
    expect(decision.reason).toBe("quiet_hours");
  });

  it("reporte au matin une alerte envoyee a 23h00", () => {
    const decision = decideDeferral({
      ...base,
      templateName: "alert-digest",
      category: "alert",
    });
    expect(decision.action).toBe("defer");
    if (decision.action !== "defer") return;
    expect(decision.reason).toBe("quiet_hours");
  });
});
