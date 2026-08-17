import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

/**
 * Complétude du dictionnaire français pour l'écran annonces : chaque clé
 * public_listings.* utilisée par PublicListings doit résoudre une vraie
 * chaîne (jamais la clé elle-même, jamais une chaîne vide). Avant le
 * 17/08/2026 ce test vérifiait l'absence de rendu mixte entre langues ; il
 * n'existe plus qu'une seule langue, le risque résiduel est le trou de
 * dictionnaire. La liste reflète les clés réellement appelées par
 * `src/pages/PublicListings.tsx`, y compris les clés pluralisées
 * (résolues en _one/_other par i18next via `count`).
 */
const screenKeys = [
  "public_listings.meta_title",
  "public_listings.meta_description",
  "public_listings.eyebrow",
  "public_listings.eyebrow_stats",
  "public_listings.cities_count",
  "public_listings.all_france",
  "public_listings.h1",
  "public_listings.subtitle_short",
  "public_listings.see_also_missions",
  "public_listings.local_guides",
  "public_listings.pricing",
  "public_listings.intl_count",
  "public_listings.become_sitter_eyebrow",
  "public_listings.become_sitter_title",
  "public_listings.become_sitter_body",
  "public_listings.become_sitter_cta",
] as const;

const Screen = () => {
  const { t } = useTranslation();
  return (
    <div>
      {screenKeys.map((k) => (
        <span key={k} data-testid={k}>
          {t(k, { count: 2, cities: "Lyon" })}
        </span>
      ))}
    </div>
  );
};

describe("écran annonces : dictionnaire français complet", () => {
  it("chaque clé rend une chaîne non vide, différente de la clé", async () => {
    await i18n.changeLanguage("fr");
    render(<Screen />);
    const missing = screenKeys.filter((k) => {
      const rendered = screen.getByTestId(k).textContent ?? "";
      return rendered.trim() === "" || rendered === k;
    });
    expect(missing).toEqual([]);
  });
});
