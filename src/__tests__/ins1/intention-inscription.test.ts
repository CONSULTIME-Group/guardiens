/**
 * Lot INS1 (08/11/2026) : le rôle choisi à l'inscription gagne sur
 * l'intention déduite du lien d'arrivée, pour l'intention écrite sur le
 * compte comme pour la destination après confirmation.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { arrivalIntentForSignup, signupIntentMatchesRole } from "@/lib/signupIntent";
import { isOwnerOnlyTarget, resolvePostAuthTarget } from "@/lib/postAuthTarget";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("intention écrite sur le compte", () => {
  it("arrivée par « Publier mon annonce », inscription « Je veux garder » : sitter", () => {
    expect(arrivalIntentForSignup(false, "owner", "sitter")).toBe("sitter");
  });
  it("arrivée par une annonce, inscription propriétaire : owner", () => {
    expect(arrivalIntentForSignup(false, "sitter", "owner")).toBe("owner");
  });
  it("choix explicite sans lien d'arrivée : le rôle choisi", () => {
    expect(arrivalIntentForSignup(false, null, "owner")).toBe("owner");
    expect(arrivalIntentForSignup(false, null, "sitter")).toBe("sitter");
  });
  it("polyvalent : l'intention déduite, sinon rien ; entraide garde la priorité", () => {
    expect(arrivalIntentForSignup(false, "owner", "both")).toBe("owner");
    expect(arrivalIntentForSignup(false, null, "both")).toBeNull();
    expect(arrivalIntentForSignup(true, "owner", "sitter")).toBe("entraide");
  });
  it("Register transmet le rôle choisi", () => {
    expect(read("src/pages/Register.tsx")).toContain("arrivalIntentForSignup(entraideIntent, detectedIntent, selectedRole)");
  });
});

describe("bandeau de contexte", () => {
  it("affiché tant que le rôle choisi correspond au lien, retiré sinon", () => {
    expect(signupIntentMatchesRole("owner", "owner", false)).toBe(true);
    expect(signupIntentMatchesRole("owner", "both", false)).toBe(true);
    expect(signupIntentMatchesRole("owner", "sitter", false)).toBe(false);
    expect(signupIntentMatchesRole("sitter", "owner", false)).toBe(false);
    expect(signupIntentMatchesRole("entraide", "both", true)).toBe(true);
    expect(signupIntentMatchesRole("entraide", "sitter", false)).toBe(false);
    expect(signupIntentMatchesRole(null, "owner", false)).toBe(false);
  });
  it("Register filtre le bandeau par le rôle choisi", () => {
    expect(read("src/pages/Register.tsx")).toContain("intentBannerKey && signupIntentMatchesRole(detectedIntent, selectedRole, entraideIntent)");
  });
});

describe("destination après confirmation", () => {
  it("un gardien arrivé par /sits/create va au tableau de bord, par /bienvenue en v2", () => {
    expect(resolvePostAuthTarget("sitter", "/sits/create")).toBe("/dashboard");
    expect(resolvePostAuthTarget("sitter", "/sits/create?source=hero", true)).toBe(`/bienvenue?next=${encodeURIComponent("/dashboard")}`);
  });
  it("propriétaire et polyvalent gardent la création d'annonce ; autres redirections intactes", () => {
    expect(resolvePostAuthTarget("owner", "/sits/create")).toBe("/sits/create");
    expect(resolvePostAuthTarget("both", "/sits/create")).toBe("/sits/create");
    expect(resolvePostAuthTarget("sitter", "/annonces/x")).toBe("/annonces/x");
  });
  it("seule la création d'annonce est propre au propriétaire", () => {
    expect(isOwnerOnlyTarget("/sits/create")).toBe(true);
    expect(isOwnerOnlyTarget("/sits/create?x=1")).toBe(true);
    expect(isOwnerOnlyTarget("/sits/abc")).toBe(false);
    expect(isOwnerOnlyTarget("/sits/creates")).toBe(false);
  });
});

describe("email de confirmation", () => {
  it("annonce ce que le parcours demande vraiment", () => {
    const s = read("supabase/functions/_shared/email-templates/signup.tsx");
    expect(s).toContain("un prénom, une commune, puis vos affinités");
    expect(s).not.toContain("rapport aux animaux");
    expect(s).not.toMatch(/[–—]/);
  });
});
