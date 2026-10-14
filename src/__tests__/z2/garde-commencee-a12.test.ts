/**
 * Lot Z2, audit A-12 (13/10/2026) : une annonce publiée dont la date de début
 * est passée, sans gardien retenu, reste en ligne. Sa fiche et sa carte disent
 * « Garde déjà commencée, arrivée possible en cours de séjour ».
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STARTED_SIT_NOTICE, isStartedOpenSit } from "@/lib/sitStarted";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const TODAY = "2026-10-13";

describe("A-12, règle pure", () => {
  it("cas réel 2c79fa88 : début le 09/10, fin le 01/11, publiée", () => {
    expect(isStartedOpenSit({ status: "published", start_date: "2026-10-09", end_date: "2026-11-01" }, TODAY)).toBe(true);
  });

  it("une garde qui commence aujourd'hui ou plus tard n'est pas commencée", () => {
    expect(isStartedOpenSit({ status: "published", start_date: TODAY, end_date: "2026-10-20" }, TODAY)).toBe(false);
    expect(isStartedOpenSit({ status: "published", start_date: "2026-10-20", end_date: "2026-10-25" }, TODAY)).toBe(false);
  });

  it("le dernier jour de la garde compte encore, le lendemain non", () => {
    expect(isStartedOpenSit({ status: "published", start_date: "2026-10-01", end_date: TODAY }, TODAY)).toBe(true);
    expect(isStartedOpenSit({ status: "published", start_date: "2026-10-01", end_date: "2026-10-12" }, TODAY)).toBe(false);
  });

  it("fin non renseignée : la garde commencée reste ouverte", () => {
    expect(isStartedOpenSit({ status: "published", start_date: "2026-10-01", end_date: null }, TODAY)).toBe(true);
  });

  it("horodatage complet accepté (jour calendaire)", () => {
    expect(isStartedOpenSit({ status: "published", start_date: "2026-10-09T00:00:00+00:00", end_date: "2026-11-01T00:00:00+00:00" }, TODAY)).toBe(true);
  });

  it.each(["confirmed", "in_progress", "draft", "expired", "archived", "completed", "cancelled", null])(
    "statut %s : aucune mention (un gardien est retenu ou l'annonce est close)",
    (status) => {
      expect(isStartedOpenSit({ status, start_date: "2026-10-09", end_date: "2026-11-01" }, TODAY)).toBe(false);
    },
  );

  it("dates absentes ou illisibles : aucune mention", () => {
    expect(isStartedOpenSit({ status: "published", start_date: null, end_date: "2026-11-01" }, TODAY)).toBe(false);
    expect(isStartedOpenSit({ status: "published", start_date: "bientôt", end_date: "2026-11-01" }, TODAY)).toBe(false);
    expect(isStartedOpenSit(null, TODAY)).toBe(false);
  });

  it("texte exact, sans tiret cadratin ni demi-cadratin", () => {
    expect(STARTED_SIT_NOTICE).toBe("Garde déjà commencée, arrivée possible en cours de séjour");
    expect(STARTED_SIT_NOTICE).not.toMatch(/[–—]/);
  });
});

describe("A-12, branchement sur la fiche et la carte", () => {
  it.each([
    "src/components/search/listing/SearchListingCard.tsx",
    "src/pages/InternationalListings.tsx",
    "src/pages/PublicSitDetail.tsx",
    "src/components/sits/views/SitterSitView.tsx",
  ])("%s affiche la mention par la règle partagée", (file) => {
    const src = read(file);
    expect(src).toContain('from "@/lib/sitStarted"');
    expect(src).toContain("isStartedOpenSit(");
    expect(src).toContain("{STARTED_SIT_NOTICE}");
  });

  it("la carte de recherche ne la montre ni sur une carte inactive ni sur un exemple", () => {
    const src = read("src/components/search/listing/SearchListingCard.tsx");
    expect(src).toMatch(/const isStarted = !isMission && !isDemo && !isInactive && isStartedOpenSit\(/);
  });
});
