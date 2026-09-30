import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { createVitalsCollector, normalizeVitalPath, deviceKind, WEB_VITAL_SAMPLE_RATE } from "@/lib/webVitals";
import { summarizeVitals, p75 } from "@/lib/webVitalsSummary";

describe("webVitals, collecteur", () => {
  it("un seul envoi par métrique et par page vue", () => {
    const send = vi.fn();
    const c = createVitalsCollector({ width: 400, pathname: "/", host: "guardiens.fr", connected: false, random: () => 0, send });
    c.record("LCP", 1200.4, "good");
    c.record("LCP", 1300, "good");
    c.flush();
    c.record("LCP", 9999, "poor");
    c.flush();
    c.flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].metrics).toEqual({ LCP: { value: 1300, rating: "good" } });
    expect(send.mock.calls[0][0]).toMatchObject({ path: "/", device: "mobile", auth: "visitor" });
  });

  it("chemin normalisé, aucune donnée personnelle", () => {
    expect(normalizeVitalPath("/gardiens/3f2a1b4c-1234-4abc-9def-0123456789ab")).toBe("/gardiens/:id");
    expect(normalizeVitalPath("/annonces/12345?x=1")).toBe("/annonces/:id");
    const send = vi.fn();
    const c = createVitalsCollector({ width: 1400, pathname: "/sits/42", host: "guardiens.fr", connected: true, random: () => 0, send });
    c.record("INP", 80, "good");
    c.flush();
    const payload = send.mock.calls[0][0];
    expect(payload.path).toBe("/sits/:id");
    expect(Object.keys(payload).sort()).toEqual(["auth", "build", "connection", "device", "host", "metrics", "path"]);
  });

  it("échantillonnage : 100 % mobile et tablette, 25 % ordinateur", () => {
    expect(WEB_VITAL_SAMPLE_RATE).toEqual({ mobile: 1, tablet: 1, desktop: 0.25 });
    expect(deviceKind(360)).toBe("mobile");
    expect(deviceKind(900)).toBe("tablet");
    expect(deviceKind(1440)).toBe("desktop");
    const send = vi.fn();
    const out = createVitalsCollector({ width: 1440, pathname: "/", host: "guardiens.fr", connected: false, random: () => 0.5, send });
    out.record("LCP", 1, "good"); out.flush();
    expect(out.sampled).toBe(false);
    expect(send).not.toHaveBeenCalled();
    const inMobile = createVitalsCollector({ width: 360, pathname: "/", host: "guardiens.fr", connected: false, random: () => 0.99, send });
    expect(inMobile.sampled).toBe(true);
  });

  it("même circuit que la mesure d'audience actuelle, sans traceur tiers", () => {
    // La mesure d'audience interne (analytics_events) ne demande pas de
    // consentement ; seul GA4 en exige un. webVitals ne touche jamais GA4.
    const src = readFileSync("src/lib/webVitals.ts", "utf8");
    expect(src).toMatch(/trackEventBeacon\("web_vital"/);
    expect(src).not.toMatch(/gtag|googletagmanager|trackGoogleAnalytics|document\.cookie/);
  });
});

describe("carte admin Vitesse ressentie", () => {
  const row = (path: string, device: string, LCP: number, INP: number, LONG_TASK: number) => ({
    metadata: { host: "guardiens.fr", path, device, metrics: { LCP: { value: LCP }, INP: { value: INP }, LONG_TASK: { value: LONG_TASK } } },
  });

  it("75e centile par appareil, chemins triés par nombre de mesures", () => {
    expect(p75([1, 2, 3, 4])).toBe(3);
    const s = summarizeVitals([
      row("/", "mobile", 1000, 50, 100), row("/", "mobile", 2000, 60, 200),
      row("/", "mobile", 3000, 70, 300), row("/", "mobile", 4000, 80, 400),
      row("/dashboard", "desktop", 900, 40, 90), { metadata: null },
    ]);
    expect(s.measures).toBe(5);
    expect(s.paths.map((p) => p.path)).toEqual(["/", "/dashboard"]);
    expect(s.paths[0].byDevice.mobile.LCP).toEqual({ p75: 3000, count: 4 });
    expect(s.paths[0].byDevice.desktop.LCP).toEqual({ p75: null, count: 0 });
  });

  it("affiche les libellés français sur données simulées", async () => {
    vi.resetModules();
    const rows = [row("/", "mobile", 2500, 120, 240)];
    const chain: Record<string, unknown> = {};
    for (const k of ["select", "eq", "gte", "order"]) chain[k] = () => chain;
    chain.limit = () => Promise.resolve({ data: rows, error: null });
    vi.doMock("@/integrations/supabase/client", () => ({ supabase: { from: () => chain } }));
    const { default: WebVitalsCard } = await import("@/components/admin/diagnostics/WebVitalsCard");
    render(<QueryClientProvider client={new QueryClient()}><WebVitalsCard /></QueryClientProvider>);
    expect(screen.getByText("Vitesse ressentie")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Téléphone")).toBeTruthy());
    expect(screen.getByText("2500 ms")).toBeTruthy();
    expect(screen.getByText("240 ms")).toBeTruthy();
    vi.doUnmock("@/integrations/supabase/client");
  });
});
