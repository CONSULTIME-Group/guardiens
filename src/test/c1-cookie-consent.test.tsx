import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";

const scripts = () =>
  Array.from(document.querySelectorAll("script")).map((s) => s.src).filter((s) => /googletagmanager|google-analytics/.test(s));

async function freshModule() {
  vi.resetModules();
  document.head.querySelectorAll("script").forEach((s) => s.remove());
  delete (window as any).gtag;
  delete (window as any).dataLayer;
  delete (window as any)["ga-disable-G-9JP4VR1RRP"];
  return await import("@/lib/cookieConsent");
}

const setUA = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });

describe("C1, consentement cookies", () => {
  beforeEach(() => {
    localStorage.clear();
    setUA("Mozilla/5.0 (iPhone) Safari");
  });

  it("aucun chargement GA sans choix, Consent Mode à denied en premier", async () => {
    const m = await freshModule();
    m.initConsent();
    expect(scripts()).toHaveLength(0);
    const first = Array.from((window as any).dataLayer[0]);
    expect(first).toEqual(["consent", "default", expect.objectContaining({
      analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
    })]);
  });

  it("aucun chargement après refus, chargement après acceptation", async () => {
    const m = await freshModule();
    m.initConsent();
    m.setStoredConsent("denied");
    expect(scripts()).toHaveLength(0);
    m.setStoredConsent("granted");
    expect(scripts()).toHaveLength(1);
  });

  it("un ancien choix granted est respecté, sans bandeau", async () => {
    localStorage.setItem("guardiens_cookie_consent_v1", JSON.stringify({ value: "granted", timestamp: Date.now() - 10 * 864e5 }));
    const m = await freshModule();
    expect(m.shouldShowBanner()).toBe(false);
    m.initConsent();
    expect(scripts()).toHaveLength(1);
  });

  it("choix mémorisé, puis redemandé après 182 jours", async () => {
    const m = await freshModule();
    expect(m.CONSENT_TTL_DAYS).toBe(182);
    m.setStoredConsent("denied");
    expect(m.shouldShowBanner()).toBe(false);
    localStorage.setItem("guardiens_cookie_consent_v1", JSON.stringify({ value: "denied", timestamp: Date.now() - 183 * 864e5 }));
    expect(m.shouldShowBanner()).toBe(true);
  });

  it("le retrait supprime _ga et _ga_*", async () => {
    const m = await freshModule();
    document.cookie = "_ga=GA1.1.1; path=/";
    document.cookie = "_ga_9JP4VR1RRP=GS1; path=/";
    document.cookie = "autre=1; path=/";
    m.initConsent();
    m.setStoredConsent("denied");
    expect(document.cookie).not.toMatch(/_ga/);
    expect(document.cookie).toMatch(/autre=1/);
    expect((window as any)["ga-disable-G-9JP4VR1RRP"]).toBe(true);
  });

  it("robot et Prerender : ni bandeau ni mesure", async () => {
    for (const ua of ["Mozilla/5.0 (compatible; Googlebot/2.1)", "Mozilla/5.0 Prerender (+https://github.com/prerender/prerender)"]) {
      setUA(ua);
      const m = await freshModule();
      expect(m.shouldShowBanner()).toBe(false);
      m.initConsent();
      expect(scripts()).toHaveLength(0);
    }
  });

  it("bandeau : trois boutons au même niveau, textes exacts, aucune case pré-cochée", async () => {
    await freshModule();
    const { CookieConsentBanner, COOKIE_BANNER_TEXT } = await import("@/components/legal/CookieConsentBanner");
    render(<MemoryRouter><CookieConsentBanner /></MemoryRouter>);
    expect(screen.getByText("Un mot sur les cookies")).toBeTruthy();
    const actions = screen.getByTestId("cookie-actions").querySelectorAll("button");
    expect(Array.from(actions).map((b) => b.textContent)).toEqual(["Tout accepter", "Tout refuser", "Personnaliser"]);
    const classes = new Set(Array.from(actions).map((b) => b.className));
    expect(classes.size).toBe(1);
    fireEvent.click(screen.getByText("Personnaliser"));
    expect(screen.getByRole("switch", { name: /Mesure d'audience/ }).getAttribute("aria-checked")).toBe("false");
    await act(async () => { fireEvent.click(screen.getByText("Enregistrer mon choix")); });
    expect(JSON.parse(localStorage.getItem("guardiens_cookie_consent_v1")!).value).toBe("denied");
    for (const v of Object.values(COOKIE_BANNER_TEXT)) expect(v).not.toMatch(/[\u2013\u2014]/);
  });

  it("textes de la page /cookies et de l'admin sans tiret long", () => {
    for (const f of ["src/pages/Cookies.tsx", "src/components/legal/CookieConsentBanner.tsx"]) {
      expect(readFileSync(f, "utf8")).not.toMatch(/[\u2013\u2014]/);
    }
    expect(readFileSync("src/pages/admin/AdminLegal.tsx", "utf8")).not.toMatch(/pas de bandeau requis/);
  });
});
