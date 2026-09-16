import { describe, it, expect } from "vitest";
import {
  detectSignupIntent,
  roleForSignupIntent,
  signupIntentBannerKey,
} from "../signupIntent";

describe("detectSignupIntent", () => {
  it("déduit entraide depuis les projets et les petites missions", () => {
    expect(detectSignupIntent("/projets/publier")).toBe("entraide");
    expect(detectSignupIntent("/projets")).toBe("entraide");
    expect(detectSignupIntent("/petites-missions/creer")).toBe("entraide");
  });

  it("déduit owner et sitter comme avant", () => {
    expect(detectSignupIntent("/gardiens/x")).toBe("owner");
    expect(detectSignupIntent("/annonces/x")).toBe("sitter");
  });

  it("ne déduit rien sans redirection", () => {
    expect(detectSignupIntent(null)).toBeNull();
    expect(detectSignupIntent(undefined)).toBeNull();
    expect(detectSignupIntent("/tarifs")).toBeNull();
  });

  it("laisse toujours gagner un rôle explicite", () => {
    expect(detectSignupIntent("/projets/publier", "owner")).toBeNull();
    expect(detectSignupIntent("/gardiens/x", "both")).toBeNull();
  });
});

describe("roleForSignupIntent", () => {
  it("présélectionne le rôle polyvalent pour l'entraide", () => {
    expect(roleForSignupIntent("entraide")).toBe("both");
    expect(roleForSignupIntent("owner")).toBe("owner");
    expect(roleForSignupIntent(null)).toBeNull();
  });
});

describe("signupIntentBannerKey", () => {
  it("choisit le bandeau selon la destination", () => {
    expect(signupIntentBannerKey("entraide", "/projets/publier")).toBe("entraide_projet");
    expect(signupIntentBannerKey("entraide", "/petites-missions/creer")).toBe("entraide");
    expect(signupIntentBannerKey("entraide", "/projets")).toBe("projets");
    expect(signupIntentBannerKey("owner", "/gardiens/x")).toBe("owner");
    expect(signupIntentBannerKey(null, "/projets")).toBeNull();
  });
});
