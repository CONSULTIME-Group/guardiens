import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ArticleRenderer, { OWNER_GUIDE_ARTICLE_SLUGS, SITTER_GUIDE_ARTICLE_SLUGS, SITTER_PROFILE_GUIDE_ARTICLE_SLUGS, ENTRAIDE_GUIDE_ARTICLE_SLUGS, MIXED_GUIDE_ARTICLE_SLUGS, RESOURCE_GUIDE_ARTICLE_SLUGS, PROJECT_GUIDE_ARTICLE_SLUGS } from "@/components/articles/ArticleRenderer";
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
  ["apprendre-menuiserie-permaculture-ecoconstruction-gratuitement", 6],
  ["bengal-guide-race", 6],
  ["abandon-animaux-france-chiffres-causes", 6],
  ["temoignage-premiere-garde-auvergne", 5],
  ["voyager-gratuitement-france-house-sitting", 6],
  ["notre-histoire-pet-sitting-argentine-lyon", 3],
  ["premiers-pas-sur-guardiens", 6],
  ["comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers", 6],
  ["devenir-gardien-pro-animalier", 5],
  ["devenir-gardien-urgence-guardiens", 5],
  ["comment-devenir-home-sitter-france-guide-debutant", 6],
  ["devenir-gardien-maison-etranger", 6],
  ["creer-profil-gardien-attractif", 5],
  ["reussir-premiere-garde-house-sitting", 6],
  ["parcs-balades-chiens-annecy-guide", 5],
  ["parcs-balades-chiens-grenoble-guide", 5],
  ["meilleures-villes-vivre-chien-autour-lyon", 5],
  ["arroser-plantes-vacances-lyon", 5],
  ["arroser-plantes-vacances-annecy", 5],
  ["arroser-plantes-vacances-grenoble", 5],
  ["boom-pet-sitting-lyon-2026", 6],
  ["pet-sitting-villeurbanne", 5],
  ["pet-sitting-valence-drome", 5],
  ["pet-sitting-venissieux", 5],
  ["pet-sitting-grenoble-chartreuse", 6],
  ["pet-sitting-saint-etienne-loire", 6],
  ["house-sitting-aix-les-bains", 6],
  ["garde-ferme-animaux-monts-du-lyonnais", 6],
  ["gerer-animaux-difficiles-garde", 6],
  ["veterinaire-urgence-lyon-guide", 6],
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
  ["veterinaire-urgence-lyon-guide", ["+33472304040", "+33478742961", "+33481091840", "+33478870707"]],
  ["veterinaire-urgence-annecy-haute-savoie", ["+33450222424", "+33450600900", "+33458173232"]],
  ["veterinaire-urgence-grenoble-isere", ["+33480423323", "+33458173232"]],
] as const)("les contacts de %s restent directement appelables après rendu", (slug, phones) => {
  const content = readFileSync(`docs/editorial/${slug}.md`, "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  const { container } = render(<ArticleRenderer content={content} slug={slug} />);
  expect(container.querySelector("h2")?.id).toBe("contacts");
  for (const phone of phones) expect(container.querySelector(`a[href="tel:${phone}"]`)).not.toBeNull();
});


describe.each([...SITTER_GUIDE_ARTICLE_SLUGS])("Guide %s, parcours gardien", (slug) => {
  it.each([undefined, "owner", "sitter", "both"] as const)("une seule action finale pour le rôle %s", (userRole) => {
    const content = readFileSync(`docs/editorial/${slug}.md`, "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    const { container } = render(<ArticleRenderer content={content} slug={slug} userRole={userRole} />);
    const links = container.querySelectorAll('a[data-article-cta="true"]');
    expect(links).toHaveLength(1);
    const expectedHref = SITTER_PROFILE_GUIDE_ARTICLE_SLUGS.has(slug) ? (userRole ? "/profile" : "/inscription?role=sitter&redirect=%2Fprofile") : "/search";
    expect(links[0].getAttribute("href")).toBe(expectedHref);
    expect(links[0].getAttribute("data-cta-position")).toBe("end");
    expect(links[0].getAttribute("data-cta-role")).toBe("sitter");
    expect(container.querySelector('[data-cta-block="mid"]')).toBeNull();
    expect(container.querySelector("h1")).toBeNull();
    for (const anchor of container.querySelectorAll('a[href^="#"]')) {
      const target = anchor.getAttribute("href")!.slice(1);
      expect([...container.querySelectorAll("[id]")].some(element => element.id === target), `${slug} #${target}`).toBe(true);
    }
  });
});


describe.each([...ENTRAIDE_GUIDE_ARTICLE_SLUGS])("Guide %s, demande de coup de main", (slug) => {
  it.each([undefined, "owner", "sitter", "both"] as const)("une seule action d’entraide pour le rôle %s", (userRole) => {
    const content = readFileSync(`docs/editorial/${slug}.md`, "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    const { container } = render(<ArticleRenderer content={content} slug={slug} userRole={userRole} />);
    const links = container.querySelectorAll('a[data-article-cta="true"]');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe("Publier mon besoin d’arrosage");
    expect(links[0].getAttribute("href")).toBe(userRole ? "/petites-missions/creer" : "/inscription?redirect=%2Fpetites-missions%2Fcreer");
    expect(links[0].getAttribute("data-cta-role")).toBe("entraide");
    expect(links[0].getAttribute("data-cta-position")).toBe("end");
    expect(container.querySelector('[data-cta-block="mid"]')).toBeNull();
    expect(container.querySelector("h1")).toBeNull();
    for (const anchor of container.querySelectorAll('a[href^="#"]')) {
      const target = anchor.getAttribute("href")!.slice(1);
      expect([...container.querySelectorAll("[id]")].some(element => element.id === target), `${slug} #${target}`).toBe(true);
    }
  });
});


describe.each([...MIXED_GUIDE_ARTICLE_SLUGS])("Guide %s, choix du rôle", (slug) => {
  it.each([undefined, "owner", "sitter", "both"] as const)("deux actions distinctes en fin de page pour le rôle %s", (userRole) => {
    const content = readFileSync(`docs/editorial/${slug}.md`, "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    const { container } = render(<ArticleRenderer content={content} slug={slug} userRole={userRole} />);
    const links = container.querySelectorAll('a[data-article-cta="true"]');
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe(userRole ? "/sits/create" : "/inscription?role=owner&redirect=%2Fsits%2Fcreate");
    expect(links[1].getAttribute("href")).toBe(userRole ? "/profile" : "/inscription?role=sitter&redirect=%2Fprofile");
    expect(links[0].textContent).toBe("Publier mon annonce de garde");
    expect(links[1].textContent).toBe("Préparer mon profil gardien");
    expect([...links].map(link => link.getAttribute("data-cta-position"))).toEqual(["end", "end"]);
    expect([...links].map(link => link.getAttribute("data-cta-role"))).toEqual(["owner", "sitter"]);
    expect(container.querySelector('[data-cta-block="mid"]')).toBeNull();
    expect(container.querySelector("h1")).toBeNull();
    for (const anchor of container.querySelectorAll('a[href^="#"]')) {
      const target = anchor.getAttribute("href")!.slice(1);
      expect([...container.querySelectorAll("[id]")].some(element => element.id === target), `${slug} #${target}`).toBe(true);
    }
  });
});


describe.each([...RESOURCE_GUIDE_ARTICLE_SLUGS])("Guide %s, aide et préparation", (slug) => {
  it.each([undefined, "owner", "sitter", "both"] as const)("une ressource utile sans inscription pour le rôle %s", (userRole) => {
    const content = readFileSync(`docs/editorial/${slug}.md`, "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    const { container } = render(<ArticleRenderer content={content} slug={slug} userRole={userRole} />);
    const links = container.querySelectorAll('a[data-article-cta="true"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/actualites/faire-garder-animal-pendant-hospitalisation");
    expect(links[0].getAttribute("data-cta-role")).toBe("ressource");
    expect(links[0].getAttribute("data-cta-position")).toBe("end");
    expect(container.querySelector('[data-cta-block="mid"]')).toBeNull();
    expect(container.querySelector("h1")).toBeNull();
    for (const anchor of container.querySelectorAll('a[href^="#"]')) {
      const target = anchor.getAttribute("href")!.slice(1);
      expect([...container.querySelectorAll("[id]")].some(element => element.id === target), `${slug} #${target}`).toBe(true);
    }
  });
});


describe.each([...PROJECT_GUIDE_ARTICLE_SLUGS])("Guide %s, découverte des projets", (slug) => {
  it.each([undefined, "owner", "sitter", "both"] as const)("une action de consultation publique pour le rôle %s", (userRole) => {
    const content = readFileSync(`docs/editorial/${slug}.md`, "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    const { container } = render(<ArticleRenderer content={content} slug={slug} userRole={userRole} />);
    const links = container.querySelectorAll('a[data-article-cta="true"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/projets");
    expect(links[0].getAttribute("data-cta-role")).toBe("projet");
    expect(links[0].getAttribute("data-cta-position")).toBe("end");
    expect(container.querySelector('[data-cta-block="mid"]')).toBeNull();
    expect(container.querySelector("h1")).toBeNull();
    for (const anchor of container.querySelectorAll('a[href^="#"]')) {
      const target = anchor.getAttribute("href")!.slice(1);
      expect([...container.querySelectorAll("[id]")].some(element => element.id === target), `${slug} #${target}`).toBe(true);
    }
  });
});
