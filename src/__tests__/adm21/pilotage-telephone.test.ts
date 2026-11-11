/**
 * Lot ADM21 (suite de l'audit admin du 11/11/2026) : liste avant l'état du
 * site sur téléphone quand tout est vert, cibles de 44 px dans l'admin,
 * file des annonces commencées bornée aux gardes qui se terminent bientôt.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isListFirstOnPhone } from "@/lib/admin/overviewOrder";
import { isListingStartedWaiting } from "@/lib/admin/listingStartedWaiting";

const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
const now = new Date("2026-11-11T12:00:00");

describe("ordre de la vue d'ensemble sur téléphone", () => {
  it("tout vert : la liste d'abord", () => {
    expect(isListFirstOnPhone([{ state: "ok" }, { state: "ok" }], false, null)).toBe(true);
  });
  it("un voyant en alerte, une lecture en cours, en échec ou vide : l'état du site en tête", () => {
    expect(isListFirstOnPhone([{ state: "ok" }, { state: "alert" }], false, null)).toBe(false);
    expect(isListFirstOnPhone([{ state: "ok" }], true, null)).toBe(false);
    expect(isListFirstOnPhone([{ state: "ok" }], false, new Error("x"))).toBe(false);
    expect(isListFirstOnPhone([], false, null)).toBe(false);
    expect(isListFirstOnPhone(null, false, null)).toBe(false);
  });
  it("l'ordre ne change qu'en dessous de md", () => {
    const page = read("src/pages/admin/AdminOverview.tsx");
    expect(page).toContain('listFirst ? "order-1 md:order-none"');
    expect((page.match(/order-2 md:order-none/g) ?? []).length).toBe(3);
    expect(page).toContain("flex flex-col gap-6 md:gap-10");
  });
});

describe("cibles de 44 px dans l'admin", () => {
  it("règle limitée aux écrans admin et aux petits écrans", () => {
    const css = read("src/index.css");
    const i = css.indexOf("Admin sur téléphone (lot ADM21");
    const rule = css.slice(i);
    expect(i).toBeGreaterThan(-1);
    expect(rule).toContain("@media (max-width: 767px)");
    expect(rule).toContain("[data-admin-main] button:not([role=\"switch\"]):not([role=\"checkbox\"]):not([role=\"radio\"])");
    expect(rule).toContain("min-height: 44px");
    expect(read("src/components/admin/AdminLayout.tsx")).toContain("<main data-admin-main");
  });
});

describe("annonces commencées : gardes qui se terminent bientôt", () => {
  it("fin sous 30 jours retenue, période longue écartée", () => {
    expect(isListingStartedWaiting({ status: "published", start_date: "2026-10-31", end_date: "2026-11-19", activeApplications: 10 }, now)).toBe(true);
    expect(isListingStartedWaiting({ status: "published", start_date: "2026-11-01", end_date: "2027-07-31", activeApplications: 1 }, now)).toBe(false);
    expect(isListingStartedWaiting({ status: "published", start_date: "2026-11-01", end_date: null, activeApplications: 1 }, now)).toBe(true);
  });
  it("la migration pose la même borne", () => {
    const sql = read("drizzle/migrations/0140_adm21_annonces_commencees_proches.sql");
    expect(sql).toContain("adm21_fin_sous_30_jours");
    expect(sql).toContain("+ 30)");
    expect(sql).not.toMatch(/\b(DELETE|UPDATE|INSERT)\b/);
  });
});
