import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { REFUSED_PASSWORD_MESSAGE, isSignupCooldown, mapAuthError } from "@/lib/authErrorMessages";
import { mapSignupError } from "@/lib/analytics";

const register = readFileSync("src/pages/Register.tsx", "utf8");

describe("INS-1, échecs d'inscription", () => {
  it("reconnaît le second envoi dans la minute", () => {
    expect(isSignupCooldown("For security purposes, you can only request this after 27 seconds.")).toBe(true);
    expect(isSignupCooldown("For security purposes, you can only request this after 1 second.")).toBe(true);
    expect(isSignupCooldown("User already registered")).toBe(false);
    expect(mapSignupError("For security purposes, you can only request this after 5 seconds.")).toBe("rate_limited");
  });
  it("ouvre l'écran de confirmation sur un second envoi", () => {
    const i = register.indexOf("if (isSignupCooldown(rawMessage))");
    expect(i).toBeGreaterThan(0);
    expect(register.slice(i, i + 400)).toContain('setStep("confirmation")');
  });
  it("dit quoi faire quand le mot de passe est refusé et propose un mot de passe", () => {
    expect(mapAuthError({ message: "Password is known to be weak and easy to guess, please choose a different one." }).code).toBe("weak_password");
    expect(REFUSED_PASSWORD_MESSAGE).toContain("liste de mots de passe divulgués");
    expect(register).toContain("setFormError(REFUSED_PASSWORD_MESSAGE)");
    expect(register).toContain('data-testid="signup-suggest-after-refusal"');
    expect(register).toContain("Utiliser un mot de passe proposé");
  });
});
