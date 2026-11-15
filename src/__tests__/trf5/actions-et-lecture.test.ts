import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  articleAgeDays, campaignSlug, clicksBeforeAfter, nextReview, pathCovers, publicationShortLink,
  recentActionsByPath, reviewDate, type SeoLogEntry,
} from "@/lib/admin/seoActionLog";
import { buildBrakes } from "@/lib/admin/signupBrakes";
import { trafficPeriodDays, trafficPeriodFromParam, trafficPeriodPhrase } from "@/lib/admin/trafficPeriod";
import { funnelPhrase, leadsPhrase, seoPhrase } from "@/lib/admin/trafficSynthesis";

const entry = (over: Partial<SeoLogEntry>): SeoLogEntry => ({
  id: "1", created_at: "2026-11-15T20:35:00Z", kind: "titre_description", path: "/actualites/a", note: null, before: null, after: null, ...over,
});
const now = new Date("2026-11-16T10:00:00Z");

describe("TRF-5, journal des actions SEO", () => {
  it("relit une action quatre semaines plus tard", () => {
    expect(reviewDate("2026-11-15T20:35:00Z").toISOString().slice(0, 10)).toBe("2026-12-13");
    expect(nextReview([entry({})], now)?.toISOString().slice(0, 10)).toBe("2026-12-13");
  });
  it("garde la dernière action récente par page", () => {
    const log = [entry({ id: "old", created_at: "2026-09-01T00:00:00Z" }), entry({ id: "new", path: "/actualites/b" })];
    const recent = recentActionsByPath(log, 28, now);
    expect([...recent.keys()]).toEqual(["/actualites/b"]);
  });
  it("lit les clics avant et après, gabarit compris", () => {
    expect(pathCovers("/house-sitting/*", "/house-sitting/lyon")).toBe(true);
    expect(pathCovers("/house-sitting/*", "/house-sitting")).toBe(false);
    const points = [
      { period_end: "2026-11-13", key: "/house-sitting/lyon", clicks: 40, impressions: 900 },
      { period_end: "2026-11-13", key: "/house-sitting/annecy", clicks: 34, impressions: 500 },
      { period_end: "2026-12-14", key: "/house-sitting/lyon", clicks: 90, impressions: 1500 },
    ];
    const e = entry({ kind: "gabarit", path: "/house-sitting/*", created_at: "2026-11-15T21:21:00Z" });
    expect(clicksBeforeAfter(e, points)).toEqual({ before: 74, beforeAt: "2026-11-13", after: 90, afterAt: "2026-12-14" });
    expect(clicksBeforeAfter(e, points.slice(0, 2)).after).toBeNull();
  });
  it("mesure l'âge d'un article", () => {
    expect(articleAgeDays("2026-03-26T00:00:00Z", "2026-03-01T00:00:00Z", now)).toBeGreaterThan(200);
    expect(articleAgeDays(null, "2026-11-10T10:00:00Z", now)).toBe(6);
  });
  it("compose le lien court d'une publication", () => {
    expect(campaignSlug("Groupe Toulon 16/11 !")).toBe("groupe-toulon-16-11");
    expect(publicationShortLink("facebook", "Groupe Toulon 16/11")).toBe("https://guardiens.fr/fb?utm_campaign=groupe-toulon-16-11");
    expect(publicationShortLink("recherche_naturelle", "x")).toBeNull();
    expect(publicationShortLink("instagram", "  ")).toBeNull();
  });
});

describe("TRF-5, freins", () => {
  it("range les freins par volume et additionne les deux libellés d'un même blocage", () => {
    const brakes = buildBrakes({
      blocked: [{ reason: "terms_not_accepted", volume: 50 }, { reason: "terms_unchecked", volume: 7 }],
      failed: [{ code: "weak_password", volume: 27 }, { code: "rate_limited", volume: 11 }, { code: "autre", volume: 2 }],
      sitAbandons: 151,
    });
    expect(brakes.map((b) => [b.title, b.volume])).toEqual([
      ["Création d'annonce quittée à l'étape « L'essentiel »", 151],
      ["Conditions à cocher avant l'envoi", 57],
      ["Mot de passe refusé", 27],
      ["Second envoi dans la minute", 11],
      ["Échec à l'envoi (autre)", 2],
    ]);
  });
});

describe("TRF-6, période commune et synthèses", () => {
  it("lit la période dans l'adresse", () => {
    expect(trafficPeriodFromParam(null)).toBe("suivi");
    expect(trafficPeriodFromParam("30")).toBe(30);
    expect(trafficPeriodFromParam("12")).toBe("suivi");
    expect(trafficPeriodDays("suivi", new Date("2026-11-15T22:00:00Z"))).toBe(4);
    expect(trafficPeriodPhrase(30)).toBe("en 30 jours");
  });
  it("écrit les trois phrases", () => {
    const ch = (channel: string, label: string, signups: number) => ({ channel, label, campaign: null, isCampaign: false, visits: 0, signups, publishedMembers: 0, applicants: 0, helpers: 0, outingMembers: 0 });
    expect(leadsPhrase([ch("recherche_naturelle", "Recherche naturelle", 9), ch("facebook", "Facebook", 7), ch("inconnu", "Source non enregistrée", 3)], "en 7 jours"))
      .toBe("19 inscrits en 7 jours, 16 avec une source enregistrée. Recherche naturelle en amène 9, Facebook 7.");
    expect(funnelPhrase(210, 70, 30, "en 7 jours")).toBe("Sur 210 inscriptions démarrées en 7 jours, 70 comptes créés (33 %). 30 membres ont fait une première action.");
    expect(seoPhrase({ clicks: 482, previousClicks: 414, nonBrand: 475, period: "29 jours", treated: 2, nextReview: "13/12" }))
      .toBe("482 clics Google sur 29 jours (+16,4 %), 475 hors marque. 2 actions faites, prochaine relecture le 13/12.");
  });
  it("resserre l'onglet Entonnoir et déplace l'activation", () => {
    const traffic = readFileSync("src/pages/admin/AdminTraffic.tsx", "utf8");
    expect(traffic).toContain('data-testid="traffic-period"');
    expect(traffic).toContain("hideActivation");
    expect(traffic).toContain("<SignupBrakesCard days={days} />");
    const overview = readFileSync("src/pages/admin/AdminOverview.tsx", "utf8");
    expect(overview).toContain('data-testid="overview-activation"');
    expect(overview).toContain("<AppInstallCard />");
  });
  it("propose rediriger, sortir de l'index ou garder pour un article ancien", () => {
    const s = readFileSync("src/components/admin/seo/NoImpressionActionable.tsx", "utf8");
    for (const t of ["Rediriger", "Sortir de l'index", "Garder", "window.confirm"]) expect(s).toContain(t);
    expect(readFileSync("src/components/admin/seo/PriorityActions.tsx", "utf8")).toContain("Marquer traité");
  });
});
