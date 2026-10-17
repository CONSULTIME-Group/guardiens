import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ArticleRenderer, { EXPAT_OWNER_ARTICLE_SLUG, REUNION_OWNER_ARTICLE_SLUG, TAHITI_OWNER_ARTICLE_SLUG, CALEDONIE_OWNER_ARTICLE_SLUG } from "@/components/articles/ArticleRenderer";

describe.each([EXPAT_OWNER_ARTICLE_SLUG, REUNION_OWNER_ARTICLE_SLUG, TAHITI_OWNER_ARTICLE_SLUG, CALEDONIE_OWNER_ARTICLE_SLUG])("Guide %s, parcours propriétaire", (slug) => {
  const draft = readFileSync(`docs/editorial/${slug}.md`, "utf8");
  const content = draft.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  it.each([undefined, "owner", "sitter", "both"] as const)("un seul CTA final propriétaire pour le rôle %s", (userRole) => {
    const { container } = render(<ArticleRenderer content={content} slug={slug} userRole={userRole} />);
    const links = container.querySelectorAll('a[data-article-cta="true"]');
    expect(links).toHaveLength(1);
    const link = links[0];
    expect(link.textContent).toBe("Publier mon annonce de garde");
    expect(link.getAttribute("href")).toBe(userRole ? "/sits/create" : "/inscription?role=owner&redirect=%2Fsits%2Fcreate");
    expect(link.getAttribute("data-cta-position")).toBe("end");
    expect(link.getAttribute("data-cta-role")).toBe("owner");
    expect(link.getAttribute("data-article-slug")).toBe(slug);
    expect(container.querySelector('[data-cta-block="mid"]')).toBeNull();
    expect(container.textContent?.match(/Publier mon annonce de garde/g)).toHaveLength(1);
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("h2#organisation")).not.toBeNull();
  });
});
