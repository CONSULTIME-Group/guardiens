import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ArticleRenderer, { OWNER_GUIDE_ARTICLE_SLUGS } from "@/components/articles/ArticleRenderer";
import { parseFaqFromMarkdown } from "@/lib/parseFaq";

describe.each([...OWNER_GUIDE_ARTICLE_SLUGS])("Guide %s, parcours propriétaire", (slug) => {
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
    expect(container.querySelector("h2[id]")).not.toBeNull();
    for (const anchor of container.querySelectorAll('a[href^="#"]')) {
      const target = anchor.getAttribute("href")!.slice(1);
      expect([...container.querySelectorAll("[id]")].some(element => element.id === target), `${slug} #${target}`).toBe(true);
    }
  });
});

it.each([
  ["veterinaire-urgence-annecy-haute-savoie", 6],
  ["veterinaire-urgence-grenoble-isere", 6],
  ["garde-animaux-savoie-guide", 7],
  ["house-sitting-haute-savoie-annecy-megeve", 6],
  ["house-sitting-auvergne-rhone-alpes", 6],
  ["house-sitting-ete-aura-guide", 6],
  ["pet-sitting-lyon-guide-complet", 6],
  ["pet-sitting-lyon-ouest-lyonnais", 6],
  ["garde-animaux-croix-rousse-lyon", 6],
  ["garde-chat-presquile-lyon", 6],
  ["ou-faire-garder-chien-lyon-vacances", 6],
  ["garde-chat-domicile-lyon", 6],
  ["confier-sa-maison-absence-risques", 6],
  ["s-absenter-avec-animal-guide-solutions-2026", 6],
  ["garde-animaux-domicile-chien-chat", 7],
  ["bien-etre-animal-pendant-absence", 6],
  ["accueillir-gardien-bonnes-pratiques", 6],
  ["checklist-partir-vacances-animaux", 6],
  ["gerer-imprevu-pendant-garde", 7],
  ["faire-garder-animal-pendant-hospitalisation", 6],
  ["securite-confiance-house-sitting", 7],
  ["commodat-garde-guardiens", 6],
  ["garde-chien-faire-garder-son-chien", 7],
  ["garde-chat-domicile-house-sitting", 6],
  ["rediger-bonne-annonce-house-sitting", 5],
  ["preparer-maison-avant-garde", 5],
  ["house-sitting-noel-fetes-fin-annee", 6],
  ["house-sitting-week-end-court-sejour-aura", 5],
  ["house-sitting-hiver-montagne-savoie", 6],
  ["entretenir-jardin-pendant-absence", 6],
  ["arroser-plantes-pendant-vacances-guide", 6],
  ["securiser-maison-absence-prolongee", 6],
  ["francais-etranger-garde-maison-france", 6],
  ["echange-reciproque-garde-maison-expatries", 6],
] as const)("FAQ visible et structurée cohérente pour %s", (slug, questionCount) => {
  const content = readFileSync(`docs/editorial/${slug}.md`, "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  const faq = parseFaqFromMarkdown(content);
  const { container } = render(<ArticleRenderer content={content} slug={slug} />);
  expect(faq).toHaveLength(questionCount);
  expect([...container.querySelectorAll(".article-faq-question")].map(element => element.textContent)).toEqual(faq.map(item => item.question));
  expect(container.querySelectorAll("h2#faq")).toHaveLength(1);
  expect(container.querySelector(".article-faq-heading")).toBeNull();
});

it.each([
  ["veterinaire-urgence-annecy-haute-savoie", ["+33450222424", "+33450600900", "+33458173232"]],
  ["veterinaire-urgence-grenoble-isere", ["+33480423323", "+33458173232"]],
] as const)("les contacts de %s restent directement appelables après rendu", (slug, phones) => {
  const content = readFileSync(`docs/editorial/${slug}.md`, "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  const { container } = render(<ArticleRenderer content={content} slug={slug} />);
  expect(container.querySelector("h2")?.id).toBe("contacts");
  for (const phone of phones) expect(container.querySelector(`a[href="tel:${phone}"]`)).not.toBeNull();
});
