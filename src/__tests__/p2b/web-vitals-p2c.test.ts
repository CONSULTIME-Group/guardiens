/** Lot P2c : mesure réelle propre (site public seulement, pas de page masquée, pas de robot). */
import { describe, it, expect, vi } from "vitest";
import { createVitalsCollector, shouldReportVitals, isPublicVitalHost } from "@/lib/webVitals";
import { summarizeVitals } from "@/lib/webVitalsSummary";

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1";
const ok = { hostname: "guardiens.fr", userAgent: UA, width: 390, visibility: "visible", painted: true, mode: "production" };

describe("P2c, envoi seulement depuis guardiens.fr", () => {
  it("guardiens.fr et www acceptés, tout le reste refusé", () => {
    expect(shouldReportVitals(ok)).toBe(true);
    expect(shouldReportVitals({ ...ok, hostname: "www.guardiens.fr" })).toBe(true);
    for (const h of ["id-preview--71c9.lovable.app", "guardiens.lovable.app", "x.lovableproject.com", "localhost", "127.0.0.1", ""]) {
      expect(shouldReportVitals({ ...ok, hostname: h }), h).toBe(false);
      expect(isPublicVitalHost(h)).toBe(false);
    }
  });

  it("jamais pendant les tests", () => {
    expect(shouldReportVitals({ ...ok, mode: "test" })).toBe(false);
  });

  it("le collecteur n'envoie rien hors guardiens.fr", () => {
    const send = vi.fn();
    const c = createVitalsCollector({ width: 390, pathname: "/", host: "id-preview--x.lovable.app", connected: false, random: () => 0, send });
    c.record("LCP", 1000, "good"); c.flush();
    expect(send).not.toHaveBeenCalled();
  });

  it("host écrit dans la mesure", () => {
    const send = vi.fn();
    const c = createVitalsCollector({ width: 390, pathname: "/", host: "www.guardiens.fr", connected: false, random: () => 0, send });
    c.record("LCP", 1000, "good"); c.flush();
    expect(send.mock.calls[0][0].host).toBe("guardiens.fr");
  });
});

describe("P2c, page masquée ou largeur illisible", () => {
  it("masquée au démarrage ou jamais peinte : aucun envoi", () => {
    expect(shouldReportVitals({ ...ok, visibility: "hidden" })).toBe(false);
    expect(shouldReportVitals({ ...ok, visibility: "prerender" })).toBe(false);
    expect(shouldReportVitals({ ...ok, painted: false })).toBe(false);
  });
  it("largeur nulle ou non lisible : aucun envoi", () => {
    expect(shouldReportVitals({ ...ok, width: 0 })).toBe(false);
    expect(shouldReportVitals({ ...ok, width: Number.NaN })).toBe(false);
    const send = vi.fn();
    const c = createVitalsCollector({ width: 0, pathname: "/", host: "guardiens.fr", connected: false, random: () => 0, send });
    c.record("LCP", 1000, "good"); c.flush();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("P2c, robots et Prerender", () => {
  it("aucun envoi", () => {
    for (const ua of ["Prerender (+https://github.com/prerender/prerender)", "Googlebot/2.1", "SomeCrawler/1.0", "Baiduspider", "Mozilla/5.0 HeadlessChrome/120.0"]) {
      expect(shouldReportVitals({ ...ok, userAgent: ua }), ua).toBe(false);
    }
  });
});

describe("P2c, carte filtrée sur host", () => {
  it("les mesures sans host ou d'un autre host sont ignorées", () => {
    const m = (host: unknown) => ({ metadata: { host, path: "/dashboard", device: "mobile", metrics: { LONG_TASK: { value: 420 } } } });
    const s = summarizeVitals([m(undefined), m("guardiens.lovable.app"), { metadata: { path: "/admin/diagnostics", device: "mobile", metrics: { LCP: { value: 409 } } } }, m("guardiens.fr")]);
    expect(s.measures).toBe(1);
    expect(s.paths).toHaveLength(1);
    expect(s.paths[0].byDevice.mobile.LONG_TASK).toEqual({ p75: 420, count: 1 });
  });
});
