/**
 * Lot NUR1, bloc A (08/11/2026) : réparations du nurturing.
 * Récapitulatif « annonces près de chez vous » paginé, à l'abri de la limite
 * de débit, réservation rendue ; récapitulatif d'alerte à l'abri de la même
 * limite ; textes faux corrigés.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetchAllPreferenceRows, PREFERENCE_PAGE_SIZE } from "../../../supabase/functions/send-nearby-daily-digest/preferences.ts";
import { NEARBY_DAILY_DIGEST_TARGET_PARIS_HOURS, parisWindowVerdictForHours } from "../../../supabase/functions/_shared/paris-hour.ts";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const T = "supabase/functions/_shared/transactional-email-templates/";

describe("préférences lues en entier", () => {
  it("1 754 inscrits : deux pages, aucun membre oublié", async () => {
    const all = Array.from({ length: 1754 }, (_, i) => ({ user_id: `u${i}` }));
    const calls: Array<[number, number]> = [];
    const rows = await fetchAllPreferenceRows(async (from, to) => {
      calls.push([from, to]);
      return { data: all.slice(from, to + 1), error: null };
    });
    expect(rows).toHaveLength(1754);
    expect(calls).toEqual([[0, PREFERENCE_PAGE_SIZE - 1], [1000, 1999]]);
  });
  it("une erreur de lecture arrête le passage", async () => {
    await expect(fetchAllPreferenceRows(async () => ({ data: null, error: new Error("x") }))).rejects.toThrow("x");
  });
});

describe("passages de reprise", () => {
  it("9 h à 12 h à Paris, hors plage calme", () => {
    expect([...NEARBY_DAILY_DIGEST_TARGET_PARIS_HOURS]).toEqual([9, 10, 11, 12]);
    // 08/11/2026 10 h 05 UTC = 11 h 05 à Paris
    expect(parisWindowVerdictForHours(new Date("2026-11-08T10:05:00Z"), NEARBY_DAILY_DIGEST_TARGET_PARIS_HOURS).run).toBe(true);
    expect(parisWindowVerdictForHours(new Date("2026-11-08T13:05:00Z"), NEARBY_DAILY_DIGEST_TARGET_PARIS_HOURS).run).toBe(false);
  });
});

describe("send-nearby-daily-digest", () => {
  const src = read("supabase/functions/send-nearby-daily-digest/index.ts");
  it("lit les préférences par pages et cherche chaque membre dans une table", () => {
    expect(src).toContain("fetchAllPreferenceRows(");
    expect(src).toContain(".range(from, to)");
    expect(src).toContain("prefByUser.get(p.id)");
    expect(src).not.toContain("(prefs ?? []).find(");
  });
  it("passages 9 h à 12 h, budget du passage", () => {
    expect(src).toContain("parisWindowVerdictForHours(new Date(), NEARBY_DAILY_DIGEST_TARGET_PARIS_HOURS)");
    expect(src).toContain("OUTBOUND_RUN_BUDGET_MS");
    expect(src).toContain("budget_reached: budgetReached");
  });
  it("envois espacés, limite de débit attendue puis passage arrêté, réservation rendue", () => {
    expect(src).toContain("sendWithinRateLimit(");
    expect(src).toMatch(/outcome\.kind === 'rate_limited'[\s\S]{0,200}releaseSitNotification\(supabase, p\.id, 'rate_limited'\)[\s\S]{0,80}break/);
  });
  it("une exception après la réservation la rend", () => {
    expect(src).toMatch(/catch \(loopErr\) \{[\s\S]{0,300}if \(claimHeld\) await releaseSitNotification/);
  });
});

describe("send-alert-digest", () => {
  const src = read("supabase/functions/send-alert-digest/index.ts");
  it("limite de débit : passage arrêté proprement, réservation rendue, plus d'échec global", () => {
    expect(src).toContain("sendWithinRateLimit(");
    expect(src).toMatch(/outcome\.kind === "rate_limited"[\s\S]{0,150}releaseSitNotification\(supabase, profile\.id, "rate_limited"\)[\s\S]{0,80}break/);
    expect(src).toContain("deferred_rate_limited: deferredRateLimited");
  });
});

describe("textes", () => {
  it("bienvenue propriétaire : aucune annonce dite en ligne, bouton vers le formulaire", () => {
    const s = read(T + "onboarding-j1.tsx");
    expect(s).not.toContain("votre première annonce est en ligne");
    expect(s).not.toContain("est prête à être publiée");
    expect(s).toContain("c'est tout ce qu'il faut pour publier votre première annonce");
    expect(s).toContain("${SITE_URL}/sits/create?${utm}");
    expect(s).not.toContain("intent=draft_from_prompt");
  });
  it("relance profil gardien : seuil réel, sans code postal", () => {
    const s = read(T + "relance-profil-incomplet.tsx");
    expect(s).not.toMatch(/60\s*(&nbsp;)?%/);
    expect(s).toContain("40&nbsp;%");
    expect(s).not.toContain("code postal");
    expect(s).toContain("/profile?section=identite");
  });
  it("aidant vers garde : lien du formulaire, tournure positive", () => {
    const s = read(T + "helper-to-guard.tsx");
    expect(s).not.toContain("/sits/nouveau");
    expect(s).toContain("encodeURIComponent('/sits/create?");
    expect(s).not.toContain("Aucune pression");
  });
  it("photo manquante : tournure positive, aucune promesse chiffrée", () => {
    const s = read(T + "nudge-missing-photo.tsx");
    expect(s).not.toContain("pas à une silhouette");
    expect(s).not.toContain("multiplie fortement");
  });
  it("aucun tiret cadratin ni demi-cadratin dans les fichiers touchés", () => {
    for (const f of ["onboarding-j1.tsx", "relance-profil-incomplet.tsx", "helper-to-guard.tsx", "nudge-missing-photo.tsx"]) {
      expect(read(T + f)).not.toMatch(/[–—]/);
    }
  });
});
