/**
 * Lot LET1 (08/11/2026) : la lettre des fondateurs ouverte depuis la cloche
 * porte deux actions, partager Guardiens et laisser un avis rapide, sans
 * couverture de repli ni blocs d'inscription génériques.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import ArticleRenderer from "@/components/articles/ArticleRenderer";
import { FEEDBACK_SUBJECT, SHARE_MESSAGE, SHARE_URL, facebookShareUrl } from "@/components/news/FoundersLetterActions";
import { FOUNDERS_LETTER_SLUG } from "@/data/foundersLetter";

describe("lettre des fondateurs", () => {
  it("aucun bloc d'inscription générique dans le texte", () => {
    const md = "Bonjour\n\n## Un\n\ntexte\n\n## Deux\n\ntexte\n\n## Trois\n\ntexte";
    const { container } = render(<ArticleRenderer content={md} slug={FOUNDERS_LETTER_SLUG} />);
    expect(container.querySelector("[data-article-cta]")).toBeNull();
    expect(container.textContent).not.toContain("Créer mon profil propriétaire");
  });
  it("les autres articles gardent leurs blocs", () => {
    const md = "Bonjour\n\n## Un\n\ntexte";
    const { container } = render(<ArticleRenderer content={md} slug="un-autre-article" />);
    expect(container.querySelector("[data-article-cta]")).not.toBeNull();
  });
  it("partage Facebook vers l'accueil, message prêt à coller", () => {
    expect(facebookShareUrl()).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(SHARE_URL),
    );
    expect(SHARE_MESSAGE).toContain("gratuit");
    expect(SHARE_MESSAGE).toContain("https://guardiens.fr");
    expect(SHARE_MESSAGE).not.toMatch(/[–—]/);
  });
  it("l'avis arrive dans la messagerie de contact avec un sujet reconnaissable", () => {
    const src = readFileSync("src/components/news/FoundersLetterActions.tsx", "utf8");
    expect(src).toContain('from("contact_messages").insert');
    expect(FEEDBACK_SUBJECT).toBe("Mon avis (lettre des fondateurs)");
  });
  it("pas de couverture de repli sur la lettre", () => {
    const src = readFileSync("src/pages/ArticleDetail.tsx", "utf8");
    expect(src).toContain("article.slug === FOUNDERS_LETTER_SLUG ? null");
    expect(src).toContain("{article.slug === FOUNDERS_LETTER_SLUG && <FoundersLetterActions />}");
  });
});
