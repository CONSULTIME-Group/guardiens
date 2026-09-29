import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { almaDirectAnswer, almaHelpDirective, detectAlmaIntent, detectFrustration } from "../../supabase/functions/_shared/alma-intent";
import { SIGNAL_TYPES, hasDestination } from "../../supabase/functions/_shared/admin-signal-config";
import { buildDigestLines } from "../../supabase/functions/alert-admin-signals/digest";
import { isPublishPath, rememberPublishIntent, resolvePostOnboardingTarget, clearPublishIntent, readPublishIntent } from "@/lib/postOnboardingIntent";

const M1 = "je ne pose pas ma candidature je cherche au contraire de l'aide !!!";
const M2 = "inadapté; j'ai 15 chevaux et poneys";
const M3 = "bon je vais en rester là";
const BANNED = /[\u2014\u2013]|gratuit|voisin|point|score|aboy|facteur/i;

describe("Lot J1, Alma : les trois messages réels du 28/09", () => {
  it("message 1 : aide recherchée et frustration, chemins directs et contact", () => {
    const i = detectAlmaIntent(M1);
    expect(i.helpSeeking && i.frustration).toBe(true);
    const a = almaDirectAnswer(i)!;
    expect(a).toContain("/petites-missions/creer");
    expect(a).toContain("/sits/create");
    expect(a).toContain("/contact");
    expect(a).not.toMatch(BANNED);
  });
  it("message 2 : « inadapté » + 15 chevaux, besoin légitime", () => {
    const i = detectAlmaIntent(M2, [M1]);
    expect(i.frustration && i.helpSeeking && i.largeAnimals).toBe(true);
    const a = almaDirectAnswer(i)!;
    expect(a).toContain("Chevaux, poneys");
    expect(a).not.toMatch(BANNED);
  });
  it("message 3 : départ, contact humain proposé", () => {
    const i = detectAlmaIntent(M3, [M1, M2]);
    expect(i.leaving).toBe(true);
    const a = almaDirectAnswer(i)!;
    expect(a).toContain("Jérémie et Elisa");
    expect(a).toContain("/contact");
    expect(a).not.toMatch(BANNED);
  });
  it("aide sans frustration : consigne pour le modèle, sans score", () => {
    const i = detectAlmaIntent("J'ai besoin de quelqu'un pour garder mes chevaux");
    expect(almaDirectAnswer(i)).toBeNull();
    const d = almaHelpDirective(i)!;
    expect(d).toContain("/petites-missions/creer");
    expect(d).toMatch(/Ne parle ni de score/);
  });
  it("question ordinaire : aucune intervention", () => {
    const i = detectAlmaIntent("Comment fonctionne la vérification d'identité ?");
    expect(almaDirectAnswer(i)).toBeNull();
    expect(almaHelpDirective(i)).toBeNull();
  });
  it("détecteur : accents, casse, ?? et majuscules", () => {
    expect(detectFrustration("INADAPTÉ")).not.toEqual([]);
    expect(detectFrustration("vraiment ??")).toContain("??");
    expect(detectFrustration("CA NE MARCHE PAS DU TOUT")).toContain("majuscules");
  });
});

describe("Lot J1, signal alma_frustration", () => {
  it("configuration unique : critique, email quotidien et file d'actions", () => {
    const c = SIGNAL_TYPES.alma_frustration;
    expect(c.defaultSeverity).toBe("critical");
    expect(hasDestination("alma_frustration", "daily_email")).toBe(true);
    expect(hasDestination("alma_frustration", "action_queue")).toBe(true);
    expect(c.autoResolve).toBe(false);
  });
  it("email : lien vers la fiche membre et messages cités", () => {
    const lines = buildDigestLines([{
      id: "s", signal_type: "alma_frustration", severity: "critical", entity_type: "profile", entity_id: "e",
      detected_at: new Date().toISOString(),
      metadata: { title: "Paul, Lyon (both)", admin_url: "https://guardiens.fr/admin/users?user=u1", messages: [{ text: M1 }, { text: M3 }] },
    } as any], new Map());
    expect(lines[0].link).toBe("https://guardiens.fr/admin/users?user=u1");
    expect(lines[0].action).toContain(M3);
  });
});

describe("Lot J1, intention de publication", () => {
  beforeEach(() => clearPublishIntent());
  it("routes de publication reconnues", () => {
    expect(isPublishPath("/petites-missions/creer?type=besoin")).toBe(true);
    expect(isPublishPath("/sits/create")).toBe(true);
    expect(isPublishPath("/sits")).toBe(false);
  });
  it("la publication en attente passe devant /profile et /sits, pas devant une vraie cible", () => {
    rememberPublishIntent("/petites-missions/creer");
    expect(resolvePostOnboardingTarget("/profile", "/dashboard")).toBe("/petites-missions/creer");
    expect(resolvePostOnboardingTarget(null, "/sits")).toBe("/petites-missions/creer");
    expect(resolvePostOnboardingTarget("/sits/abc", "/dashboard")).toBe("/sits/abc");
  });
  it("expire après 24 h", () => {
    rememberPublishIntent("/sits/create", 0);
    expect(readPublishIntent(25 * 3600 * 1000)).toBeNull();
  });
  it("câblage : garde, confirmation, onboarding, formulaire", () => {
    const gate = readFileSync("src/components/onboarding/OnboardingGate.tsx", "utf8");
    expect(gate).toContain("isPublishPath(path)");
    expect(readFileSync("src/pages/AuthConfirm.tsx", "utf8")).toContain("rememberPublishIntent(next)");
    expect(readFileSync("src/pages/OnboardingAffinity.tsx", "utf8")).toContain("resolvePostOnboardingTarget(");
    const modal = readFileSync("src/components/onboarding/OnboardingModal.tsx", "utf8");
    expect(modal).not.toContain('completeOnboarding("/sits")');
    expect(modal).toContain("completeOnboarding(publishIntent)");
    const composer = readFileSync("src/pages/CreateSmallMission.tsx", "utf8");
    expect(composer).toContain("const showCompletionNudge = false");
  });
});
