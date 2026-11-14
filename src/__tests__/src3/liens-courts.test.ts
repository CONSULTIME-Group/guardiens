/**
 * Lot SRC3 (14/11/2026) : liens courts /ig, /tiktok, /yt, /fb.
 * Chaque lien court mène à l'accueil avec les UTM de son canal, et la source
 * enregistrée à l'inscription retombe sur le bon canal.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@/lib/cookieConsent", () => ({ getStoredConsent: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));

import { SHORT_LINKS, buildShortLinkTarget } from "@/lib/shortLinks";
import {
  buildSignupSource, captureSignupSource, getSignupSource, deriveSignupChannel,
  __resetSignupSourceForTests,
} from "@/lib/signupSource";

const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");

beforeEach(() => {
  sessionStorage.clear();
  __resetSignupSourceForTests();
});

describe("table des liens courts", () => {
  it("quatre canaux : ig, tiktok, yt, fb", () => {
    expect(Object.keys(SHORT_LINKS).sort()).toEqual(["fb", "ig", "tiktok", "yt"]);
  });
  it.each([
    ["ig", "instagram", "social"],
    ["tiktok", "tiktok", "social"],
    ["yt", "youtube", "video"],
    ["fb", "facebook", "social"],
  ])("/%s mène à l'accueil avec utm_source=%s et utm_medium=%s", (slug, source, medium) => {
    const url = new URL(buildShortLinkTarget(slug, "")!, "https://guardiens.fr");
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("utm_source")).toBe(source);
    expect(url.searchParams.get("utm_medium")).toBe(medium);
    expect(url.searchParams.get("utm_campaign")).toBe("bio");
  });
  it("slug inconnu : aucune destination", () => {
    expect(buildShortLinkTarget("zz", "")).toBeNull();
  });
  it("insensible à la casse du slug", () => {
    expect(buildShortLinkTarget("IG", "")).toContain("utm_source=instagram");
  });
});

describe("paramètres reçus", () => {
  it("une campagne passée dans l'URL courte l'emporte sur « bio »", () => {
    const url = new URL(buildShortLinkTarget("ig", "?utm_campaign=story")!, "https://guardiens.fr");
    expect(url.searchParams.get("utm_campaign")).toBe("story");
    expect(url.searchParams.get("utm_source")).toBe("instagram");
  });
  it("les autres paramètres (parrainage) et l'ancre sont conservés", () => {
    const target = buildShortLinkTarget("tiktok", "?ref=abc", "#cta")!;
    expect(target).toContain("ref=abc");
    expect(target.endsWith("#cta")).toBe(true);
  });
});

describe("canal d'inscription", () => {
  it.each([
    ["ig", "instagram"],
    ["tiktok", "tiktok"],
    ["yt", "youtube"],
    ["fb", "facebook"],
  ])("/%s donne le canal %s", (slug, channel) => {
    const target = buildShortLinkTarget(slug, "")!;
    const search = `?${target.split("?")[1]}`;
    const src = buildSignupSource({ search, pathname: "/", referrer: null });
    expect(deriveSignupChannel(src)).toBe(channel);
  });
  it("la source enregistrée avant la redirection garde les UTM du canal", () => {
    const target = buildShortLinkTarget("ig", "")!;
    captureSignupSource({ search: `?${target.split("?")[1]}`, pathname: "/", referrer: null });
    // la page vue de /ig qui suit ne l'écrase pas : première source gardée
    captureSignupSource({ search: "", pathname: "/ig", referrer: null });
    expect(deriveSignupChannel(getSignupSource())).toBe("instagram");
  });
});

describe("branchement", () => {
  it("App.tsx déclare une route par lien court", () => {
    const app = read("src/App.tsx");
    expect(app).toContain("Object.keys(SHORT_LINKS)");
    expect(app).toContain("<ShortLinkRedirect slug={slug} />");
  });
  it("la redirection enregistre la source avant de naviguer et reste hors index", () => {
    const src = read("src/components/analytics/ShortLinkRedirect.tsx");
    expect(src).toContain("useLayoutEffect");
    expect(src).toContain("captureSignupSource");
    expect(src).toContain("noindex, follow");
    expect(src).toContain("<Navigate to={target} replace />");
  });
});
