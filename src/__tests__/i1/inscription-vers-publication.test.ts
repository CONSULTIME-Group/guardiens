/**
 * Lot I1 (12/10/2026) : de l'inscription à la publication, sans mur.
 *
 * Mesures du 12/10/2026 :
 * - 69 nouveaux comptes bloqués à l'entrée de /sits/create en 30 jours,
 *   36 partis, dont 11 arrêtés précisément sur la photo ;
 * - 5 inscriptions Google sur 16 comptes à 0 % (09 au 12/10) arrivées pour
 *   publier, enregistrées « gardien » faute d'intention détectée ;
 * - 18 profils sous-évalués : prénom et code postal remplis, pourcentage figé.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { detectSignupIntent, roleForSignupIntent, signupIntentBannerKey } from "@/lib/signupIntent";
import { resolveSetupState } from "@/lib/setupState";

describe("I1, intention de publication à l'inscription", () => {
  it("/sits/create donne l'intention propriétaire", () => {
    expect(detectSignupIntent("/sits/create")).toBe("owner");
    expect(detectSignupIntent("/sits/create?source=signup")).toBe("owner");
    expect(roleForSignupIntent(detectSignupIntent("/sits/create"))).toBe("owner");
  });

  it("les autres chemins de /sits gardent leur comportement", () => {
    expect(detectSignupIntent("/sits")).toBeNull();
    expect(detectSignupIntent("/sits/abc")).toBeNull();
  });

  it("un rôle explicite gagne toujours", () => {
    expect(detectSignupIntent("/sits/create", "sitter")).toBeNull();
  });

  it("bandeau dédié à la publication", () => {
    expect(signupIntentBannerKey("owner", "/sits/create")).toBe("owner_publish");
    expect(signupIntentBannerKey("owner", "/gardiens/x")).toBe("owner");
    const fr = JSON.parse(readFileSync("src/i18n/locales/fr/common.json", "utf8"));
    expect(fr.register_page.intent_banner.owner_publish).toBe("Encore un pas, et vous pourrez publier votre annonce de garde.");
  });
});

describe("I1, photo demandée avant la publication, plus à l'entrée", () => {
  it("prénom, code postal et logement suffisent pour entrer", () => {
    const s = resolveSetupState({
      loading: false, hasProperty: true, hasPets: false, hasPhoto: true,
      hasIdentity: true, entered: true, dismissed: false, voluntary: false,
    });
    expect(s.canContinue).toBe(true);
    expect(s.missingIds).toEqual([]);
  });

  it("le formulaire ne fait plus de la photo un prérequis d'entrée", () => {
    const src = readFileSync("src/pages/CreateSit.tsx", "utf8");
    const call = src.slice(src.indexOf("const setupState = resolveSetupState({"), src.indexOf("const preflightMissing"));
    expect(call).toMatch(/hasPhoto: true,/);
  });

  it("la photo reste exigée à la publication, avec envoi sur place à l'étape 3", () => {
    const rules = readFileSync("src/lib/sitPublishRules.ts", "utf8");
    expect(rules).toContain('id: "photo"');
    const src = readFileSync("src/pages/CreateSit.tsx", "utf8");
    expect(src).toContain("<InlinePhotoUpload");
  });
});

describe("I1, pourcentage recalculé au prénom et au lieu", () => {
  const sql = readFileSync("supabase/prepared-migrations/20261012230000_i1_completion_prenom_lieu.sql", "utf8");
  it("le déclencheur suit prénom, code postal, ville et pays", () => {
    for (const col of ["first_name", "postal_code", "city", "country", "avatar_url", "bio", "identity_verified", "role"]) {
      expect(sql, col).toContain(`OLD.${col} IS DISTINCT FROM NEW.${col}`);
    }
    expect(sql).not.toContain("OLD.profile_completion");
  });
  it("rattrapage limité aux profils dont la valeur diffère du barème", () => {
    expect(sql).toMatch(/profile_completion IS DISTINCT FROM/);
    expect(sql).toContain("PERFORM public.calculate_profile_completion(r.id)");
  });
});
