/**
 * Lot perf 19 (09/11/2026) : une recherche par changement réel, et une mesure
 * vraie de la première annonce (arène claude/arene/2026-11-09-double-recherche).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { __resetPerfMarks, currentPerfView, markMilestone, setViewExtra, skipMilestones, subscribePerfMarks } from "@/lib/perfMarks";
import { createMilestoneReporter, fitVitalPayload, VITAL_PAYLOAD_BUDGET } from "@/lib/webVitals";
import { diffSearchInputs, formatTriggers, searchKey, triggerMotif, type SearchInputs } from "@/lib/searchTrigger";
import { summarizeVitals } from "@/lib/webVitalsSummary";

const base = { host: "guardiens.fr", device: "mobile", auth: "member", connection: "4g", build: "b" };

function wire() {
  const send = vi.fn();
  let n = 0;
  const reporter = createMilestoneReporter({ sampled: true, base, send, hardPv: "hard", newPv: () => `soft${++n}` });
  subscribePerfMarks({
    onMilestone: (m) => reporter.onMilestone(m),
    onViewEnd: (v, at) => reporter.onViewEnd(v, at),
    onSkip: (v, r) => reporter.onSkip(v, r),
    onExtra: (v, e) => reporter.onExtra(v, e),
  });
  return { send, reporter };
}

const inputs = (over: Partial<SearchInputs> = {}): SearchInputs => ({
  tab: "sits", missionSubTab: "published", city: "Lyon", radius: [15], zoneMode: "radius",
  startDate: "", endDate: "", userCoords: { lat: 45.764043, lng: 4.835659 }, userCity: "Lyon", userPostalCode: "69001",
  ...over,
});

beforeEach(() => { __resetPerfMarks("/annonces"); sessionStorage.clear(); });

describe("clé de recherche", () => {
  it("R1 : le même point reposé dans un nouvel objet donne la même clé, aucun motif", () => {
    const a = inputs();
    const b = inputs({ userCoords: { lat: 45.76404301, lng: 4.83565899 }, radius: [15] });
    expect(searchKey(a)).toBe(searchKey(b));
    expect(diffSearchInputs(a, b)).toEqual([]);
  });
  it("R4 : un rayon changé change la clé, motif radius", () => {
    const a = inputs();
    const b = inputs({ radius: [30] });
    expect(searchKey(a)).not.toBe(searchKey(b));
    expect(triggerMotif(diffSearchInputs(a, b))).toBe("radius");
  });
  it("ville comparée sans casse ni espaces, dates regroupées, motifs distincts", () => {
    expect(searchKey(inputs({ city: " lyon " }))).toBe(searchKey(inputs()));
    expect(triggerMotif(diffSearchInputs(inputs(), inputs({ startDate: "2026-12-20", endDate: "2027-01-03" })))).toBe("dates");
    expect(triggerMotif(diffSearchInputs(inputs(), inputs({ zoneMode: "france", city: "Paris" })))).toBe("city+zone");
  });
  it("six motifs au plus dans la mesure", () => {
    expect(formatTriggers(["1:init", "2:a", "3:b", "4:c", "5:d", "6:e", "7:f"])).toBe("1:init,2:a,3:b,4:c,5:d,6:e");
  });
});

describe("jalons de la première recherche", () => {
  it("R2 : rayon vide puis geste, aucun FIRST_CARD, GESTURE_CARD mesuré depuis le geste", () => {
    const { send, reporter } = wire();
    markMilestone("FIRST_RESULT", { searches: 1 }, 1200, { attr: { outcome: "empty" } });
    skipMilestones("empty");
    setViewExtra({ gesture: "outofzone_france" });
    // Carte de la recherche du geste : jamais une première annonce.
    markMilestone("FIRST_CARD", undefined, 9000);
    markMilestone("GESTURE_CARD", { gesture: "outofzone_france", sits_loaded: 20 }, 9000, { since: 6000 });
    reporter.flushCurrent(12000, currentPerfView(), true);
    expect(send).toHaveBeenCalledTimes(1);
    const row = send.mock.calls[0][0];
    expect(row.metrics.FIRST_CARD).toBeUndefined();
    expect(row.abandoned).toBeUndefined();
    expect(row.metrics.FIRST_RESULT).toMatchObject({ value: 1200, attr: { outcome: "empty" } });
    expect(row.metrics.GESTURE_CARD).toMatchObject({ value: 3000 });
    expect(row.gesture).toBe("outofzone_france");
  });
  it("R3 : première liste non vide, FIRST_CARD égal à FIRST_RESULT", () => {
    const { send } = wire();
    markMilestone("FIRST_RESULT", undefined, 1534, { attr: { outcome: "cards" } });
    markMilestone("FIRST_CARD", undefined, 1534);
    markMilestone("FIRST_CARD_PHOTO", undefined, 1900);
    const row = send.mock.calls[0][0];
    expect(row.metrics.FIRST_CARD.value).toBe(row.metrics.FIRST_RESULT.value);
  });
  it("vue quittée sans première recherche : abandon gardé sous FIRST_CARD (série continue)", () => {
    const { send, reporter } = wire();
    reporter.flushCurrent(4000, currentPerfView(), true);
    expect(send.mock.calls[0][0]).toMatchObject({ abandoned: true, metrics: { FIRST_CARD: { value: 4000, rating: "abandoned" } } });
  });
  it("motifs et relances évitées portés par la ligne", () => {
    const { send } = wire();
    setViewExtra({ triggers: "1:init" });
    setViewExtra({ same_key: 1 });
    markMilestone("FIRST_RESULT", undefined, 700, { attr: { outcome: "cards" } });
    markMilestone("FIRST_CARD", undefined, 700);
    markMilestone("FIRST_CARD_PHOTO", undefined, 900);
    expect(send.mock.calls[0][0]).toMatchObject({ triggers: "1:init", same_key: 1 });
  });
});

describe("charge utile", () => {
  it("R5 : sous le plafond avec six motifs", () => {
    const row = {
      ...base, path: "/search", path_full: "/search", nav: "soft", pv: "abcdef0123456789",
      os: "android", os_version_major: 10, viewport_w: 360, viewport_h: 740, device_type: "mobile",
      with_point: true, sits_loaded: 41, searches: 6, mount_ms: 212, base_ms: 1193, search_start_ms: 421,
      triggers: formatTriggers(["1:init", "2:auth+user_point", "3:user_city+user_postal", "4:radius", "5:city+zone", "6:dates"]),
      same_key: 3, gesture: "outofzone_france",
      metrics: {
        FIRST_RESULT: { value: 1200, rating: "good", attr: { outcome: "empty" } },
        GESTURE_CARD: { value: 1800, rating: "good" },
        LCP: { value: 2400, rating: "good", attr: { target: "div.p-6>h2.font-heading", load_delay: 10, load_time: 20, render_delay: 30, ttfb: 120 } },
        INP: { value: 180, rating: "good", attr: { target: "button.rounded-full", input_delay: 10, processing: 40, presentation: 30, load_state: "complete" } },
      },
    };
    expect(JSON.stringify(fitVitalPayload(row)).length).toBeLessThanOrEqual(VITAL_PAYLOAD_BUDGET);
  });
});

describe("tableau admin", () => {
  it("colonne « Après un geste » et vues à première issue vide", () => {
    const rows = [
      { metadata: { host: "guardiens.fr", path: "/search", device: "mobile", metrics: { FIRST_RESULT: { value: 900, attr: { outcome: "empty" } }, GESTURE_CARD: { value: 1500 } } } },
      { metadata: { host: "guardiens.fr", path: "/search", device: "mobile", metrics: { FIRST_RESULT: { value: 600, attr: { outcome: "cards" } }, FIRST_CARD: { value: 600 } } } },
    ];
    const s = summarizeVitals(rows as never);
    const p = s.paths.find((x) => x.path === "/search")!;
    expect(p.emptyFirst.mobile).toBe(1);
    expect(p.byDevice.mobile.GESTURE.p75).toBe(1500);
    expect(p.byDevice.mobile.CONTENT.p75).toBe(600);
  });
});

describe("branchement de la recherche", () => {
  const src = readFileSync("src/components/search/SearchSitter.tsx", "utf8");
  it("relance seulement sur clé changée, motif noté à chaque recherche", () => {
    expect(src).toContain("if (key === lastSearchKeyRef.current)");
    expect(src).toContain("setViewExtra({ same_key: sameKeyRef.current })");
    expect(src).toContain('recordSearchLaunch(currentSearchInputs(), "init")');
    expect(src).toMatch(/motif = motif \? `auth\+\$\{motif\}` : "auth"/);
  });
  it("FIRST_RESULT posé avant FIRST_CARD au même instant, carte de geste après sa recherche", () => {
    const i = src.indexOf('markMilestone("FIRST_RESULT"');
    const j = src.indexOf('markMilestone("FIRST_CARD", extra, at)');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(src).toContain("settledGenRef.current >= pending.gen");
  });
  it("les gestes d'élargissement sont notés", () => {
    for (const g of ["outofzone_", "empty_", "alma_region", "discovery_france", "radius", "city", "geolocation"]) {
      expect(src).toContain(`noteGesture(${g.endsWith("_") ? "`" + g : '"' + g}`);
    }
  });
});
