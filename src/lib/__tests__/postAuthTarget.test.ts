import { describe, it, expect } from "vitest";
import {
  OWNER_SIGNUP_TUNNEL_TARGET,
  resolvePostAuthTarget,
} from "../postAuthTarget";

/**
 * Tunnel post-inscription propriétaire (lot 1, 16/08/2026) : la destination
 * post-authentification d'un propriétaire est la création d'annonce, jamais
 * le tableau de bord, sauf redirection explicite.
 */
describe("resolvePostAuthTarget", () => {
  it("envoie un propriétaire vers le tunnel de création d'annonce", () => {
    expect(resolvePostAuthTarget("owner", null)).toBe(OWNER_SIGNUP_TUNNEL_TARGET);
    expect(OWNER_SIGNUP_TUNNEL_TARGET).toBe("/sits/create?source=signup");
  });

  it("garde le tableau de bord pour gardien, both et rôle inconnu", () => {
    expect(resolvePostAuthTarget("sitter", null)).toBe("/dashboard");
    expect(resolvePostAuthTarget("both", null)).toBe("/dashboard");
    expect(resolvePostAuthTarget(null, null)).toBe("/dashboard");
  });

  it("envoie toujours un pro vers sa fiche dédiée", () => {
    expect(resolvePostAuthTarget("pro", null)).toBe("/pros/inscription");
    expect(resolvePostAuthTarget("pro", "/gardiens/abc")).toBe("/pros/inscription");
  });

  it("respecte une redirection explicite, prioritaire sur le tunnel", () => {
    expect(resolvePostAuthTarget("owner", "/gardiens/abc-123")).toBe("/gardiens/abc-123");
    expect(resolvePostAuthTarget("sitter", "/annonces/xyz")).toBe("/annonces/xyz");
  });
});
