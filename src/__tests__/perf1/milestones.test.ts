/**
 * Lot perf 1 : jalons de vitesse (FIRST_CARD, FIRST_CARD_PHOTO, SIT_HERO),
 * navigation interne, abandon, gabarits de chemin et exclusion du laboratoire.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { __resetPerfMarks, currentPerfView, markMilestone, markNavigation, subscribePerfMarks } from "@/lib/perfMarks";
import { createMilestoneReporter, milestoneRating, milestoneTemplate, normalizeVitalPath, exactVitalPath, shouldReportVitals } from "@/lib/webVitals";
import { isPerfLabSession } from "@/lib/labTraffic";

const base = { host: "guardiens.fr", device: "mobile", auth: "visitor", connection: "4g", build: "b" };

function wire() {
  const send = vi.fn();
  let n = 0;
  const reporter = createMilestoneReporter({ sampled: true, base, send, hardPv: "hard", newPv: () => `soft${++n}` });
  subscribePerfMarks({ onMilestone: (m) => reporter.onMilestone(m), onViewEnd: (v, at) => reporter.onViewEnd(v, at) });
  return { send, reporter };
}

beforeEach(() => { __resetPerfMarks("/annonces"); sessionStorage.clear(); });

describe("gabarits de chemin", () => {
  it("une fiche lue par slug compte avec les fiches, les listes gardent leur nom", () => {
    expect(normalizeVitalPath("/annonces/gardien-a-rodilhan-f6e7c5")).toBe("/annonces/:id");
    expect(normalizeVitalPath("/annonces/international")).toBe("/annonces/international");
    expect(normalizeVitalPath("/house-sitting/lyon")).toBe("/house-sitting/:id");
    expect(normalizeVitalPath("/petites-missions/creer")).toBe("/petites-missions/creer");
    expect(normalizeVitalPath("/annonces/12345?x=1")).toBe("/annonces/:id");
    expect(exactVitalPath("/annonces/gardien-a-rodilhan?x=1")).toBe("/annonces/gardien-a-rodilhan");
  });

  it("listes et fiches suivies par les jalons", () => {
    expect(milestoneTemplate("/annonces")).toBe("list");
    expect(milestoneTemplate("/search")).toBe("list");
    expect(milestoneTemplate("/annonces/une-fiche")).toBe("fiche");
    expect(milestoneTemplate("/sits/abc")).toBe("fiche");
    expect(milestoneTemplate("/annonces/international")).toBeNull();
    expect(milestoneTemplate("/")).toBeNull();
    expect(milestoneRating(2400)).toBe("good");
    expect(milestoneRating(3900)).toBe("needs-improvement");
    expect(milestoneRating(9000)).toBe("poor");
  });
});

describe("jalons d'une liste d'annonces", () => {
  it("page d'arrivée : une ligne quand la carte et sa photo sont là, jalons rejoués à l'abonnement", () => {
    markMilestone("FIRST_CARD", { with_point: false, sits_loaded: 40 }, 6500);
    const { send } = wire();
    markMilestone("FIRST_CARD_PHOTO", undefined, 8000);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      path: "/annonces", nav: "hard", pv: "hard", with_point: false, sits_loaded: 40,
      metrics: { FIRST_CARD: { value: 6500, rating: "poor" }, FIRST_CARD_PHOTO: { value: 8000, rating: "poor" } },
    });
  });

  it("navigation interne : chrono depuis le changement de route, vue soft", () => {
    const { send } = wire();
    markNavigation("/", 1000);
    markNavigation("/annonces", 20_000);
    expect(currentPerfView()).toMatchObject({ nav: "soft", path: "/annonces", start: 20_000 });
    markMilestone("FIRST_CARD", undefined, 21_800);
    markMilestone("FIRST_CARD_PHOTO", undefined, 22_500);
    const soft = send.mock.calls.map((c) => c[0]).find((m) => m.nav === "soft");
    expect(soft).toMatchObject({ path: "/annonces", metrics: { FIRST_CARD: { value: 1800, rating: "good" } } });
  });

  it("vue quittée avant la première carte : abandon avec le temps écoulé", () => {
    const { send } = wire();
    markNavigation("/annonces/une-fiche", 9000);
    const row = send.mock.calls[0][0];
    expect(row).toMatchObject({ path: "/annonces", nav: "hard", abandoned: true, metrics: { FIRST_CARD: { value: 9000, rating: "abandoned" } } });
  });

  it("page masquée sans jalon : abandon de la vue courante", () => {
    const { send, reporter } = wire();
    reporter.flushCurrent(4000, currentPerfView());
    expect(send.mock.calls[0][0]).toMatchObject({ abandoned: true, metrics: { FIRST_CARD: { value: 4000 } } });
    reporter.flushCurrent(5000, currentPerfView());
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("une page hors gabarit sans jalon n'envoie rien", () => {
    __resetPerfMarks("/");
    const { send } = wire();
    markNavigation("/guides", 3000);
    expect(send).not.toHaveBeenCalled();
  });

  it("fiche : SIT_HERO suffit pour envoyer la ligne", () => {
    __resetPerfMarks("/annonces/une-fiche");
    const { send } = wire();
    markMilestone("SIT_HERO", undefined, 3100);
    expect(send.mock.calls[0][0]).toMatchObject({ path: "/annonces/:id", path_full: "/annonces/une-fiche", metrics: { SIT_HERO: { value: 3100, rating: "needs-improvement" } } });
  });

  it("non échantillonné : rien ne part", () => {
    const send = vi.fn();
    const r = createMilestoneReporter({ sampled: false, base, send, hardPv: "h" });
    subscribePerfMarks({ onMilestone: (m) => r.onMilestone(m), onViewEnd: (v, at) => r.onViewEnd(v, at) });
    markMilestone("FIRST_CARD", undefined, 100);
    markNavigation("/x", 200);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("robots et laboratoire exclus", () => {
  it("?perf_lab=1 marque toute la session de l'onglet", () => {
    expect(isPerfLabSession("")).toBe(false);
    expect(isPerfLabSession("?perf_lab=1")).toBe(true);
    expect(isPerfLabSession("")).toBe(true);
  });

  it("la mesure de vitesse refuse une session de laboratoire", () => {
    const g = { hostname: "guardiens.fr", userAgent: "Mozilla/5.0 Android", width: 390, visibility: "visible", painted: true, mode: "production" };
    expect(shouldReportVitals(g)).toBe(true);
    expect(shouldReportVitals({ ...g, lab: true })).toBe(false);
  });

  it("trackEvent, trackEventBeacon et trackEventWithUserId sortent pour un robot ou le laboratoire", () => {
    const src = readFileSync("src/lib/analytics.ts", "utf8");
    expect(src.match(/isLabOrBotTraffic\(\)/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("les jalons sont posés par la recherche, la première photo et les fiches", () => {
    const read = (p: string) => readFileSync(p, "utf8");
    expect(read("src/components/search/SearchSitter.tsx")).toMatch(/markMilestone\("FIRST_CARD"/);
    expect(read("src/components/search/listing/SearchListingCard.tsx")).toMatch(/markMilestone\("FIRST_CARD_PHOTO"\)/);
    expect(read("src/pages/PublicSitDetail.tsx")).toMatch(/markMilestone\("SIT_HERO"\)/);
    expect(read("src/pages/SitDetail.tsx")).toMatch(/markMilestone\("SIT_HERO"\)/);
    expect(read("src/components/analytics/PageViewTracker.tsx")).toMatch(/markNavigation\(path\)/);
  });
});
