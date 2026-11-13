/**
 * Lot HOME3 (13/11/2026) : mesure de la home. Identifiant de visite porté par
 * chaque événement, description des clics restés muets, CLS clos au premier
 * changement de route.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { __resetVisitIdForTests, describeHomeClick, getVisitId } from "@/lib/analytics";
import { clsStillOpen } from "@/lib/webVitals";

const accept = () => localStorage.setItem("guardiens_cookie_consent_v1", JSON.stringify({ value: "granted", timestamp: Date.now() }));

describe("identifiant de visite", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); __resetVisitIdForTests(); });

  it("reste le même pendant la visite", () => {
    const first = getVisitId();
    expect(first).toMatch(/^[a-z0-9]{12,32}$/);
    expect(getVisitId()).toBe(first);
  });

  it("sans accord cookies, rien ne s'écrit dans le navigateur", () => {
    getVisitId();
    expect(sessionStorage.getItem("g_visit")).toBeNull();
    expect(localStorage.getItem("g_visit")).toBeNull();
  });

  it("après l'accord, le même identifiant s'écrit dans le stockage de session et survit au rechargement", () => {
    const first = getVisitId();
    accept();
    expect(getVisitId()).toBe(first);
    expect(sessionStorage.getItem("g_visit")).toBe(first);
    expect(localStorage.getItem("g_visit")).toBeNull();
    __resetVisitIdForTests();
    expect(getVisitId()).toBe(first);
  });

  it("change à la visite suivante", () => {
    accept();
    const first = getVisitId();
    sessionStorage.clear();
    __resetVisitIdForTests();
    expect(getVisitId()).not.toBe(first);
  });
});

describe("clics de la home", () => {
  it("donne la section, la destination sans paramètres et le libellé", () => {
    document.body.innerHTML = '<section id="confiance"><a href="/a-propos?x=1#affinite"><span>Comprendre  le score</span></a></section>';
    expect(describeHomeClick(document.querySelector("span"))).toEqual({ section: "confiance", href: "/a-propos", label: "Comprendre le score" });
  });

  it("ignore un clic hors lien et hors bouton", () => {
    document.body.innerHTML = '<section id="faq"><p>Texte</p></section>';
    expect(describeHomeClick(document.querySelector("p"))).toBeNull();
  });

  it("la home écoute tous les clics de son contenu", () => {
    const source = readFileSync("src/pages/Landing.tsx", "utf8");
    expect(source).toContain("onClickCapture");
    expect(source).toContain('trackEvent("home_click"');
  });
});

describe("CLS clos au changement de route", () => {
  it("reste ouvert sur la page d'arrivée, paramètres et ancre ignorés", () => {
    expect(clsStillOpen("/", "/", false)).toBe(true);
    expect(clsStillOpen("/annonces", "/annonces?ville=lyon", false)).toBe(true);
  });

  it("se clôt à la première autre page et le reste au retour", () => {
    expect(clsStillOpen("/", "/annonces", false)).toBe(false);
    expect(clsStillOpen("/", "/", true)).toBe(false);
  });
});
