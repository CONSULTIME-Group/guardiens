/**
 * Lot perf 18 (04/11/2026) : attribution du CLS enrichie. La cible seule nomme
 * l'élément déplacé (div.p-6 de SearchSitter, cartes li.bg-card des membres),
 * jamais celui qui l'a poussé : on ajoute le moment, le déplacement, l'élément
 * au-dessus et les trois plus grands décalages, sous le plafond anonyme de 2 048 octets.
 */
import { describe, expect, it } from "vitest";
import { compactSelector, fitVitalPayload, pusherCandidate, vitalAttribution, VITAL_PAYLOAD_BUDGET } from "@/lib/webVitals";

const dom = () => {
  document.body.innerHTML = `<main id="main-content"><div class="banner notice x y">bandeau</div><div class="p-6 grid"><ul><li class="bg-card border">a</li></ul></div></main>`;
  return {
    banner: document.querySelector(".banner")!,
    grid: document.querySelector(".p-6")!,
    li: document.querySelector("li")!,
  };
};

describe("perf 18, attribution du CLS", () => {
  it("sélecteur court : balise, id, trois classes au plus, parent", () => {
    const { banner, li } = dom();
    expect(compactSelector(banner)).toBe("main#main-content>div.banner.notice.x");
    expect(compactSelector(li)).toBe("ul>li.bg-card.border");
  });

  it("candidat pousseur : frère précédent, sinon celui d'un ancêtre", () => {
    const { grid, li } = dom();
    expect(pusherCandidate(grid)).toBe("main#main-content>div.banner.notice.x");
    expect(pusherCandidate(li)).toBe("main#main-content>div.banner.notice.x");
  });

  it("valeur, moment, état, déplacement, pousseur et plus grands décalages", () => {
    const { grid, li } = dom();
    const attr = vitalAttribution({
      name: "CLS",
      entries: [
        { value: 0.02, startTime: 400.4, sources: [{ node: li }] },
        { value: 0.18, startTime: 1210.2, sources: [{ node: grid }] },
      ],
      attribution: {
        largestShiftTarget: "#main-content>div.p-6",
        largestShiftValue: 0.1834,
        largestShiftTime: 1210.2,
        loadState: "complete",
        largestShiftSource: { node: grid, previousRect: { y: 220 }, currentRect: { y: 412 } },
      },
    } as never);
    expect(attr).toEqual({
      target: "#main-content>div.p-6",
      value: 0.183,
      t: 1210,
      load_state: "complete",
      dy: 192,
      top: 220,
      above: "main#main-content>div.banner.notice.x",
      n: 2,
      shifts: "1210:0.18:main#main-content>div.p-6.grid|400:0.02:ul>li.bg-card.border",
    });
  });

  it("attribution vide : rien n'est envoyé", () => {
    expect(vitalAttribution({ name: "CLS", attribution: {} } as never)).toBeUndefined();
  });

  it("plafond : le détail des décalages part en premier, les mesures restent", () => {
    const big = {
      host: "guardiens.fr",
      path: "/recherche",
      filler: "x".repeat(1200),
      metrics: { CLS: { value: 0.3, rating: "poor", attr: { target: "div.p-6", value: 0.3, shifts: "y".repeat(240), above: "z".repeat(90) } }, LCP: { value: 2400, rating: "good" } },
    };
    const fitted = fitVitalPayload(big);
    expect(JSON.stringify(fitted).length).toBeLessThanOrEqual(VITAL_PAYLOAD_BUDGET);
    expect(fitted.metrics.CLS.value).toBe(0.3);
    expect(fitted.metrics.LCP.value).toBe(2400);
    expect(fitted.metrics.CLS.attr).toMatchObject({ target: "div.p-6", value: 0.3 });
    expect((fitted.metrics.CLS.attr as Record<string, unknown>).shifts).toBeUndefined();
    expect(big.metrics.CLS.attr.shifts).toHaveLength(240);
  });

  it("charge ordinaire inchangée", () => {
    const small = { host: "guardiens.fr", metrics: { CLS: { value: 0.1, rating: "needs-improvement", attr: { target: "a" } } } };
    expect(fitVitalPayload(small)).toBe(small);
  });
});
