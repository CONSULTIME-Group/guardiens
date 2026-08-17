import { describe, it, expect } from "vitest";
import {
  DEFAULT_DEFERRED_TTL_HOURS,
  QUIET_HOURS_TTL_HOURS,
  getDeferralTtlHours,
  decideOverTtl,
  resolveDeferral,
  decideDeferral,
  CAP_ALERT_PER_DAY,
  CAP_ALERT_PER_WEEK,
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
      templateName: "review-received",
      reason: "frequency_cap_category_week",
      scheduledFor: h(24 * 7),
      firstEnqueuedAt: base,
    });
    expect(r.action).not.toBe("enqueue");
    expect(r.action).toBe("send_now");
  });
});

describe("Etape 2, categorie alerte et derogations", () => {
  const NOON2 = new Date("2026-07-26T10:00:00Z");
  const at = (ms: number) => new Date(NOON2.getTime() + ms).toISOString();

  it("une alerte ne consomme plus le quota produit", () => {
    const d = decideDeferral({
      now: NOON2,
      templateName: "sitter-daily-digest",
      category: "alert",
      hourSentAt: [],
      daySentAt: [],
      nonTxDaySentAt: [at(-7200_000)],
      nonTxWeekSentAt: [at(-7200_000), at(-3 * 86400_000), at(-5 * 86400_000)],
      alertDaySentAt: [],
      alertWeekSentAt: [],
    });
    expect(d.action).toBe("send");
  });

  it("plafond alerte : 1 par 24h", () => {
    expect(CAP_ALERT_PER_DAY).toBe(1);
    // Doctrine du 07/08/2026 : « nearby-sit-alert » compte sur ses compteurs
    // propres (NEARBY_SIT_ALERT_TEMPLATES, CAP_NEARBY_SIT_*) et ne passe plus
    // par le plafond générique de la catégorie 'alert'. Ce plafond s'exerce
    // donc via un autre gabarit de la catégorie, ici « alert-digest ».
    const d = decideDeferral({
      now: NOON2,
      templateName: "alert-digest",
      category: "alert",
      hourSentAt: [],
      daySentAt: [],
      alertDaySentAt: [at(-7200_000)],
      alertWeekSentAt: [at(-7200_000)],
    });
    expect(d).toMatchObject({ action: "defer", reason: "frequency_cap_category_day" });
  });

  it("plafond alerte : 7 par 7 jours, soit une par jour en regime nominal", () => {
    expect(CAP_ALERT_PER_WEEK).toBe(7);
    const week = Array.from({ length: 7 }, (_, i) => at(-(i + 1) * 86400_000)).reverse();
    const d = decideDeferral({
      now: NOON2,
      templateName: "alert-digest",
      category: "alert",
      hourSentAt: [],
      daySentAt: [],
      alertDaySentAt: [],
      alertWeekSentAt: week,
    });
    expect(d).toMatchObject({ action: "defer", reason: "frequency_cap_category_week" });
  });

  it("new-message passe malgre tous les plafonds", () => {
    const d = decideDeferral({
      now: NOON2,
      templateName: "new-message",
      category: "transactional",
      hourSentAt: [at(-60_000), at(-120_000)],
      daySentAt: [at(-60_000), at(-120_000)],
      nonTxDaySentAt: [at(-60_000)],
      nonTxWeekSentAt: [at(-60_000), at(-120_000), at(-180_000)],
    });
    expect(d.action).toBe("send");
  });

  it("new-message n'est jamais annule, meme au dela de la TTL heures calmes", () => {
    const r = resolveDeferral({
      templateName: "new-message",
      reason: "quiet_hours",
      scheduledFor: new Date("2026-07-28T06:00:00Z"),
      firstEnqueuedAt: new Date("2026-07-26T20:00:00Z"),
    });
    expect(r.action).toBe("enqueue");
  });

  it("new-application n'est jamais annule non plus", () => {
    const r = resolveDeferral({
      templateName: "new-application",
      reason: "frequency_cap_category_week",
      scheduledFor: new Date("2026-08-05T06:00:00Z"),
      firstEnqueuedAt: new Date("2026-07-26T20:00:00Z"),
    });
    expect(r.action).toBe("enqueue");
  });
});
