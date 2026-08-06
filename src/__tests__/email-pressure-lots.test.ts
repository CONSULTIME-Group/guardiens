import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  decideDeferral,
  CAP_NON_TX_PER_DAY,
  CAP_NON_TX_PER_WEEK,
  CAP_NEARBY_SIT_PER_DAY,
  CAP_NEARBY_SIT_PER_WEEK,
  NEARBY_SIT_MAX_DEFER_HOURS,
  TEMPLATE_TTL_HOURS,
  resolveDeferral,
} from "../../supabase/functions/_shared/email-cap";
import {
  ageWindow,
  isUnboundedRule,
  pickWinningJourney,
  sequencePriority,
} from "../../supabase/functions/_shared/nurturing-rules";

const FUNCTIONS_DIR = join(process.cwd(), "supabase", "functions");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

// Midi (heure de Paris) hors quiet hours
const NOON = new Date("2026-07-26T10:00:00Z");
// 01h00 Paris en ete, donc dans la plage des heures calmes (22h-08h).
const MIDNIGHT = new Date("2026-07-26T23:00:00Z");
const iso = (offsetMs: number) => new Date(NOON.getTime() + offsetMs).toISOString();

describe("Lot 1 — les appelants doivent passer logMetadata, jamais metadata", () => {
  it("aucun appel a send-transactional-email ne contient un champ metadata", () => {
    const offenders: string[] = [];
    for (const file of walk(FUNCTIONS_DIR)) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("send-transactional-email")) continue;
      // Pour chaque bloc de corps d'appel (repere par templateName), on inspecte
      // les ~40 lignes suivantes jusqu'a la fermeture du JSON.stringify.
      const lines = src.split("\n");
      lines.forEach((line, idx) => {
        if (!/^\s*templateName[:,]/.test(line)) return;
        for (let i = idx; i < Math.min(lines.length, idx + 40); i++) {
          if (/^\s*\}\),?\s*$/.test(lines[i]) && i > idx) break;
          if (/^\s*metadata:\s/.test(lines[i])) {
            offenders.push(`${file.replace(process.cwd(), "")}:${i + 1}`);
          }
        }
      });
    }
    expect(offenders, `Utiliser logMetadata: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("Lot 2 — bornes max_age_days", () => {
  const now = Date.UTC(2026, 6, 26);
  const days = (n: number) => new Date(now - n * 86400_000).toISOString();

  it("max_age_days borne la fenetre et ecrase window_days", () => {
    const w = ageWindow({ min_age_days: 7, max_age_days: 14, window_days: 365 }, now);
    expect(w.upperBound).toBe(days(7));
    expect(w.lowerBound).toBe(days(14));
  });

  it("sans max_age_days, la fenetre retombe sur window_days", () => {
    const w = ageWindow({ min_age_days: 7, window_days: 14 }, now);
    expect(w.lowerBound).toBe(days(21));
  });

  it("une regle sans borne superieure est detectee", () => {
    expect(isUnboundedRule({ min_age_days: 7 })).toBe(true);
    expect(isUnboundedRule({ min_age_days: 7, max_age_days: 14 })).toBe(false);
  });

  it("un profil historique de 2021 n'est jamais dans la fenetre bornee", () => {
    const w = ageWindow({ min_age_days: 7, max_age_days: 21 }, now);
    const historical = new Date("2021-03-01T00:00:00Z").toISOString();
    expect(historical < w.lowerBound).toBe(true);
  });
});

describe("Lot 6 — plafond par categorie", () => {
  it("transactionnel : 3 par 24h reste autorise", () => {
    const d = decideDeferral({
      now: NOON,
      templateName: "new-application",
      category: "transactional",
      hourSentAt: [],
      daySentAt: [iso(-7200_000), iso(-3600_001)],
    });
    expect(d.action).toBe("send");
  });

  it("transactionnel : aucun plafond de frequence, meme avec plusieurs envois dans l'heure", () => {
    const d = decideDeferral({
      now: NOON,
      templateName: "new-application",
      category: "transactional",
      hourSentAt: [iso(-600_000), iso(-300_000), iso(-60_000)],
      daySentAt: [iso(-7200_000), iso(-600_000), iso(-300_000), iso(-60_000)],
      nonTxDaySentAt: [iso(-7200_000)],
      nonTxWeekSentAt: [iso(-7200_000)],
    });
    expect(d).toMatchObject({ action: "send" });
  });

  it("transactionnel : reste differe pendant les heures calmes", () => {
    const d = decideDeferral({
      now: MIDNIGHT,
      templateName: "new-application",
      category: "transactional",
      hourSentAt: [],
      daySentAt: [],
    });
    expect(d).toMatchObject({ action: "defer", reason: "quiet_hours" });
  });


  it("product : 1 seul par 24h", () => {
    expect(CAP_NON_TX_PER_DAY).toBe(1);
    const d = decideDeferral({
      now: NOON,
      templateName: "owner-no-sit-j3",
      category: "product",
      hourSentAt: [],
      daySentAt: [iso(-7200_000)],
      nonTxDaySentAt: [iso(-7200_000)],
      nonTxWeekSentAt: [iso(-7200_000)],
    });
    expect(d).toMatchObject({ action: "defer", reason: "frequency_cap_category_day" });
  });

  it("digest : 3 par 7 jours maximum, cumul toutes categories non transactionnelles", () => {
    expect(CAP_NON_TX_PER_WEEK).toBe(3);
    const week = [iso(-5 * 86400_000), iso(-3 * 86400_000), iso(-2 * 86400_000)];
    const d = decideDeferral({
      now: NOON,
      templateName: "sitter-daily-digest",
      category: "digest",
      hourSentAt: [],
      daySentAt: [],
      nonTxDaySentAt: [],
      nonTxWeekSentAt: week,
    });
    expect(d).toMatchObject({ action: "defer", reason: "frequency_cap_category_week" });
  });

  it("alerte : premier envoi de la semaine passe", () => {
    const d = decideDeferral({
      now: NOON,
      templateName: "nearby-sit-alert",
      category: "alert",
      hourSentAt: [],
      daySentAt: [],
      nonTxDaySentAt: [],
      nonTxWeekSentAt: [],
    });
    expect(d.action).toBe("send");
  });

  it("les templates en derogation ignorent le plafond categorie", () => {
    const d = decideDeferral({
      now: NOON,
      templateName: "sit-confirmed",
      category: "transactional",
      hourSentAt: [iso(-60_000)],
      daySentAt: [iso(-60_000), iso(-70_000), iso(-80_000)],
      nonTxDaySentAt: [iso(-60_000)],
      nonTxWeekSentAt: [iso(-60_000)],
    });
    expect(d.action).toBe("send");
  });
});

describe("Lot 7 — un seul parcours actif par personne", () => {
  it("l'onboarding prime sur la reactivation", () => {
    expect(sequencePriority("onboarding-sitter")).toBeLessThan(sequencePriority("reactivation-d30"));
    expect(sequencePriority("onboarding-owner")).toBeLessThan(sequencePriority("discover-mutual-aid"));
  });

  it("pickWinningJourney garde le plus prioritaire et sort les autres", () => {
    const rows = [
      { id: "a", user_id: "u1", sequence_key: "reactivation-d30", created_at: "2026-07-01T00:00:00Z" },
      { id: "b", user_id: "u1", sequence_key: "onboarding-sitter", created_at: "2026-07-10T00:00:00Z" },
      { id: "c", user_id: "u1", sequence_key: "discover-mutual-aid", created_at: "2026-07-05T00:00:00Z" },
    ];
    const { keep, exit } = pickWinningJourney(rows);
    expect(keep?.id).toBe("b");
    expect(exit.map((e) => e.id).sort()).toEqual(["a", "c"]);
  });

  it("a priorite egale, le parcours le plus ancien gagne", () => {
    const { keep } = pickWinningJourney([
      { id: "new", user_id: "u", sequence_key: "complete-affinity-owner", created_at: "2026-07-20T00:00:00Z" },
      { id: "old", user_id: "u", sequence_key: "complete-affinity-sitter", created_at: "2026-07-01T00:00:00Z" },
    ]);
    expect(keep?.id).toBe("old");
  });
});

describe("Correctif 06/08/2026 — l'alerte de nouvelle annonce a son propre plafond", () => {
  it("un recapitulatif recu le matin n'empeche pas l'alerte de l'apres-midi", () => {
    const morning = new Date(NOON.getTime() - 5 * 3600_000).toISOString();
    const d = decideDeferral({
      now: NOON,
      templateName: "nearby-sit-alert",
      category: "alert",
      hourSentAt: [],
      daySentAt: [morning],
      alertDaySentAt: [morning],
      alertWeekSentAt: [morning],
      nearbySitDaySentAt: [],
      nearbySitWeekSentAt: [],
    });
    expect(d.action).toBe("send");
  });

  it("une alerte deja partie n'empeche pas le recapitulatif quotidien", () => {
    const earlier = new Date(NOON.getTime() - 3 * 3600_000).toISOString();
    const d = decideDeferral({
      now: NOON,
      templateName: "sitter-daily-digest",
      category: "alert",
      hourSentAt: [],
      daySentAt: [earlier],
      alertDaySentAt: [],
      alertWeekSentAt: [],
      nearbySitDaySentAt: [earlier],
      nearbySitWeekSentAt: [earlier],
    });
    expect(d.action).toBe("send");
  });

  it("plafonds propres : 3 par jour, 10 par semaine", () => {
    expect(CAP_NEARBY_SIT_PER_DAY).toBe(3);
    expect(CAP_NEARBY_SIT_PER_WEEK).toBe(10);
    const day = [iso(-3 * 3600_000), iso(-2 * 3600_000), iso(-3600_000)];
    const d = decideDeferral({
      now: NOON,
      templateName: "nearby-sit-alert",
      category: "alert",
      hourSentAt: [],
      daySentAt: [],
      nearbySitDaySentAt: day,
      nearbySitWeekSentAt: day,
    });
    expect(d).toMatchObject({ action: "defer", reason: "frequency_cap_category_day" });
  });

  it("aucun report de nearby-sit-alert ne depasse sa duree de vie", () => {
    expect(NEARBY_SIT_MAX_DEFER_HOURS).toBeLessThan(TEMPLATE_TTL_HOURS["nearby-sit-alert"]);
    const day = [iso(-3 * 3600_000), iso(-2 * 3600_000), iso(-3600_000)];
    const d = decideDeferral({
      now: NOON,
      templateName: "nearby-sit-alert",
      category: "alert",
      hourSentAt: [],
      daySentAt: [],
      nearbySitDaySentAt: day,
      nearbySitWeekSentAt: day,
    });
    if (d.action !== "defer") throw new Error("report attendu");
    // Jitter appelant de 900 s inclus.
    const withJitter = new Date(d.scheduledFor.getTime() + 900_000);
    const resolution = resolveDeferral({
      templateName: "nearby-sit-alert",
      reason: d.reason,
      scheduledFor: withJitter,
      firstEnqueuedAt: NOON,
    });
    expect(resolution.action).toBe("enqueue");
  });
});
