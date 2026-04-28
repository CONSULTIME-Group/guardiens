/**
 * Vérifie que mapAuthError produit des messages explicites et actionnables
 * pour les échecs OAuth Google les plus courants côté utilisateur :
 *  - annulation (fermeture de la fenêtre Google)
 *  - permissions / scopes refusés
 *  - popup bloquée par le navigateur
 *  - redirection interrompue / state invalide
 *  - email déjà associé à une autre méthode
 *  - provider désactivé côté serveur
 */

import { describe, it, expect } from "vitest";
import { mapAuthError } from "@/lib/authErrorMessages";

describe("mapAuthError — erreurs OAuth Google", () => {
  it("annulation utilisateur (access_denied)", () => {
    const r = mapAuthError({ code: "access_denied", message: "User denied access" });
    expect(r.code).toBe("oauth_cancelled");
    expect(r.title).toMatch(/annulée/i);
    expect(r.description).toMatch(/fenêtre Google/i);
  });

  it("annulation utilisateur (flow_state_expired)", () => {
    const r = mapAuthError({ message: "flow_state_expired: user took too long" });
    expect(r.code).toBe("oauth_cancelled");
  });

  it("permissions / scopes refusés", () => {
    const r = mapAuthError({ message: "Requested scope was denied by user" });
    expect(r.code).toBe("oauth_permissions_denied");
    expect(r.title).toMatch(/Autorisations Google/i);
    expect(r.description).toMatch(/email/i);
  });

  it("consent_required", () => {
    const r = mapAuthError({ message: "consent_required" });
    expect(r.code).toBe("oauth_permissions_denied");
  });

  it("popup bloquée par le navigateur", () => {
    const r = mapAuthError({ code: "popup_blocked", message: "Popup blocked" });
    expect(r.code).toBe("oauth_popup_blocked");
    expect(r.title).toMatch(/bloquée/i);
    expect(r.description).toMatch(/pop-?up/i);
  });

  it("popup fermée par l'utilisateur", () => {
    const r = mapAuthError({ message: "The popup was closed before completing" });
    expect(r.code).toBe("oauth_popup_blocked");
  });

  it("redirection interrompue (bad_oauth_state)", () => {
    const r = mapAuthError({ code: "bad_oauth_state", message: "OAuth state mismatch" });
    expect(r.code).toBe("oauth_redirect_interrupted");
    expect(r.title).toMatch(/interrompue/i);
    expect(r.description).toMatch(/cookies/i);
  });

  it("redirect_uri invalide", () => {
    const r = mapAuthError({ message: "Invalid redirect_uri" });
    expect(r.code).toBe("oauth_redirect_interrupted");
  });

  it("identité déjà associée à un autre mode", () => {
    const r = mapAuthError({
      code: "identity_already_exists",
      message: "Identity already exists",
    });
    expect(r.code).toBe("oauth_identity_conflict");
    expect(r.description).toMatch(/email et mot de passe/i);
  });

  it("provider désactivé côté serveur", () => {
    const r = mapAuthError({ message: "Provider is not enabled" });
    expect(r.code).toBe("oauth_provider_unavailable");
    expect(r.title).toMatch(/indisponible/i);
  });

  it("fallback inchangé pour erreur inconnue", () => {
    const r = mapAuthError({ message: "Something exotic happened" });
    expect(r.code).toBe("unknown");
  });
});
