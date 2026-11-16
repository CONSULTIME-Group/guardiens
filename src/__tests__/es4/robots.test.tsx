/**
 * Lot ES4 (16/11/2026, conseil Entraide & sorties, « ok go je valide tout » de Jérémie) :
 * /entraide déclare un 301 à Prerender, un seul fil d'Ariane JSON-LD dans <head> même si
 * une copie figée en porte déjà un, et la photo d'une carte de besoin ne répète plus son titre.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fs from "node:fs";
import Head from "@/components/seo/Head";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";

const ldScripts = () => [...document.head.querySelectorAll('script[type="application/ld+json"]')];

describe("ES4, robots", () => {
  beforeEach(() => {
    cleanup();
    document.head.innerHTML = "";
  });

  it("/entraide : 301 vers /petites-missions déclaré à Prerender", () => {
    const app = fs.readFileSync("src/App.tsx", "utf-8");
    const block = app.slice(app.indexOf("const RedirectEntraide"), app.indexOf("const PublicOnlyRoute"));
    expect(block).toContain('target="/petites-missions"');
    expect(block).toContain("browserTarget={`/petites-missions${location.search}${location.hash}`}");
    expect(fs.readFileSync("src/components/seo/LegacyProjetRedirect.tsx", "utf-8")).toContain("statusCode={301}");
  });

  it("un fil d'Ariane figé dans <head> est remplacé, jamais doublé", () => {
    const stale = document.createElement("script");
    stale.type = "application/ld+json";
    stale.setAttribute("data-head", "head-r0");
    stale.setAttribute("data-head-key", "breadcrumb");
    stale.textContent = '{"@type":"BreadcrumbList","itemListElement":[]}';
    document.head.appendChild(stale);
    render(
      <MemoryRouter initialEntries={["/petites-missions/lyon"]}>
        <PageBreadcrumb items={[{ label: "Entraide & sorties", href: "/petites-missions" }, { label: "Lyon" }]} />
      </MemoryRouter>,
    );
    const crumbs = ldScripts().filter((s) => s.textContent?.includes("BreadcrumbList"));
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].textContent).toContain("Entraide & sorties");
  });

  it("un JSON-LD identique déjà présent n'est pas doublé", () => {
    const text = '{"@type":"FAQPage"}';
    const stale = document.createElement("script");
    stale.type = "application/ld+json";
    stale.textContent = text;
    document.head.appendChild(stale);
    render(<Head><script type="application/ld+json">{text}</script></Head>);
    expect(ldScripts().filter((s) => s.textContent === text)).toHaveLength(1);
  });

  it("un JSON-LD différent sans clé reste en place", () => {
    const other = document.createElement("script");
    other.type = "application/ld+json";
    other.textContent = '{"@type":"Organization"}';
    document.head.appendChild(other);
    render(<Head><script type="application/ld+json">{'{"@type":"FAQPage"}'}</script></Head>);
    expect(ldScripts()).toHaveLength(2);
  });

  it("carte de besoin : photo sans alt répétant le titre, portrait de l'auteur du besoin", () => {
    const cards = fs.readFileSync("src/components/entraide/EntraideCards.tsx", "utf-8");
    expect(cards).not.toContain("alt={need.title}");
    expect(cards).not.toContain("auteur de l'annonce");
    expect(cards).toContain("auteur du besoin");
  });
});
