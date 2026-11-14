import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as client from "@/lib/sitIndexability";
import * as edge from "../../../supabase/functions/_shared/sitIndexability.js";

const read = (p: string) => readFileSync(p, "utf8");

describe("RCH3 · annonces fermées et indexation", () => {
  it("les deux copies de la règle d'indexabilité sont la même règle", () => {
    expect(read("src/lib/sitIndexability.js").trim()).toBe('export * from "../../supabase/functions/_shared/sitIndexability.js";');
    expect(client.isSitEndDatePast).toBe(edge.isSitEndDatePast);
    expect(client.parisTodayForIndex).toBe(edge.parisTodayForIndex);
    const dts = read("src/lib/sitIndexability.d.ts");
    expect(dts).toContain("isSitEndDatePast");
    expect(dts).toContain("parisTodayForIndex");
  });

  it("une garde dont la date de fin est passée n'est plus indexable, le jour de fin compte encore", () => {
    expect(edge.isSitEndDatePast({ end_date: "2024-07-20" }, "2026-11-14")).toBe(true);
    expect(edge.isSitEndDatePast({ end_date: "2026-11-14" }, "2026-11-14")).toBe(false);
    expect(edge.isSitEndDatePast({ end_date: "2026-12-01T00:00:00" }, "2026-11-14")).toBe(false);
    expect(edge.isSitEndDatePast({ end_date: null }, "2026-11-14")).toBe(false);
    expect(edge.isSitEndDatePast(null, "2026-11-14")).toBe(false);
  });

  it("la date du jour est celle de Paris", () => {
    expect(edge.parisTodayForIndex(new Date("2026-11-14T23:30:00Z"))).toBe("2026-11-15");
    expect(edge.parisTodayForIndex(new Date("2026-11-14T10:00:00Z"))).toBe("2026-11-14");
  });

  it("le sitemap et la fiche publique appliquent la règle de fin", () => {
    const data = read("supabase/functions/_shared/sitemap-data.js");
    expect(data).toContain('"id, slug, title, updated_at, end_date, owner_message');
    expect(data).toContain("if (isSitEndDatePast(s, today)) { rejected.terminee += 1; return false; }");
    expect(read("src/pages/PublicSitDetail.tsx")).toContain("!isSitEndDatePast(sit, parisTodayForIndex()) && isSitRichEnough(sit)");
  });

  it("la recherche lit toujours les fermées mais ne les affiche plus", () => {
    const src = read("src/components/search/SearchSitter.tsx");
    expect(src).toContain('.from("public_closed_sits")');
    expect(src).toContain("let final = applySitClientFilters(rawResults).filter((s: any) => !isInactiveSit(s));");
    expect(src).not.toContain('t("search_results.group_past")');
  });

  it("les annonces passées de /annonces sont bornées à 90 jours", () => {
    const src = read("src/components/listings/PastListingsSection.tsx");
    expect(src).toContain("const MAX_AGE_DAYS = 90;");
    expect(src).toContain('.gte("end_date", sinceIso)');
  });
});
