/**
 * Aperçus de partage (25/10/2026) : une image et un texte alternatif par
 * rubrique (accueil, /projets, /petites-missions, /associations).
 */
import { describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import PageMeta from "@/components/PageMeta";
import { DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_ALT, SECTION_OG_IMAGES } from "@/data/siteConstants";
import { staticRoutes } from "@/data/siteRoutes";

const root = (p: string) => resolve(process.cwd(), p);

/** Dimensions d'un JPEG lues dans le segment SOF. */
const jpegSize = (file: string) => {
  const b = readFileSync(file);
  expect(b[0]).toBe(0xff);
  expect(b[1]).toBe(0xd8);
  let i = 2;
  while (i < b.length) {
    const marker = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7), bytes: b.length };
    }
    i += 2 + len;
  }
  throw new Error(`SOF introuvable : ${file}`);
};

const meta = (attr: string, key: string) =>
  document.head.querySelector(`meta[${attr}="${key}"]`)?.getAttribute("content") ?? null;

describe("Aperçus de partage par rubrique", () => {
  it("les URL des rubriques sont celles de staticRoutes", () => {
    const byPath = (p: string) => staticRoutes.find((r) => r.path === p)?.ogImage;
    expect(byPath("/projets")).toBe(SECTION_OG_IMAGES.projets.url);
    expect(byPath("/petites-missions")).toBe(SECTION_OG_IMAGES.entraide.url);
    expect(byPath("/associations")).toBe(SECTION_OG_IMAGES.associations.url);
    expect(byPath("/")).toBe(DEFAULT_OG_IMAGE);
  });

  it("chaque image existe en JPEG 1200 × 630 de moins de 300 Ko", () => {
    const urls = [DEFAULT_OG_IMAGE, ...Object.values(SECTION_OG_IMAGES).map((s) => s.url)];
    for (const url of urls) {
      const file = root(`public${new URL(url).pathname}`);
      expect(existsSync(file), file).toBe(true);
      const { width, height, bytes } = jpegSize(file);
      expect([width, height]).toEqual([1200, 630]);
      expect(bytes).toBeLessThan(300 * 1024);
    }
  });

  it("index.html décrit l'image réellement servie", () => {
    const html = readFileSync(root("index.html"), "utf8");
    expect(html).toContain(`<meta property="og:image:alt" content="${DEFAULT_OG_IMAGE_ALT}" />`);
    expect(html).toContain(`<meta name="twitter:image:alt" content="${DEFAULT_OG_IMAGE_ALT}" />`);
    expect(html).not.toContain("canapé");
  });

  it("PageMeta : image par défaut, image de rubrique, image sans texte alternatif", () => {
    render(
      <MemoryRouter>
        <PageMeta title="Accueil" description="d" path="/" />
      </MemoryRouter>,
    );
    expect(meta("property", "og:image")).toBe(DEFAULT_OG_IMAGE);
    expect(meta("property", "og:image:alt")).toBe(DEFAULT_OG_IMAGE_ALT);
    cleanup();

    render(
      <MemoryRouter>
        <PageMeta
          title="Projets"
          description="d"
          path="/projets"
          image={SECTION_OG_IMAGES.projets.url}
          imageAlt={SECTION_OG_IMAGES.projets.alt}
        />
      </MemoryRouter>,
    );
    expect(meta("property", "og:image")).toBe(SECTION_OG_IMAGES.projets.url);
    expect(meta("property", "og:image:alt")).toBe(SECTION_OG_IMAGES.projets.alt);
    expect(meta("name", "twitter:image:alt")).toBe(SECTION_OG_IMAGES.projets.alt);
    cleanup();

    // Page suivante avec une autre image et aucun texte : l'ancien disparaît.
    render(
      <MemoryRouter>
        <PageMeta title="Autre" description="d" path="/autre" image="https://example.org/x.jpg" />
      </MemoryRouter>,
    );
    expect(meta("property", "og:image:alt")).toBeNull();
    expect(meta("name", "twitter:image:alt")).toBeNull();
  });
});
