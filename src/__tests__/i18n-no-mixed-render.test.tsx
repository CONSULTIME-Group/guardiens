import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

/**
 * Complétude du dictionnaire français pour l'écran annonces : chaque clé
 * public_listings.* utilisée par SearchPage doit résoudre une vraie chaîne
 * (jamais la clé elle-même, jamais une chaîne vide). Avant le 17/08/2026 ce
 * test vérifiait l'absence de rendu mixte entre langues ; il n'existe plus
 * qu'une seule langue, le risque résiduel est le trou de dictionnaire.
 */
const screenKeys = [
  "public_listings.title",
  "public_listings.subtitle",
  "public_listings.search_placeholder",
  "public_listings.local_guides",
  "public_listings.results_count",
  "public_listings.results_empty",
  "public_listings.filters_open",
  "public_listings.reset_filters",
  "public_listings.sort_label",
  "public_listings.sort_relevance",
  "public_listings.sort_date",
  "public_listings.sort_duration",
  "public_listings.sort_animals",
  "public_listings.view_list",
  "public_listings.view_map",
  "public_listings.load_error",
  "public_listings.retry",
] as const;

const Screen = () => {
  const { t } = useTranslation();
  return (
    <div>
      {screenKeys.map((k) => (
        <span key={k} data-testid={k}>
          {t(k)}
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
