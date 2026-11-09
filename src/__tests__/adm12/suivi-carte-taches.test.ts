/**
 * Lot ADM12, recette du 09/11/2026 à 390 px : /admin?plus=taches doit poser
 * la carte des tâches en haut de l'écran même quand les blocs au-dessus
 * grandissent après l'ouverture.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { followCronsCard, FOLLOW_STEP_MS, FOLLOW_MAX_MS } from "@/lib/admin/followCronsCard";

function fakeCard(initialTop: number) {
  let top = initialTop;
  const el = {
    scrollIntoView: vi.fn(() => { top = 0; }),
    getBoundingClientRect: () => ({ top }) as DOMRect,
  };
  return { el: el as unknown as HTMLElement, push: (dy: number) => { top += dy; }, top: () => top };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("followCronsCard", () => {
  it("recale la carte tant que le contenu au-dessus la repousse", () => {
    const c = fakeCard(900);
    followCronsCard(() => c.el);
    vi.advanceTimersByTime(FOLLOW_STEP_MS);
    expect(c.top()).toBe(0);
    c.push(3200); // les tendances se chargent au-dessus
    vi.advanceTimersByTime(FOLLOW_STEP_MS);
    expect(c.top()).toBe(0);
    expect(c.el.scrollIntoView).toHaveBeenCalledTimes(2);
    expect(c.el.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
  });

  it("la carte garde une marge sous la barre fixe du téléphone", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/pages/admin/AdminOverview.tsx", "utf8"))
      .toContain('id="taches-planifiees" className="scroll-mt-20"');
  });

  it("s'arrête une fois la carte stable", () => {
    const c = fakeCard(500);
    followCronsCard(() => c.el);
    vi.advanceTimersByTime(FOLLOW_STEP_MS * 6);
    c.push(400);
    vi.advanceTimersByTime(FOLLOW_STEP_MS * 3);
    expect(c.top()).toBe(400);
  });

  it("rend la main au premier geste de défilement du lecteur", () => {
    const c = fakeCard(500);
    followCronsCard(() => c.el);
    window.dispatchEvent(new Event("wheel"));
    vi.advanceTimersByTime(FOLLOW_STEP_MS * 2);
    expect(c.el.scrollIntoView).not.toHaveBeenCalled();
  });

  it("abandonne au plus tard après la durée maximale", () => {
    const c = fakeCard(500);
    followCronsCard(() => c.el);
    vi.advanceTimersByTime(FOLLOW_MAX_MS + FOLLOW_STEP_MS * 2);
    const calls = (c.el.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls.length;
    c.push(700);
    vi.advanceTimersByTime(FOLLOW_STEP_MS * 4);
    expect((c.el.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
  });
});
