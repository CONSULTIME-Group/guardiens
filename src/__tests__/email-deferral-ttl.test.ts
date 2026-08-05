import { describe, it, expect } from "vitest";
import {
  DEFAULT_DEFERRED_TTL_HOURS,
  QUIET_HOURS_TTL_HOURS,
  getDeferralTtlHours,
  decideOverTtl,
  resolveDeferral,
} from "../../supabase/functions/_shared/email-cap";

const base = new Date("2026-08-05T09:00:00Z");
const h = (n: number) => new Date(base.getTime() + n * 3600_000);

describe("TTL de report par gabarit et par motif (etape 1)", () => {
  it("applique la TTL par defaut a un gabarit non liste", () => {
    expect(getDeferralTtlHours("relance-profil-incomplet")).toBe(
      DEFAULT_DEFERRED_TTL_HOURS,
    );
  });

  it("raccourcit la TTL des contenus dates", () => {
    expect(getDeferralTtlHours("sitter-daily-digest")).toBe(20);
    expect(getDeferralTtlHours("alert-digest")).toBe(20);
  });

  it("allonge la TTL des notifications declenchees par un membre", () => {
    expect(getDeferralTtlHours("new-message")).toBe(48);
    expect(getDeferralTtlHours("new-application")).toBe(48);
  });

  it("plafonne la TTL a 12 h pour le motif heures calmes", () => {
    expect(getDeferralTtlHours("new-message", "quiet_hours")).toBe(
      QUIET_HOURS_TTL_HOURS,
    );
    expect(getDeferralTtlHours("sitter-daily-digest", "quiet_hours")).toBe(12);
  });
});

describe("Arbitrage au dela de la TTL", () => {
  it("annule un contenu date", () => {
    expect(
      decideOverTtl({
        templateName: "sitter-daily-digest",
        reason: "frequency_cap_category_week",
      }),
    ).toBe("cancel");
  });

  it("envoie tout de suite une notification legitime", () => {
    expect(
      decideOverTtl({
        templateName: "new-message",
        reason: "frequency_cap_category_week",
      }),
    ).toBe("send_now");
  });

  it("annule plutot que de reveiller quelqu un en heures calmes", () => {
    expect(
      decideOverTtl({ templateName: "new-message", reason: "quiet_hours" }),
    ).toBe("cancel");
  });
});

describe("resolveDeferral, aucun report au dela de la TTL n est enfile", () => {
  it("enfile un report qui tient dans la TTL", () => {
    const r = resolveDeferral({
      templateName: "relance-profil-incomplet",
      reason: "frequency_cap_category_day",
      scheduledFor: h(25),
      firstEnqueuedAt: base,
    });
    expect(r.action).toBe("enqueue");
  });

  it("n enfile pas un report hebdomadaire a J+7, il tranche", () => {
    const r = resolveDeferral({
      templateName: "relance-profil-incomplet",
      reason: "frequency_cap_category_week",
      scheduledFor: h(24 * 7),
      firstEnqueuedAt: base,
    });
    expect(r.action).toBe("send_now");
  });

  it("annule un digest reporte a J+7", () => {
    const r = resolveDeferral({
      templateName: "sitter-daily-digest",
      reason: "frequency_cap_category_week",
      scheduledFor: h(24 * 7),
      firstEnqueuedAt: base,
    });
    expect(r.action).toBe("cancel");
  });

  it("le cas historique 36 h contre J+7 ne produit plus d abandon arithmetique", () => {
    const r = resolveDeferral({
      templateName: "new-message",
      reason: "frequency_cap_category_week",
      scheduledFor: h(24 * 7),
      firstEnqueuedAt: base,
    });
    expect(r.action).not.toBe("enqueue");
    expect(r.action).toBe("send_now");
  });
});
