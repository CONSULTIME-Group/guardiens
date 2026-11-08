// Lot PUB3 : défauts relevés par la recette navigateur du 08/11/2026
// (compte propriétaire de test, Android 360 × 664, Lyon puis Concepción).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { shouldFinishWithExistingSession } from "@/pages/AuthConfirm";
import { hasInAppHistory, BACK_FALLBACK_PATH } from "@/lib/backNavigation";
import { getSitPublishBlockers, buildSitPublishInput } from "@/lib/sitPublishRules";
import { getSitPublishBlockers as sharedBlockers } from "../../../supabase/functions/_shared/sit-publish-rules";
import { localTodayIso } from "@/lib/localDate";
import { ownerActiveEmptyState } from "@/lib/ownerSitsEmptyState";

describe("bienvenue : le bouton principal reste visible sur téléphone", () => {
  const src = readFileSync("src/pages/arrival/Bienvenue.tsx", "utf8");
  it("masque la barre basse, qui recouvrait le bouton fixé en bas d'écran", () => {
    expect(src).toMatch(/useHideBottomNav\(true\)/);
  });
});

describe("confirmation de l'email : aucune attente de 15 secondes", () => {
  it("aboutit avec la session déjà ouverte quand le lien ne porte pas de jeton à vérifier", () => {
    expect(shouldFinishWithExistingSession({ tokenHash: null, hash: "" })).toBe(true);
    expect(shouldFinishWithExistingSession({ tokenHash: null, hash: "access_token=x&type=signup" })).toBe(true);
  });
  it("laisse la vérification décider pour un lien à jeton", () => {
    expect(shouldFinishWithExistingSession({ tokenHash: "abc", hash: "" })).toBe(false);
  });
  it("garde l'écran d'erreur pour un lien expiré", () => {
    expect(shouldFinishWithExistingSession({ tokenHash: null, hash: "error=access_denied&error_code=otp_expired" })).toBe(false);
  });
  it("lit la session au montage, en plus de l'événement", () => {
    const src = readFileSync("src/pages/AuthConfirm.tsx", "utf8");
    expect(src).toMatch(/shouldFinishWithExistingSession\(\{ tokenHash, hash: rawHash \}\)/);
    expect(src).toMatch(/if \(finished\) return;/);
  });
});

describe("Retour sur une page ouverte depuis un email", () => {
  it("reste dans le site quand l'onglet n'a pas de page précédente", () => {
    expect(hasInAppHistory({ idx: 0, key: "default" })).toBe(false);
    expect(hasInAppHistory(null)).toBe(false);
    expect(hasInAppHistory({ idx: 3 })).toBe(true);
    expect(BACK_FALLBACK_PATH).toBe("/dashboard");
  });
  it("le bouton de la barre haute applique cette règle", () => {
    const src = readFileSync("src/components/layout/BackButton.tsx", "utf8");
    expect(src).toMatch(/hasInAppHistory\(\) \? navigate\(-1\) : navigate\(BACK_FALLBACK_PATH/);
  });
});

describe("date du jour : même verdict sur tous les écrans du site", () => {
  // 7 novembre 2026, 21 h à Papeete (UTC-10) = 8 novembre 7 h UTC.
  const evening = new Date(2026, 10, 7, 21, 0, 0);
  const today = localTodayIso(evening);
  const input = buildSitPublishInput({
    sit: { title: "Garde à Papeete", start_date: today, end_date: "2026-11-20", cover_photo_url: "x.jpg" },
    overrides: { locationCity: "Papeete", specificExpectations: "x".repeat(40), petCount: 1 },
  } as Parameters<typeof buildSitPublishInput>[0]);
  it("une garde qui commence aujourd'hui n'est pas « passée » quand l'écran donne la date de l'appareil", () => {
    expect(getSitPublishBlockers(input, { today }).some((b) => b.id === "date-past")).toBe(false);
    // Sans date donnée, la règle partagée compare à l'UTC : le 8 novembre la refuserait.
    expect(sharedBlockers(input, { today: "2026-11-08" }).some((b) => b.id === "date-past")).toBe(true);
  });
  it("Mes annonces, la fiche et l'édition passent par l'enveloppe du site", () => {
    const wrapper = readFileSync("src/lib/sitPublishRules.ts", "utf8");
    expect(wrapper).toMatch(/today: options\?\.today \?\? localTodayIso\(\)/);
    for (const f of ["src/pages/Sits.tsx", "src/pages/EditSit.tsx", "src/components/sits/views/OwnerSitView.tsx"]) {
      expect(readFileSync(f, "utf8")).toMatch(/from "@\/lib\/sitPublishRules"/);
    }
  });
});

describe("Mes annonces vide : un premier brouillon n'est pas un historique", () => {
  it("parle du brouillon à reprendre", () => {
    const s = ownerActiveEmptyState([{ status: "draft", published_at: null }]);
    expect(s.description).not.toMatch(/historique|Republiez/);
    expect(s.description).toMatch(/brouillon/);
  });
  it("garde l'historique pour les annonces déjà publiées", () => {
    const s = ownerActiveEmptyState([{ status: "completed", published_at: "2026-06-01" }, { status: "draft", published_at: null }]);
    expect(s.description).toMatch(/1 annonce dans votre historique/);
  });
  it("premier passage sans rien", () => {
    expect(ownerActiveEmptyState([]).actionLabel).toBe("Publier une annonce");
  });
});
