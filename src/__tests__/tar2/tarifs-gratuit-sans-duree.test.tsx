import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * Lot TAR2 (21/11/2026, décision de Jérémie) : la gratuité se dit simplement,
 * « Guardiens est gratuit. », sans aucune mention de durée ni de contribution
 * future. Le JSON-LD FAQPage reprend exactement les questions visibles.
 */

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: () => {} }));
vi.mock("@/components/layout/PublicHeader", () => ({ default: () => null }));
vi.mock("@/components/layout/PublicFooter", () => ({ default: () => null }));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));
vi.mock("@/components/seo/PageBreadcrumb", () => ({ default: () => null }));
// Le JSON-LD est rendu dans la page du test pour être lu avec le reste.
vi.mock("@/components/seo/Head", () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="head">{children}</div>,
}));

import Pricing from "@/pages/Pricing";

function renderPricing() {
  return render(
    <MemoryRouter>
      <Pricing />
    </MemoryRouter>,
  );
}

describe("TAR2, /tarifs dit la gratuité sans durée", () => {
  it("titre principal : « Guardiens est gratuit »", () => {
    renderPricing();
    expect(screen.getByRole("heading", { level: 1 }).textContent?.trim()).toBe("Guardiens est gratuit");
  });

  it("le bloc « Et demain » et la question sur une contribution ont disparu", () => {
    renderPricing();
    expect(screen.queryByRole("heading", { name: "Et demain" })).toBeNull();
    expect(screen.queryByText(/contribution/i)).toBeNull();
    expect(screen.getByText(/Nous prenons entièrement à notre charge le fonctionnement du site/)).toBeTruthy();
  });

  it("aucun « aujourd'hui », « demain », « un jour » ni tiret long dans le texte rendu (JSON-LD compris)", () => {
    const { container } = renderPricing();
    const text = container.textContent ?? "";
    expect(text.length).toBeGreaterThan(200);
    expect(text).not.toMatch(/aujourd['\u2019]hui/i);
    expect(text).not.toMatch(/demain/i);
    expect(text).not.toMatch(/un jour/i);
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });

  it("le JSON-LD FAQPage reprend exactement les questions visibles", () => {
    const { container } = renderPricing();
    const script = container.querySelector('script[type="application/ld+json"]');
    const ld = JSON.parse(script?.textContent ?? "{}");
    expect(ld["@type"]).toBe("FAQPage");
    const ldQuestions = ld.mainEntity.map((q: { name: string }) => q.name);
    const visible = Array.from(container.querySelectorAll("[data-state] button, h3 button"))
      .map((b) => b.textContent?.trim())
      .filter(Boolean);
    expect(Array.from(new Set(visible))).toEqual(ldQuestions);
    expect(ldQuestions).not.toContain("Une contribution sera-t-elle demandée un jour ?");
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe(
      "Guardiens est gratuit, pour les propriétaires comme pour les gardiens : publier une annonce, postuler, échanger et s'entraider.",
    );
  });

  it("llms.txt présente /tarifs sans durée", () => {
    const llms = readFileSync("public/llms.txt", "utf8");
    expect(llms).toContain("- [Tarifs](/tarifs): Guardiens est gratuit.");
    expect(llms).not.toMatch(/gratuit aujourd'hui/);
    expect(llms).not.toMatch(/contribution sera demandée/);
  });
});
