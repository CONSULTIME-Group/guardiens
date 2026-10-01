import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ArticleRenderer from "@/components/articles/ArticleRenderer";
import HouseSittingDiagnostic, { adviceFor } from "@/components/articles/HouseSittingDiagnostic";
import { parseFaqFromMarkdown } from "@/lib/parseFaq";

const MD = `# Titre

## <a id="definition"></a>Définition

Texte avec un [lien](/tarifs).

## <a id="b"></a>B

Texte.

## <a id="c"></a>C

| a | b |
|---|---|
| 1 | 2 |

:::faq Questions fréquentes sur le house-sitting
**Question un ?**

Réponse un.

**Question deux ?**

Réponse deux.
:::

Dernier paragraphe avec [un lien éditorial](/annonces).
`;

const renderArticle = (slug: string, md = MD) =>
  render(
    <MemoryRouter>
      <ArticleRenderer content={md} slug={slug} />
    </MemoryRouter>,
  );

describe("Article guide house-sitting", () => {
  it("parseFaq accepte un titre sur la ligne d'ouverture (parité JSON-LD)", () => {
    expect(parseFaqFromMarkdown(MD).map((i) => i.question)).toEqual(["Question un ?", "Question deux ?"]);
    expect(parseFaqFromMarkdown(":::faq\n**Q ?**\n\nR.\n:::")).toHaveLength(1);
  });

  it("un seul titre FAQ, porteur de l'ancre #faq, et ancres hissées sur les h2", () => {
    const { container } = renderArticle("c-est-quoi-le-house-sitting");
    const faqHeadings = Array.from(container.querySelectorAll("h2")).filter((h) => /questions|foire/i.test(h.textContent ?? ""));
    expect(faqHeadings).toHaveLength(1);
    expect(faqHeadings[0].id).toBe("faq");
    expect(container.querySelector("h2#definition")).not.toBeNull();
    expect(container.querySelector(".article-guide")).not.toBeNull();
    expect(container.querySelector('[role="region"][aria-label]')).not.toBeNull();
  });

  it("CTA propriétaire prioritaire, gardien secondaire, tracking conservé", () => {
    const { container } = renderArticle("c-est-quoi-le-house-sitting");
    const end = container.querySelectorAll('a[data-cta-position="end"]');
    expect(end[0].textContent).toBe("Préparer mon annonce");
    expect(end[0].getAttribute("data-cta-role")).toBe("owner");
    expect(end[1].getAttribute("data-cta-role")).toBe("sitter");
    expect(end[0].getAttribute("data-article-slug")).toBe("c-est-quoi-le-house-sitting");
  });

  it("les autres articles gardent le rendu historique", () => {
    const { container } = renderArticle("autre-article", MD.replace(":::faq Questions fréquentes sur le house-sitting", ":::faq"));
    expect(container.querySelector(".article-guide")).toBeNull();
    expect(container.querySelector("h2#definition")).toBeNull();
    expect(container.querySelector(".article-faq-heading")?.textContent).toBe("Foire aux questions");
  });

  it("diagnostic : conseils prudents, sans garantie, au clavier", () => {
    render(<HouseSittingDiagnostic />);
    expect(screen.getByText(/ni un avis vétérinaire ni une garantie/)).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(6);
    fireEvent.click(radios[0]);
    expect(screen.getByText(/jamais garantie/)).toBeTruthy();
    const all = adviceFor({ presence: "oui", soins: "oui", relais: "non" }).join(" ");
    expect(all).not.toMatch(/[\u2013\u2014]|score/);
  });
});
