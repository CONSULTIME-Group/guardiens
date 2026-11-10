/**
 * Lot SEO-GB1 (10/11/2026) : la balise googlebot ne contredit jamais robots
 * hors du domaine de preview. Audit SEO du 10/11/2026
 * (claude/audit-seo-approfondi-10-novembre-2026.md) : 291 copies Prerender
 * sur 784 portaient la googlebot « noindex, nofollow » du script de preview
 * d'index.html, avec robots « index, follow » écrit par PageMeta.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import PageMeta from "@/components/PageMeta";

// Ce que le script de preview d'index.html laisse dans le head.
const posePreviewTags = () => {
  const add = (name: string) => {
    const m = document.createElement("meta");
    m.name = name;
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
  };
  add("robots");
  add("googlebot");
  const c = document.createElement("link");
  c.rel = "canonical";
  c.href = "https://guardiens.fr/house-sitting/lyon";
  document.head.appendChild(c);
};

const renderPage = (props: { noindex?: boolean; nofollow?: boolean } = {}) =>
  render(
    <MemoryRouter initialEntries={["/house-sitting/lyon"]}>
      <PageMeta title="Home sitter à Lyon" description="Garde de maison à Lyon." path="/house-sitting/lyon" {...props} />
    </MemoryRouter>,
  );

const metas = (name: string) =>
  [...document.head.querySelectorAll(`meta[name="${name}"]`)].map((n) => n.getAttribute("content"));

describe("SEO-GB1 : googlebot alignée sur robots hors preview", () => {
  afterEach(() => {
    cleanup();
    document.head.querySelectorAll('meta[name="robots"], meta[name="googlebot"], link[rel="canonical"]').forEach((n) => n.remove());
  });

  it("retire la googlebot laissée par le script de preview, une seule robots indexable", async () => {
    posePreviewTags();
    renderPage();
    await waitFor(() => expect(metas("robots")).toEqual(["index, follow"]));
    expect(metas("googlebot")).toEqual([]);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  it("une page en noindex garde son noindex par robots, sans googlebot", async () => {
    posePreviewTags();
    renderPage({ noindex: true });
    await waitFor(() => expect(metas("robots")).toEqual(["noindex, follow"]));
    expect(metas("googlebot")).toEqual([]);
  });

  it("le domaine de preview reste hors index (verrou de source)", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toMatch(/g\.name = 'googlebot';\s*g\.content = 'noindex, nofollow';/);
    const src = readFileSync("src/components/PageMeta.tsx", "utf8");
    expect(src).toContain('upsertMetaTag({ attr: "name", key: "googlebot", content: "noindex, nofollow" })');
    expect(src).toContain('removeMetaTag({ attr: "name", key: "googlebot" })');
  });
});
