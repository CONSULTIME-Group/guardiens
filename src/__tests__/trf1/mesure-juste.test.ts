/**
 * Lot TRF1 (15/11/2026) : correctifs purs de la mesure du trafic, arène
 * claude/arene/2026-11-15-trafic.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { decodeSignupSource, encodeSignupSource, SIGNUP_SRC_MAX_LENGTH } from "@/lib/signupSource";

describe("TRF1 · P2 · la campagne survit à la troncature", () => {
  it("le chemin d'entrée tombe d'abord, la campagne reste", () => {
    const src = { us: "instagram", um: "social", uc: "251115-reel-rando", rd: "l.instagram.com", lp: "/" + "a".repeat(199), ts: "2026-11-15T10:00:00.000Z" };
    expect(JSON.stringify(src).length).toBeGreaterThan(SIGNUP_SRC_MAX_LENGTH);
    const out = decodeSignupSource(encodeSignupSource(src))!;
    expect(out.uc).toBe("251115-reel-rando");
    expect(out.us).toBe("instagram");
    expect(out.lp).toBeUndefined();
  });
});

describe("TRF1 · P1 · le bandeau emporte la source", () => {
  it("l'adresse copiée passe par withSignupSrcParam", () => {
    const s = readFileSync("src/components/auth/InAppBrowserBanner.tsx", "utf8");
    expect(s).toContain("withSignupSrcParam(window.location.href)");
  });
});

describe("TRF1 · P3 et P4 · chiffres et libellés", () => {
  it("Facebook compte exactement et dit sa période", () => {
    const s = readFileSync("src/components/admin/analytics/FacebookReferralCard.tsx", "utf8");
    expect(s).toContain('{ count: "exact", head: true }');
    // Lot TRF-3 : la tuile compte des pages ouvertes, plusieurs par visite.
    expect(s).toContain("Pages ouvertes depuis Facebook");
  });
  it("Acquisition IA sans tuile Facebook, libellé juste", () => {
    const s = readFileSync("src/pages/admin/_components/dashboard/AiAcquisitionCard.tsx", "utf8");
    expect(s).not.toContain("fb_referral_landing");
    expect(s).toContain("Visiteurs IA retrouvés au compte");
  });
  it("les pages les plus vues portent leur vrai nom", () => {
    expect(readFileSync("src/pages/admin/AdminAnalytics.tsx", "utf8")).toContain("Pages les plus vues");
  });
  it("les pages Bing lisent Query à défaut de Page", () => {
    expect(readFileSync("src/components/admin/seo/BingVisibilityCard.tsx", "utf8")).toContain("p.Page ?? p.Query");
  });
});
