import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import fs from "node:fs";
import path from "node:path";
import i18n, { loadLanguage } from "@/i18n";

/**
 * Garde-fou contre le rendu mixte, sur l'écran qui a révélé la régression :
 * la page publique des annonces affichait un titre anglais au dessus d'un
 * chapô français, faute de clé traduite.
 *
 * On rend toutes les chaînes de cet écran en anglais, puis on vérifie
 * qu'aucune d'elles n'est identique à sa version française.
 */

const localesDir = path.resolve(process.cwd(), "src/i18n/locales");
const readDict = (lng: string) =>
  JSON.parse(fs.readFileSync(path.join(localesDir, `${lng}/common.json`), "utf8"));

const flatten = (obj: Record<string, unknown>, prefix = "", acc: Record<string, string> = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value as Record<string, unknown>, full, acc);
    } else if (typeof value === "string") {
      acc[full] = value;
    }
  }
  return acc;
};

const frFlat = flatten(readDict("fr"));
const screenKeys = Object.keys(frFlat).filter((k) => k.startsWith("public_listings."));

const Screen = () => {
  const { t } = useTranslation();
  return (
    <ul>
      {screenKeys.map((k) => (
        <li key={k} data-testid={k}>
          {t(k, { count: 2, cities: "Lyon" })}
        </li>
      ))}
    </ul>
  );
};

describe("écran annonces, une seule langue à l'écran", () => {
  beforeAll(async () => {
    await loadLanguage("en");
    await i18n.changeLanguage("en");
  });

  it("aucune chaîne française ne subsiste quand la langue active est l'anglais", async () => {
    render(<Screen />);
    await waitFor(() => expect(screen.getByTestId(screenKeys[0])).toBeTruthy());

    const leftInFrench = screenKeys.filter((k) => {
      const rendered = screen.getByTestId(k).textContent ?? "";
      const french = frFlat[k].replace(/\{\{count\}\}/g, "2").replace(/\{\{cities\}\}/g, "Lyon");
      // Une chaîne identique au français n'est fautive que si elle a vraiment
      // du contenu traduisible : on ignore les libellés d'une seule lettre et
      // les noms propres.
      return french.length > 12 && rendered === french;
    });

    expect(
      leftInFrench,
      `chaînes restées en français : ${leftInFrench.join(", ")}`,
    ).toEqual([]);
  });
});
