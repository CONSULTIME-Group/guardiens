import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ArticleRenderer from "@/components/articles/ArticleRenderer";
import { labelTableForCards, MAX_CARD_COLUMNS } from "@/lib/articleTableCards";
import {
  isArticleReadingPath,
  nextReadingState,
  READING_INITIAL,
  READING_DIRECTION_PX,
} from "@/lib/alma/readingCollapse";

const TABLE3 =
  "<table><thead><tr><th>Formule</th><th>Ce qu’elle apporte</th><th>Pour quel <em>animal</em></th></tr></thead>" +
  "<tbody><tr><td>Visites</td><td>Un passage</td><td>Un chat</td></tr><tr><td>Gardien</td><td>Une présence</td><td>Un chien</td></tr></tbody></table>";

describe("ART1, tableaux en cartes", () => {
  it("pose le nom de colonne sur chaque cellule d'un tableau de 3 colonnes", () => {
    const { html, cards } = labelTableForCards(TABLE3);
    expect(cards).toBe(true);
    expect(html.match(/data-label="Formule"/g)).toHaveLength(2);
    expect(html).toContain('data-label="Pour quel animal"');
    expect(html).toContain("<thead>");
  });

  it("laisse le défilement latéral au-delà de 4 colonnes et sans en-tête", () => {
    const cols = MAX_CARD_COLUMNS + 1;
    const wide =
      "<table><thead><tr>" + Array.from({ length: cols }, (_, i) => `<th>C${i}</th>`).join("") + "</tr></thead>" +
      "<tbody><tr>" + Array.from({ length: cols }, () => "<td>x</td>").join("") + "</tr></tbody></table>";
    expect(labelTableForCards(wide).cards).toBe(false);
    expect(labelTableForCards("<table><tbody><tr><td>a</td></tr></tbody></table>").cards).toBe(false);
  });

  it("échappe les guillemets d'un en-tête", () => {
    const t = '<table><thead><tr><th>Le "point"</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>';
    expect(labelTableForCards(t).html).toContain('data-label="Le &quot;point&quot;"');
  });

  it("le rendu d'un article garde la classe et les étiquettes après nettoyage", () => {
    const md = "| Formule | Apport | Animal |\n| --- | --- | --- |\n| Visites | Un passage | Un chat |\n";
    const { container } = render(
      <MemoryRouter>
        <ArticleRenderer content={md} />
      </MemoryRouter>,
    );
    const wrap = container.querySelector(".article-table-scroll");
    expect(wrap?.classList.contains("article-table-cards")).toBe(true);
    const cells = container.querySelectorAll("td[data-label]");
    expect(Array.from(cells).map((c) => c.getAttribute("data-label"))).toEqual(["Formule", "Apport", "Animal"]);
  });

  it("la feuille de styles empile les cartes sous 640 px", () => {
    const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    const block = css.slice(css.indexOf("Lot ART1"));
    expect(block).toMatch(/@media \(max-width: 639px\)/);
    expect(block).toMatch(/content: attr\(data-label\)/);
    expect(block).toMatch(/\.article-table-hint-cards \{\s*display: none;/);
  });
});

describe("ART1, Alma en lecture", () => {
  it("ne vise que la page d'un article ou d'un guide", () => {
    expect(isArticleReadingPath("/actualites/pet-sitting-villeurbanne")).toBe(true);
    expect(isArticleReadingPath("/guides/lyon")).toBe(true);
    expect(isArticleReadingPath("/actualites")).toBe(false);
    expect(isArticleReadingPath("/actualites/page/2")).toBe(false);
    expect(isArticleReadingPath("/annonces")).toBe(false);
  });

  it("se réduit en descendant, revient en remontant, en haut et en fin de page", () => {
    const maxY = 6000;
    let s = nextReadingState(READING_INITIAL, 400, maxY);
    s = nextReadingState(s, 400 + READING_DIRECTION_PX + 1, maxY);
    expect(s.collapsed).toBe(true);
    s = nextReadingState(s, 2000, maxY);
    expect(s.collapsed).toBe(true);
    s = nextReadingState(s, 2000 - READING_DIRECTION_PX + 10, maxY);
    expect(s.collapsed).toBe(true);
    s = nextReadingState(s, 2000 - READING_DIRECTION_PX - 1, maxY);
    expect(s.collapsed).toBe(false);
    s = nextReadingState({ collapsed: true, anchor: 3000 }, 100, maxY);
    expect(s.collapsed).toBe(false);
    s = nextReadingState({ collapsed: true, anchor: 5800 }, 5900, maxY);
    expect(s.collapsed).toBe(false);
  });

  it("la pastille réduite garde la mention IA et cache nom, question et menu", () => {
    const src = readFileSync(resolve(__dirname, "../../components/ai/alma/AlmaDock.tsx"), "utf8");
    expect(src).toContain('data-testid="alma-reading-ia"');
    expect(src).toContain("{!compactDock && !readingCollapsed && (");
    expect(src).toMatch(/\{!readingCollapsed && \(\s*<DropdownMenu/);
    expect(src).toMatch(/\{!readingCollapsed && \(\s*<button/);
  });
});
