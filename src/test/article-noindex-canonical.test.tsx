import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import PageMeta from "@/components/PageMeta";

/**
 * E2E-ish test: when an article is rendered with noindex=true and a canonical_url,
 * the document <head> must contain:
 *   - <meta name="robots" content="noindex, follow">
 *   - <link rel="canonical" href="<canonical_url>">  (NOT the current URL)
 *
 * This guards the M1 fix that propagates `articles.canonical_url` from the DB
 * down to the rendered <head> so Google can transfer authority on noindex pages.
 */

const renderArticleHead = (props: { canonical?: string; noindex?: boolean; path?: string }) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[props.path ?? "/actualites/house-sitting-lyon"]}>
        <PageMeta
          title="House-sitting à Lyon"
          description="Test description for noindex/canonical propagation."
          path={props.path ?? "/actualites/house-sitting-lyon"}
          type="article"
          noindex={props.noindex ?? false}
          canonical={props.canonical}
        />
      </MemoryRouter>
    </HelmetProvider>,
  );

const getRobots = () =>
  document.head.querySelector('meta[name="robots"]')?.getAttribute("content");
const getCanonical = () =>
  document.head.querySelector('link[rel="canonical"]')?.getAttribute("href");

describe("ArticleDetail head — noindex + canonical propagation", () => {
  afterEach(() => {
    cleanup();
    document.head.querySelectorAll("[data-page-meta]").forEach((n) => n.remove());
  });

  it("emits 'noindex, follow' and the article-supplied canonical when noindex=true", async () => {
    renderArticleHead({
      noindex: true,
      canonical: "https://guardiens.fr/house-sitting/lyon",
      path: "/actualites/house-sitting-lyon",
    });

    await waitFor(() => {
      expect(getRobots()).toBe("noindex, follow");
    });

    expect(getCanonical()).toBe("https://guardiens.fr/house-sitting/lyon");
    // Sanity: canonical must NOT self-point to the noindexed URL
    expect(getCanonical()).not.toContain("/actualites/house-sitting-lyon");
  });

  it("emits 'index, follow' and self-canonical when no canonical override is provided", async () => {
    renderArticleHead({
      noindex: false,
      canonical: undefined,
      path: "/actualites/house-sitting-lyon",
    });

    await waitFor(() => {
      expect(getRobots()).toBe("index, follow");
    });

    expect(getCanonical()).toBe("https://guardiens.fr/actualites/house-sitting-lyon");
  });

  it("normalizes the canonical (trims whitespace, drops trailing slash)", async () => {
    renderArticleHead({
      noindex: true,
      canonical: "  https://guardiens.fr/house-sitting/annecy/  ",
    });

    await waitFor(() => {
      expect(getCanonical()).toBe("https://guardiens.fr/house-sitting/annecy");
    });
  });
});
