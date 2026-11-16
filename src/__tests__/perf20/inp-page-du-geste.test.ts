/**
 * Lot perf 20 (16/11/2026) : l'INP est rangé sous la page où le geste a eu
 * lieu. Mesure du 16/11/2026 : les 21 mesures mobiles de /sits/:id de la
 * semaine (p75 400 ms) étaient des sessions de membres qui avaient ensuite
 * navigué ailleurs (jusqu'à 13 pages), la pire interaction du document étant
 * comptée sous la page d'arrivée.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { __resetPerfMarks, markNavigation, perfViewAt } from "@/lib/perfMarks";
import { vitalAttribution } from "@/lib/webVitals";
import { inpPage, summarizeVitals } from "@/lib/webVitalsSummary";

describe("vue affichée au moment d'un geste (perfViewAt)", () => {
  beforeEach(() => __resetPerfMarks("/sits/abc"));

  it("rend la page d'arrivée avant toute navigation", () => {
    expect(perfViewAt(10)).toMatchObject({ path: "/sits/abc", nav: "hard" });
  });

  it("rend la vue interne affichée au moment du geste", () => {
    markNavigation("/dashboard", 1000);
    markNavigation("/messages", 5000);
    expect(perfViewAt(500).path).toBe("/sits/abc");
    expect(perfViewAt(1000)).toMatchObject({ path: "/dashboard", nav: "soft" });
    expect(perfViewAt(4999).path).toBe("/dashboard");
    expect(perfViewAt(9000).path).toBe("/messages");
  });
});

describe("attribution de l'INP (lot perf 20)", () => {
  const inp = (interactionTime?: number) => ({
    name: "INP",
    attribution: { interactionTarget: "button.a", inputDelay: 2, processingDuration: 300, presentationDelay: 90, loadState: "complete", interactionTime },
  }) as never;

  it("porte la page du geste en gabarit et son type de vue", () => {
    const attr = vitalAttribution(inp(4200), () => ({ path: "/messages/3f1c9a2e-1111-4222-8333-444455556666", nav: "soft" }));
    expect(attr).toMatchObject({ page: "/messages/:id", page_nav: "soft", processing: 300 });
  });

  it("sans moment d'interaction, aucune page ajoutée (phases du lot perf 15 inchangées)", () => {
    expect(vitalAttribution(inp(undefined), () => ({ path: "/x", nav: "hard" }))).toEqual({
      target: "button.a", input_delay: 2, processing: 300, presentation: 90, load_state: "complete",
    });
  });
});

describe("carte admin : INP sous la page du geste", () => {
  const row = (path: string, inp: number, page?: string, lcp = 1000) => ({
    metadata: { host: "guardiens.fr", path, device: "mobile", metrics: { LCP: { value: lcp }, INP: { value: inp, attr: page ? { page } : {} } } },
  });

  it("une ligne d'arrivée sur /sits/:id dont le geste a eu lieu sur /dashboard compte pour /dashboard", () => {
    const { paths } = summarizeVitals([row("/sits/:id", 900, "/dashboard"), row("/dashboard", 100)]);
    const sits = paths.find((p) => p.path === "/sits/:id")!;
    const dash = paths.find((p) => p.path === "/dashboard")!;
    expect(sits.byDevice.mobile.INP.count).toBe(0);
    expect(sits.byDevice.mobile.LCP.count).toBe(1);
    expect(dash.byDevice.mobile.INP).toEqual({ p75: 900, count: 2 });
  });

  it("une mesure d'avant le lot reste sous son chemin d'arrivée", () => {
    const { paths } = summarizeVitals([row("/sits/:id", 400)]);
    expect(paths[0].byDevice.mobile.INP).toEqual({ p75: 400, count: 1 });
  });

  it("page illisible : chemin d'arrivée", () => {
    expect(inpPage(42, "/a")).toBe("/a");
    expect(inpPage("pas-un-chemin", "/a")).toBe("/a");
    expect(inpPage("/b", "/a")).toBe("/b");
  });
});
