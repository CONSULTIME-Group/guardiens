/**
 * Lot Z2, audit B-12 (13/10/2026) : la barre du haut et la barre fixe mobile
 * de la fiche gardien suivent la même règle. Un double rôle en espace
 * propriétaire lit « Passer en espace gardien pour postuler » sur tous les
 * écrans, et une garde non publiée n'a plus de barre mobile.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SWITCH_TO_SITTER_LABEL, sitApplySurface } from "@/lib/sitApplySurface";

const VIEW = readFileSync("src/components/sits/views/SitterSitView.tsx", "utf8");

describe("B-12, règle pure", () => {
  it("espace gardien, annonce publiée : les deux barres de candidature", () => {
    expect(sitApplySurface({ activeRole: "sitter", userRole: "sitter", sitStatus: "published" })).toBe("apply");
    expect(sitApplySurface({ activeRole: "sitter", userRole: "both", sitStatus: "published" })).toBe("apply");
  });

  it("double rôle en espace propriétaire : bascule vers l'espace gardien", () => {
    expect(sitApplySurface({ activeRole: "owner", userRole: "both", sitStatus: "published" })).toBe("switch_space");
  });

  it("propriétaire seul : aucune barre, sur ordinateur comme sur mobile", () => {
    expect(sitApplySurface({ activeRole: "owner", userRole: "owner", sitStatus: "published" })).toBe("none");
  });

  it.each(["confirmed", "in_progress", "completed", "archived", "expired", "cancelled", "draft"])(
    "annonce %s : aucune barre de candidature",
    (status) => {
      expect(sitApplySurface({ activeRole: "sitter", userRole: "sitter", sitStatus: status })).toBe("none");
      expect(sitApplySurface({ activeRole: "owner", userRole: "both", sitStatus: status })).toBe("none");
    },
  );

  it("libellé positif, sans tiret", () => {
    expect(SWITCH_TO_SITTER_LABEL).toBe("Passer en espace gardien pour postuler");
    expect(SWITCH_TO_SITTER_LABEL).not.toMatch(/[–—]/);
  });
});

describe("B-12, branchement dans SitterSitView", () => {
  it("la barre du haut lit la règle partagée", () => {
    expect(VIEW).toContain('{applySurface === "apply" && (() => {');
    expect(VIEW).not.toContain('{activeRole === "sitter" && sit.status === "published" && (() => {');
  });

  it("la barre fixe mobile est montée selon la même règle", () => {
    const i = VIEW.indexOf("<SitMobileStickyApply");
    expect(i).toBeGreaterThan(0);
    expect(VIEW.slice(Math.max(0, i - 200), i)).toContain('{applySurface === "apply" && (');
  });

  it("la bascule passe par switchRole, comme ?espace=gardien", () => {
    expect(VIEW).toContain('{applySurface === "switch_space" && (');
    expect(VIEW).toContain('switchRole("sitter")');
    expect(VIEW).toContain("{SWITCH_TO_SITTER_LABEL}");
  });
});
