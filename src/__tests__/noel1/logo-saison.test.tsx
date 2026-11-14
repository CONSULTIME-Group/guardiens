import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { isChristmasWindow, applySeasonalFavicon, NOEL_FAVICON_32 } from "@/lib/seasonalBrand";
import BrandWordmark from "@/components/layout/BrandWordmark";

const root = path.resolve(__dirname, "../../..");

describe("lot NOEL1 : fenêtre de Noël à l'heure de Paris", () => {
  it("du 1er décembre au 6 janvier inclus", () => {
    expect(isChristmasWindow(new Date("2026-11-30T22:59:00Z"))).toBe(false); // 23 h 59 à Paris
    expect(isChristmasWindow(new Date("2026-11-30T23:00:00Z"))).toBe(true); // minuit le 1er
    expect(isChristmasWindow(new Date("2026-12-25T12:00:00Z"))).toBe(true);
    expect(isChristmasWindow(new Date("2027-01-06T22:59:00Z"))).toBe(true);
    expect(isChristmasWindow(new Date("2027-01-06T23:00:00Z"))).toBe(false); // 7 janvier
    expect(isChristmasWindow(new Date("2026-07-14T12:00:00Z"))).toBe(false);
  });
});

describe("lot NOEL1 : logotype et favicon", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("?noel=1 affiche l'image en thème clair et garde le texte pour le thème sombre", () => {
    window.history.replaceState(null, "", "/?noel=1");
    const { container } = render(<BrandWordmark heightClass="h-10" text={<span>guardiens</span>} />);
    const img = container.querySelector("img[data-season='noel']");
    expect(img).not.toBeNull();
    expect(img?.className).toContain("dark:hidden");
    expect(container.textContent).toContain("guardiens");
  });

  it("?noel=0 garde le texte seul", () => {
    window.history.replaceState(null, "", "/?noel=0");
    const { container } = render(<BrandWordmark heightClass="h-10" text={<span>guardiens</span>} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("le favicon de saison remplace les icônes de l'onglet", () => {
    window.history.replaceState(null, "", "/?noel=1");
    document.head.innerHTML = '<link rel="icon" href="/favicon.ico"><link rel="icon" href="/favicon.svg">';
    applySeasonalFavicon(document);
    const hrefs = [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')].map((l) => l.getAttribute("href"));
    expect(hrefs).toContain(NOEL_FAVICON_32);
    expect(hrefs).not.toContain("/favicon.ico");
  });

  it("les fichiers de saison existent et les trois en-têtes passent par BrandWordmark", () => {
    for (const f of ["guardiens-noel-80.webp", "guardiens-noel-120.webp", "g-noel-32.png", "g-noel-64.png"]) {
      expect(existsSync(path.join(root, "public/brand/noel", f))).toBe(true);
    }
    for (const f of ["PublicHeader.tsx", "AppTopBar.tsx", "Navigation.tsx"]) {
      expect(readFileSync(path.join(root, "src/components/layout", f), "utf8")).toContain("<BrandWordmark");
    }
  });
});
