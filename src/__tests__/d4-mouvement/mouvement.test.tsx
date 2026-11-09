/**
 * Lot D4 (09/11/2026, lots 2 et 3 de l'arène du 09/11 réunis, « ok go enchaine »
 * de Jérémie) : bandeau « Depuis votre dernière visite » de l'accueil
 * ordinateur et chiffres de « Guardiens aujourd'hui ».
 * Verrous : jamais de zéro, trois tuiles au plus, ordre par espace, repli sur
 * 7 jours, titre daté, repère de visite par session d'onglet, garde lointaine
 * (G3), note à partir de 5 avis, identités en nombre, migration en lecture seule.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import {
  buildMovementBand,
  sinceTitle,
  nearestSitLine,
  takePreviousDesktopVisit,
  LAST_DESKTOP_VISIT_KEY,
  MOVEMENT_WEEK_TITLE,
} from "@/lib/dashboardMovement";
import MovementBand from "@/components/dashboard/shared/MovementBand";
import { reassuranceRows } from "@/components/dashboard/shared/ReassuranceRailCard";
import { trackEvent } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

afterEach(cleanup);

const NOW = new Date(2026, 10, 9, 12, 0, 0);
const data = (since: Record<string, number>, week: Record<string, number>) => ({
  since: new Date(2026, 10, 5, 10, 0, 0).toISOString(),
  windows: { since, week },
});

describe("D4, bandeau de mouvement", () => {
  it("depuis la dernière visite : tuiles non nulles, ordre gardien, trois au plus", () => {
    const band = buildMovementBand(
      "sitter",
      data({ new_sits_50: 2, new_needs_30: 1, new_members_30: 14, applications_viewed: 1, new_sitters_30: 9 }, {}),
      { previousVisit: new Date(2026, 10, 5, 10, 0, 0).toISOString(), now: NOW },
    )!;
    expect(band.mode).toBe("since");
    expect(band.title).toBe("Depuis votre dernière visite, jeudi 5 novembre");
    expect(band.tiles.map((t) => t.key)).toEqual(["applications_viewed", "new_sits_50", "new_needs_30"]);
    expect(band.tiles.map((t) => t.label)).toEqual(["candidature lue", "nouvelles gardes à moins de 50 km", "coup de main demandé à moins de 30 km"]);
  });

  it("propriétaire : candidatures d'abord, zéros masqués", () => {
    const band = buildMovementBand("owner", data({ new_applications: 1, new_sitters_30: 0, new_sits_30: 2 }, {}), {
      previousVisit: new Date(2026, 10, 7, 9, 0, 0).toISOString(),
      now: NOW,
    })!;
    expect(band.tiles.map((t) => [t.key, t.value])).toEqual([["new_applications", 1], ["new_sits_30", 2]]);
  });

  it("rien depuis la visite : repli sur la semaine ; rien sur la semaine : pas de bandeau", () => {
    const prev = new Date(2026, 10, 8, 18, 0, 0).toISOString();
    const week = buildMovementBand("sitter", data({ new_sits_50: 0 }, { new_members_30: 3 }), { previousVisit: prev, now: NOW })!;
    expect(week.mode).toBe("week");
    expect(week.title).toBe(MOVEMENT_WEEK_TITLE);
    expect(buildMovementBand("sitter", data({}, { new_sits_50: 0 }), { previousVisit: prev, now: NOW })).toBeNull();
    expect(buildMovementBand("sitter", null, { previousVisit: prev, now: NOW })).toBeNull();
  });

  it("visite de moins d'une heure ou premier passage : la semaine", () => {
    const recent = new Date(NOW.getTime() - 20 * 60 * 1000).toISOString();
    expect(buildMovementBand("sitter", data({ new_sits_50: 4 }, { new_sits_50: 4 }), { previousVisit: recent, now: NOW })!.mode).toBe("week");
    expect(buildMovementBand("sitter", data({ new_sits_50: 4 }, { new_sits_50: 4 }), { previousVisit: null, now: NOW })!.mode).toBe("week");
  });

  it("titre daté : jour même, hier, sinon le jour", () => {
    expect(sinceTitle(new Date(2026, 10, 9, 8, 0), NOW)).toBe("Depuis votre dernière visite");
    expect(sinceTitle(new Date(2026, 10, 8, 8, 0), NOW)).toBe("Depuis votre dernière visite, hier");
    expect(sinceTitle(new Date(2026, 10, 3, 8, 0), NOW)).toBe("Depuis votre dernière visite, mardi 3 novembre");
  });

  it("rendu : un lien par tuile, mesure à l'affichage et au clic", () => {
    const band = buildMovementBand("sitter", data({ new_sits_50: 2 }, {}), { previousVisit: new Date(2026, 10, 5).toISOString(), now: NOW })!;
    render(<MemoryRouter><MovementBand band={band} space="sitter" /></MemoryRouter>);
    const tile = screen.getByTestId("movement-tile-new_sits_50");
    expect(tile.getAttribute("href")).toBe("/search");
    expect(tile.textContent).toContain("2");
    expect(screen.queryByText("0")).toBeNull();
    fireEvent.click(tile);
    const names = (trackEvent as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => c[0]);
    expect(names).toContain("movement_view");
    expect(names).toContain("movement_click");
  });
});

describe("D4, garde lointaine (G3)", () => {
  const fmt = (c: string) => c;
  const day = () => "19 décembre";
  it("au-delà de 50 km : où et quand", () => {
    expect(nearestSitLine({ sit_id: "s", city: "Mâcon", start_date: "2026-12-19", distance_km: 78 }, fmt, day)).toBe(
      "La garde ouverte la plus proche commence le 19 décembre, à Mâcon, à 78 km de chez vous.",
    );
  });
  it("à 50 km ou moins, ou sans distance : rien (la vedette s'en charge)", () => {
    expect(nearestSitLine({ sit_id: "s", city: "Lyon", distance_km: 12 }, fmt, day)).toBeNull();
    expect(nearestSitLine({ sit_id: "s", city: "Lyon", distance_km: null }, fmt, day)).toBeNull();
    expect(nearestSitLine(null, fmt, day)).toBeNull();
  });
});

describe("D4, repère de visite", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it("lu une fois par session d'onglet, posé pour la prochaine", () => {
    localStorage.setItem(LAST_DESKTOP_VISIT_KEY("u"), "2026-11-05T09:00:00.000Z");
    expect(takePreviousDesktopVisit("u", "2026-11-09T11:00:00.000Z")).toBe("2026-11-05T09:00:00.000Z");
    expect(localStorage.getItem(LAST_DESKTOP_VISIT_KEY("u"))).toBe("2026-11-09T11:00:00.000Z");
    // Un rechargement dans la même session garde la même visite précédente.
    expect(takePreviousDesktopVisit("u", "2026-11-09T11:05:00.000Z")).toBe("2026-11-05T09:00:00.000Z");
  });
  it("premier passage : aucun repère", () => {
    expect(takePreviousDesktopVisit("v")).toBeNull();
  });
});

describe("D4, Guardiens aujourd'hui", () => {
  const base = { totalInscrits: 1830, maisonsGardees: 44, animauxAccompagnes: 249 };
  it("départements, nouveaux de la semaine, identités en nombre", () => {
    const rows = reassuranceRows({ ...base, community: { departments: 98, new_members_7d: 52, identities_verified: 130, reviews_count: 8, reviews_avg: 5 } });
    expect(rows.find((r) => r.key === "members")!.label).toBe("membres inscrits dans 98 départements");
    expect(rows.find((r) => r.key === "new_members")!.label).toBe("nouveaux membres cette semaine");
    expect(rows.find((r) => r.key === "verified")!.label).toBe("identités vérifiées");
    expect(rows.some((r) => /%/.test(r.label) || /%/.test(r.display ?? ""))).toBe(false);
    expect(rows.find((r) => r.key === "reviews")).toBeUndefined();
  });
  it("note des avis : propriétaire seulement, à partir de 5 avis", () => {
    const owner = reassuranceRows({ ...base, showReviews: true, community: { reviews_count: 8, reviews_avg: 5 } });
    expect(owner.find((r) => r.key === "reviews")).toMatchObject({ display: "5 sur 5", label: "note moyenne des 8 avis publiés" });
    expect(reassuranceRows({ ...base, showReviews: true, community: { reviews_count: 4, reviews_avg: 5 } }).find((r) => r.key === "reviews")).toBeUndefined();
  });
});

describe("D4, base", () => {
  const sql = readFileSync("drizzle/migrations/0123_d4_mouvement_accueil.sql", "utf8");
  it("lecture seule, membre connecté seulement, compteurs internes", () => {
    expect(sql).toMatch(/get_dashboard_movement\(p_since timestamptz DEFAULT NULL\)[\s\S]*?STABLE/);
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/);
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.get_dashboard_movement(timestamptz) FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.get_dashboard_movement(timestamptz) TO authenticated, service_role;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.dashboard_movement_counts(uuid, double precision, double precision, timestamptz) TO service_role;");
    expect(sql).toContain("now() - interval '30 days'");
  });
  it("contrat de post-déploiement présent", () => {
    expect(readFileSync("scripts/db/production-contracts.json", "utf8")).toContain("0123_d4_mouvement_accueil.sql");
  });
  it("aucun tiret long ni mot proscrit", () => {
    for (const f of ["src/lib/dashboardMovement.ts", "src/components/dashboard/shared/MovementBand.tsx", "src/hooks/useDashboardMovement.ts", "drizzle/migrations/0123_d4_mouvement_accueil.sql"]) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/[–—]/);
      expect(src).not.toMatch(/voisin/i);
    }
  });
});
