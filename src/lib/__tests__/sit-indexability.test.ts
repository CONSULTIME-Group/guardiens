import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isSitRichEnough,
  sitRichTextLength,
  sitRichnessRejectionReason,
  isClosedSitStatus,
  MIN_RICH_TEXT_LENGTH,
} from "@/lib/sitIndexability";

const filler = (n: number) => "a".repeat(n);

describe("règle de richesse d'une annonce", () => {
  it("recale un titre trop court", () => {
    expect(sitRichnessRejectionReason({ title: "Garde", owner_message: filler(500) })).toBe("titre_trop_court");
  });

  it("recale un contenu cumulé insuffisant", () => {
    expect(sitRichnessRejectionReason({ title: "Garde de deux chats à Lyon", daily_routine: "court" })).toBe(
      "contenu_insuffisant",
    );
  });

  it("retient une annonce dont la richesse vient de specific_expectations", () => {
    expect(isSitRichEnough({ title: "Garde de deux chats à Belley", specific_expectations: filler(400) })).toBe(true);
  });

  it("retient une annonce dont la richesse vient de owner_message", () => {
    expect(isSitRichEnough({ title: "Garde de deux chats à Belley", owner_message: filler(400) })).toBe(true);
  });

  it("additionne bien tous les champs", () => {
    const sit = { title: filler(30), owner_message: filler(60), daily_routine: filler(60), specific_expectations: filler(60) };
    expect(sitRichTextLength(sit)).toBe(210);
    expect(isSitRichEnough(sit)).toBe(true);
  });

  it("cas limite : exactement au seuil", () => {
    const sit = { title: filler(20), owner_message: filler(MIN_RICH_TEXT_LENGTH - 20) };
    expect(isSitRichEnough(sit)).toBe(true);
    const juste_en_dessous = { title: filler(20), owner_message: filler(MIN_RICH_TEXT_LENGTH - 21) };
    expect(isSitRichEnough(juste_en_dessous)).toBe(false);
  });

  it("tolère les valeurs nulles", () => {
    expect(sitRichTextLength(null as any)).toBe(0);
    expect(isSitRichEnough({ title: null, owner_message: null })).toBe(false);
  });

  it("marque confirmed et archived comme non indexables", () => {
    expect(isClosedSitStatus("confirmed")).toBe(true);
    expect(isClosedSitStatus("archived")).toBe(true);
    expect(isClosedSitStatus("published")).toBe(false);
    expect(isClosedSitStatus(null)).toBe(false);
  });
});

describe("non-divergence des deux implémentations", () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

  it("generate-sitemap.mjs utilise la règle partagée et pas un seuil local", () => {
    const src = read("scripts/generate-sitemap.mjs");
    expect(src).toContain('from "../src/lib/sitIndexability.js"');
    expect(src).toContain("sitRichnessRejectionReason(s)");
    expect(src).not.toMatch(/daily_routine\s*\|\|\s*""\)\.length\)\s*>=/);
  });

  it("PublicSitDetail utilise la règle partagée", () => {
    const src = read("src/pages/PublicSitDetail.tsx");
    expect(src).toContain("@/lib/sitIndexability");
    expect(src).toContain("isSitRichEnough(sit)");
  });
});
