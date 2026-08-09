import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { isFabHidden } from "@/lib/bottomNavFab";

/**
 * Garde fou du lot 3 :
 *  1. le bouton flottant central ne doit jamais être rendu sur une route
 *     portant déjà une action primaire ou une barre d'action collante,
 *  2. aucun écran ne doit afficher deux éléments de retour sous 768 px.
 */

const EXCLUDED_ROUTES = [
  "/sits/create",
  "/sits/abc-123/edit",
  "/petites-missions/creer",
  "/questions/nouvelle",
  "/profile",
  "/onboarding/affinity",
  "/pros/inscription",
  "/review/abc-123",
  "/annonces/abc-123",
  "/sits/abc-123",
  "/petites-missions/abc-123",
  "/gardiens/abc-123",
  "/pros/mon-pro",
  "/settings",
  "/mon-abonnement",
];

const KEPT_ROUTES = [
  "/dashboard",
  "/annonces",
  "/sits",
  "/search",
  "/petites-missions",
  "/favoris",
  "/messages",
  "/",
];

describe("bouton flottant, règle unique", () => {
  it.each(EXCLUDED_ROUTES)("masque le bouton flottant sur %s", (route) => {
    expect(isFabHidden(route)).toBe(true);
  });

  it.each(KEPT_ROUTES)("garde le bouton flottant sur %s", (route) => {
    expect(isFabHidden(route)).toBe(false);
  });

  it("rend le bouton flottant conditionnel dans la barre basse", () => {
    const nav = fs.readFileSync(path.resolve("src/components/layout/Navigation.tsx"), "utf8");
    expect(nav).toContain("isFabHidden");
    expect(nav).toContain("{!fabHidden && (");
  });
});

describe("un seul retour visible sous 768 px", () => {
  const files = [
    "src/pages/CreateSit.tsx",
    "src/pages/EditSit.tsx",
    "src/pages/HouseGuide.tsx",
    "src/pages/LeaveReview.tsx",
  ];

  it.each(files)("%s ne rend aucun retour de page en mobile", (file) => {
    const src = fs.readFileSync(path.resolve(file), "utf8");
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      if (!/ArrowLeft className/.test(line)) return;
      if (!/Retour/.test(line)) return;
      const context = lines.slice(Math.max(0, i - 12), i + 1).join("\n");
      expect(context, `${file}:${i + 1}`).toMatch(/hidden md:inline-flex/);
    });
  });

  it("le fil de messagerie retire la barre supérieure applicative", () => {
    const src = fs.readFileSync(path.resolve("src/pages/Messages.tsx"), "utf8");
    expect(src).toContain("useHideTopBar(isMobile && !!activeConv)");
    const layout = fs.readFileSync(path.resolve("src/components/layout/AppLayout.tsx"), "utf8");
    expect(layout).toContain("{!topBarHidden && <AppTopBar />}");
  });
});
