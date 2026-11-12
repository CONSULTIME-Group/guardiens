/**
 * Lot PR4 (12/11/2026) : les mêmes pages ne partent plus au rendu en boucle.
 * Relevé : claude/releve-prerender-cloudflare-12-novembre-2026.md et
 * claude/diagnostic-quota-rendu-12-novembre-2026.md (projet Claude).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  HUB_MIN_RENDER_INTERVAL_HOURS,
  isHubPath,
  pickStaticToRecache,
  spaceOutboxHubs,
  STATIC_MIN_RENDER_INTERVAL_HOURS,
  STATIC_RENDER_BUDGET,
  STATIC_SEO_URLS,
} from "../../../supabase/functions/_shared/static-seo-refresh.ts";

const read = (p: string) => readFileSync(p, "utf8");
const H = 3_600_000;
const NOW = Date.parse("2026-11-12T12:00:00Z");

describe("PR4, pages d'agrégat reconnues", () => {
  it("accueil, hubs, pages ville, guides de ville et départements sont des hubs", () => {
    for (const p of ["/", "/annonces", "/house-sitting", "/petites-missions", "/house-sitting/lyon", "/guides/chambery", "/departement/rhone"]) {
      expect(isHubPath(p), p).toBe(true);
    }
  });
  it("une page d'un seul élément garde son rendu au passage suivant", () => {
    for (const p of [
      "/annonces/garde-16-animaux-a-marlhes-ab96d6",
      "/gardiens/7d78edb4-cd34-4ef4-bd3b-7f1cb07da9f9",
      "/petites-missions/un-coup-de-main-pour-transporter-des-meubles",
      "/actualites/c-est-quoi-le-house-sitting",
      "/races/dog-dalmatien",
      "/projets/foret-bleue",
      "/house-sitting/lyon/quartier",
    ]) {
      expect(isHubPath(p), p).toBe(false);
    }
  });
});

describe("PR4, file des changements", () => {
  const row = (path: string) => ({ path, dirty_at: "2026-11-12T11:59:00Z" });

  it("un hub rendu depuis moins de 6 heures attend jusqu'à ses 6 heures", () => {
    const last = new Map([["/", NOW - 2 * H]]);
    const { toRender, spaced } = spaceOutboxHubs([row("/")], last, NOW);
    expect(toRender).toEqual([]);
    expect(spaced).toHaveLength(1);
    expect(spaced[0].until).toBe(new Date(NOW + 4 * H).toISOString());
    expect(HUB_MIN_RENDER_INTERVAL_HOURS).toBe(6);
  });

  it("un hub rendu il y a 6 heures ou jamais part au rendu", () => {
    const last = new Map([["/annonces", NOW - 6 * H]]);
    const { toRender, spaced } = spaceOutboxHubs([row("/annonces"), row("/house-sitting/lyon")], last, NOW);
    expect(toRender.map((r) => r.path)).toEqual(["/annonces", "/house-sitting/lyon"]);
    expect(spaced).toEqual([]);
  });

  it("une annonce modifiée deux fois en une heure est rendue aux deux passages", () => {
    const path = "/annonces/garde-16-animaux-a-marlhes-ab96d6";
    const { toRender, spaced } = spaceOutboxHubs([row(path)], new Map([[path, NOW - 0.5 * H]]), NOW);
    expect(toRender.map((r) => r.path)).toEqual([path]);
    expect(spaced).toEqual([]);
  });

  it("des hubs en attente ne prennent la place d'aucune autre page", () => {
    const hubs = ["/", "/house-sitting", "/annonces", "/guides", "/house-sitting/lyon", "/guides/lyon", "/departement/rhone"];
    const pages = Array.from({ length: 8 }, (_, i) => `/annonces/garde-${i}-abc12${i}`);
    const last = new Map(hubs.map((h) => [h, NOW - H]));
    const { toRender, spaced } = spaceOutboxHubs([...hubs, ...pages].map(row), last, NOW, STATIC_RENDER_BUDGET);
    expect(spaced.map((s) => s.row.path)).toEqual(hubs);
    expect(toRender.map((r) => r.path)).toEqual(pages.slice(0, STATIC_RENDER_BUDGET));
  });
});

describe("PR4, pages statiques après une mise en ligne", () => {
  const mark = "2026-11-12T11:00:00Z";

  it("sans heure courante, la règle d'origine est inchangée", () => {
    const first = pickStaticToRecache(mark, new Map());
    expect(first.toRecache).toEqual(STATIC_SEO_URLS.slice(0, 6));
    expect(first.deferred).toBe(8);
  });

  it("une page rendue il y a moins de 24 heures attend, les autres partent", () => {
    const last = new Map(STATIC_SEO_URLS.slice(0, 10).map((u) => [u, "2026-11-12T08:00:00Z"]));
    const res = pickStaticToRecache(mark, last, STATIC_RENDER_BUDGET, NOW);
    expect(res.toRecache).toEqual(STATIC_SEO_URLS.slice(10));
    expect(res.deferred).toBe(10);
    expect(STATIC_MIN_RENDER_INTERVAL_HOURS).toBe(24);
  });

  it("la page en attente part dès que son dernier rendu a 24 heures", () => {
    const last = new Map(STATIC_SEO_URLS.map((u) => [u, "2026-11-11T12:00:00Z"]));
    const res = pickStaticToRecache(mark, last, STATIC_RENDER_BUDGET, NOW);
    expect(res.toRecache).toEqual(STATIC_SEO_URLS.slice(0, 6));
    expect(res.deferred).toBe(8);
  });

  it("une page déjà rendue depuis le repère reste hors file", () => {
    const last = new Map(STATIC_SEO_URLS.map((u) => [u, "2026-11-12T11:30:00Z"]));
    expect(pickStaticToRecache(mark, last, STATIC_RENDER_BUDGET, NOW)).toEqual({ toRecache: [], deferred: 0 });
  });
});

describe("PR4, câblage", () => {
  const consumer = read("supabase/functions/consume-seo-dirty/index.ts");
  const geocode = read("supabase/functions/geocode-city-pages/index.ts");

  it("le consommateur espace les hubs et lit plus de lignes que son budget", () => {
    expect(consumer).toContain("spaceOutboxHubs(");
    expect(consumer).toContain(".limit(STATIC_RENDER_BUDGET + OUTBOX_SPACING_LOOKAHEAD)");
    expect(consumer).toContain(".update({ next_attempt_at: until })");
    expect(consumer).toContain("STATIC_RENDER_BUDGET - outboxRows.length, staticNowMs)");
  });

  it("les compteurs de proximité ne sont recalculés qu'après un géocodage", () => {
    const i = geocode.indexOf("if (geocodees > 0) {");
    const j = geocode.indexOf('supabase.rpc("recalc_seo_city_nearby_counts")');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(geocode.match(/recalc_seo_city_nearby_counts"\)/g)).toHaveLength(1);
  });
});
