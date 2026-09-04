/**
 * Verrous du badge public de réactivité.
 *
 * Ce que ce test protège :
 *  - les seuils SQL (5 contacts minimum, taux >= 70 pourcent, médiane < 72 h),
 *  - l'absence totale d'affichage quand aucun palier n'est renvoyé,
 *  - l'absence de chiffre brut, de pourcentage et de tournure négative.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import fs from "node:fs";
import path from "node:path";
import ResponsivenessBadge, {
  RESPONSIVENESS_LABELS,
  responsivenessLabel,
} from "@/components/profile/ResponsivenessBadge";

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/profile/ResponsivenessBadge.tsx",
);

const migrationSql = (): string => {
  const dir = path.resolve(process.cwd(), "supabase/migrations");
  return fs
    .readdirSync(dir)
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
    .filter((sql) => sql.includes("CREATE VIEW public.public_responsiveness"))
    .join("\n");
};

describe("Badge de réactivité, affichage", () => {
  it("n'affiche rien sans palier", () => {
    const { container } = render(<ResponsivenessBadge tier={null} />, {
      wrapper: Wrapper,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("n'affiche rien sur un palier inconnu, par exemple au-delà de 72 h", () => {
    const { container } = render(<ResponsivenessBadge tier="over_72h" />);
    expect(container).toBeEmptyDOMElement();
    expect(responsivenessLabel("over_72h")).toBeNull();
  });

  it("affiche le texte exact de chaque palier", () => {
    const expected = {
      under_1h: "Répond généralement en moins d'une heure",
      few_hours: "Répond généralement en quelques heures",
      under_1d: "Répond généralement en moins d'une journée",
      two_three_days: "Répond généralement en 2 à 3 jours",
    };
    expect(RESPONSIVENESS_LABELS).toEqual(expected);
    render(<ResponsivenessBadge tier="under_1h" />);
    expect(screen.getByText(expected.under_1h)).toBeTruthy();
  });
});

describe("Badge de réactivité, contenu interdit", () => {
  const source = fs.readFileSync(COMPONENT_PATH, "utf8");
  const labels = Object.values(RESPONSIVENESS_LABELS).join(" ");

  it("n'affiche aucun pourcentage ni chiffre brut", () => {
    expect(labels).not.toMatch(/%/);
    expect(labels).not.toMatch(/\d+\s*(min|minutes|h\b|heures\b)\s*de/i);
  });

  it("ne contient aucune tournure négative", () => {
    const negatives = [
      "ne répond pas",
      "répond rarement",
      "taux faible",
      "peu réactif",
      "lent",
      "aucune réponse",
    ];
    const haystack = source.toLowerCase();
    negatives.forEach((n) => expect(haystack).not.toContain(n));
  });

  it("ne contient pas de tiret cadratin ni demi-cadratin", () => {
    expect(source).not.toMatch(/[\u2014\u2013]/);
  });
});

describe("Seuils SQL verrouillés", () => {
  const sql = migrationSql();

  it("exige au moins 5 contacts qualifiants", () => {
    expect(sql).toMatch(/contacts_total\s*>=\s*5/);
  });

  it("exige un taux de réponse d'au moins 70 pourcent", () => {
    expect(sql).toMatch(/>=\s*0\.70/);
  });

  it("exclut les médianes de 72 h et plus", () => {
    expect(sql).toMatch(/median_minutes\s*<\s*4320/);
  });

  it("compte les candidatures orphelines dans le dénominateur", () => {
    expect(sql).toContain("orphan_apps");
    expect(sql).toMatch(/interval '7 days'/);
  });
});
