/**
 * Lot M2 (12/10/2026) : sorties sans titre du formulaire de coup de main.
 * Constat (base, 14 jours) : 43 sorties sans titre ; 16 depuis la barre basse
 * d'un gardien, 14 juste après l'inscription par une intention périmée.
 */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { bottomNavFab, isFabHidden, SITTER_AVAILABILITY_PATH } from "@/lib/bottomNavFab";
import { previousPath, recordPath } from "@/lib/navHistory";
import { dropPublishIntentFor, readPublishIntent, rememberPublishIntent } from "@/lib/postOnboardingIntent";

describe("M2, bouton central de la barre basse", () => {
  it("gardien : ses disponibilités, partout hors entraide", () => {
    for (const path of ["/dashboard", "/search", "/sits", "/recherche-gardiens", "/mes-candidatures"]) {
      expect(bottomNavFab(path, false)).toEqual({ to: SITTER_AVAILABILITY_PATH, label: "Dispo", ariaLabel: "Mes disponibilités", icon: "availability" });
    }
  });
  it("entraide : coup de main pour tous les rôles", () => {
    expect(bottomNavFab("/petites-missions", false).to).toBe("/petites-missions/creer");
    expect(bottomNavFab("/petites-missions", true).to).toBe("/petites-missions/creer");
  });
  it("propriétaire : publier une annonce de garde, inchangé", () => {
    expect(bottomNavFab("/dashboard", true)).toEqual({ to: "/sits/create", label: "Publier", ariaLabel: "Publier", icon: "plus" });
    expect(bottomNavFab("/sits", true).to).toBe("/sits/create");
  });
  it("règle d'affichage inchangée", () => {
    expect(isFabHidden("/profile")).toBe(true);
    expect(isFabHidden("/dashboard")).toBe(false);
  });
  it("le profil gardien ouvre l'interrupteur « Je suis disponible »", () => {
    expect(SITTER_AVAILABILITY_PATH).toBe("/profile?focus=availability");
    const src = readFileSync("src/pages/SitterProfile.tsx", "utf8");
    expect(src).toContain('focus === "availability"');
    expect(src).toContain('document.getElementById("is-available-switch")');
    expect(readFileSync("src/components/profile/StepSitterProfile.tsx", "utf8")).toContain('id="is-available-switch"');
  });
});

describe("M2, intention de publication", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it("un formulaire quitté vide fait tomber son intention, et elle seule", () => {
    rememberPublishIntent("/petites-missions/creer?titre=x");
    dropPublishIntentFor("/petites-missions/creer");
    expect(readPublishIntent()).toBeNull();
    rememberPublishIntent("/sits/create");
    dropPublishIntentFor("/petites-missions/creer");
    expect(readPublishIntent()).toBe("/sits/create");
  });
  it("le formulaire ne la fait tomber que sans titre ni description", () => {
    const src = readFileSync("src/pages/CreateSmallMission.tsx", "utf8");
    expect(src).toContain('if (titleLen === 0 && descLenRef.current === 0) dropPublishIntentFor("/petites-missions/creer");');
  });
});

describe("M2, page d'origine", () => {
  beforeEach(() => { sessionStorage.clear(); });
  it("garde les deux dernières pages, sans doublon", () => {
    recordPath("/search");
    recordPath("/search");
    recordPath("/petites-missions/creer");
    expect(previousPath("/petites-missions/creer")).toBe("/search");
    expect(previousPath("/ailleurs")).toBe("/petites-missions/creer");
  });
  it("ouverture et sortie du formulaire portent la page d'origine", () => {
    const src = readFileSync("src/pages/CreateSmallMission.tsx", "utf8");
    expect(src).toContain('metadata: { type: missionType, from, prefilled: !!prefill.title }');
    expect(src).toContain("title_len: titleLen, from }");
    expect(readFileSync("src/components/analytics/PageViewTracker.tsx", "utf8")).toContain("recordPath(path);");
  });
});
