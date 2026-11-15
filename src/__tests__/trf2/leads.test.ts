/**
 * Lot TRF2 (15/11/2026, arène claude/arene/2026-11-15-trafic, lots L1 à L3) :
 * onglet Leads, ménage de /admin/traffic, application hôte dans la source.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { buildChannelLeads, SOCIAL_CHANNELS } from "@/lib/admin/channelLeads";
import { inAppHost } from "@/lib/inAppBrowser";
import { buildSignupSource, deriveSignupChannel, decodeSignupSource, encodeSignupSource } from "@/lib/signupSource";
import { trafficTabFromParam } from "@/pages/admin/AdminTraffic";

describe("TRF2 · Leads", () => {
  const raw = {
    sits_published: 22,
    rows: [
      { channel: "recherche_naturelle", campaign: null, is_campaign: false, visits: 40, signups: 8, published_members: 1, applicants: 3, helpers: 0, outing_members: 0 },
      { channel: "facebook", campaign: null, is_campaign: false, visits: 9, signups: 5, published_members: 0, applicants: 1, helpers: 1, outing_members: 0 },
      { channel: "facebook", campaign: "cmt-grp-toulon", is_campaign: true, visits: 3, signups: 0 },
      { channel: "facebook", campaign: null, is_campaign: true, visits: 5, signups: 5 },
      { channel: "facebook", campaign: "bio", is_campaign: true, visits: 1, signups: 0 },
    ],
  };
  it("réseaux sociaux toujours présents, canaux triés par annonces puis inscrits", () => {
    const l = buildChannelLeads(raw);
    expect(l.sitsPublished).toBe(22);
    expect(l.channels[0].channel).toBe("recherche_naturelle");
    for (const c of SOCIAL_CHANNELS) expect(l.channels.some((x) => x.channel === c)).toBe(true);
  });
  it("campagnes rangées sous leur réseau, « sans campagne » en dernier", () => {
    const fb = buildChannelLeads(raw).channels.find((c) => c.channel === "facebook")!;
    expect(fb.campaigns.map((k) => k.campaign)).toEqual(["cmt-grp-toulon", "bio", null]);
  });
  it("une réponse illisible donne une liste vide sans casser", () => {
    expect(buildChannelLeads(null).channels.length).toBe(SOCIAL_CHANNELS.length);
  });
});

describe("TRF2 · onglets", () => {
  it("Leads par défaut, anciens liens redirigés", () => {
    expect(trafficTabFromParam(null)).toBe("leads");
    expect(trafficTabFromParam("interne")).toBe("entonnoir");
    expect(trafficTabFromParam("signup-funnel")).toBe("entonnoir");
    expect(trafficTabFromParam("acquisition")).toBe("seo");
  });
  it("cinq blocs retirés", () => {
    for (const f of ["GA4DiagnosticCard", "CoreWebVitalsCard", "CannibalizationCard", "ArticleCtaPerformance", "BingOnlyQueriesCard"]) {
      expect(existsSync(`src/components/admin/seo/${f}.tsx`)).toBe(false);
    }
  });
  it("un nom par objet : articles villes et pages villes SEO", () => {
    expect(readFileSync("src/components/admin/seo/ContentToCreate.tsx", "utf8")).toContain('label: "Articles villes"');
    expect(readFileSync("src/components/admin/seo/ContentToCreate.tsx", "utf8")).toContain("Total publiés");
    expect(readFileSync("src/pages/admin/_components/dashboard/AcquisitionPilotCard.tsx", "utf8")).toContain("Pages villes SEO");
  });
});

describe("TRF2 · application hôte", () => {
  const IG = "Mozilla/5.0 (iPhone) AppleWebKit Mobile/15E148 Instagram 312.0 FBAV/1";
  const TT = "Mozilla/5.0 (Linux; Android 14) BytedanceWebview/d8a21c6 musical_ly_2023";
  const FB = "Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/450.0]";
  it("Instagram avant Facebook, TikTok reconnu", () => {
    expect(inAppHost(IG)).toBe("instagram");
    expect(inAppHost(TT)).toBe("tiktok");
    expect(inAppHost(FB)).toBe("facebook");
    expect(inAppHost("Mozilla/5.0 Safari")).toBeUndefined();
  });
  it("un clic fbclid ouvert dans Instagram compte pour Instagram, et survit au transport", () => {
    const src = buildSignupSource({ search: "?fbclid=abc", pathname: "/", ap: "instagram" });
    expect(deriveSignupChannel(src)).toBe("instagram");
    expect(decodeSignupSource(encodeSignupSource(src))!.ap).toBe("instagram");
  });
  it("la page vue porte l'application hôte", () => {
    expect(readFileSync("src/components/analytics/PageViewTracker.tsx", "utf8")).toContain("ap: inAppHost()");
  });
});
