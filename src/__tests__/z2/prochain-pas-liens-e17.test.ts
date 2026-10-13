/**
 * Lot Z2, audit E-17 (13/10/2026) : la carte « Votre prochain pas » du gardien
 * mène à la bonne section du profil. SitterProfile ne lit que ?section= et
 * ?focus= ; ?tab=profil et ?tab=alertes ouvraient la section par défaut.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  SITTER_POSTAL_CODE_PATH,
  SITTER_PROFILE_IDENTITY_PATH,
  sitterActionStep,
  sitterNextStep,
} from "@/lib/dashboardNextStep";

const base = {
  nextGuard: null,
  postalCode: "69005",
  hasAvatar: true,
  hasBio: true,
  identityAction: null,
  profileCompletion: 100,
} as any;

describe("E-17, liens du prochain pas gardien", () => {
  it("photo et bio : section identité", () => {
    expect(SITTER_PROFILE_IDENTITY_PATH).toBe("/profile?section=identite");
    expect(sitterNextStep({ ...base, hasAvatar: false })?.ctaTo).toBe(SITTER_PROFILE_IDENTITY_PATH);
    expect(sitterNextStep({ ...base, hasBio: false })?.ctaTo).toBe(SITTER_PROFILE_IDENTITY_PATH);
  });

  it("code postal : champ ciblé, même lien que « À faire »", () => {
    expect(SITTER_POSTAL_CODE_PATH).toBe("/profile?focus=postal_code");
    expect(sitterNextStep({ ...base, postalCode: null })?.ctaTo).toBe(SITTER_POSTAL_CODE_PATH);
    expect(readFileSync("src/components/dashboard/SitterDashboard.tsx", "utf8")).toContain('to: "/profile?focus=postal_code"');
  });

  it("repli sans touche manquante connue : section identité", () => {
    const step = sitterNextStep({ ...base, profileCompletion: 70, missing: [] });
    expect(step?.ctaTo).toBe(SITTER_PROFILE_IDENTITY_PATH);
  });

  it("lien secondaire de la carte d'action : jamais ?tab=", () => {
    const step = sitterActionStep({ nearbyListings: [], nearbyMissions: [], missing: [{ label: "Bio", points: 5 }] }) as any;
    expect(JSON.stringify(step ?? {})).not.toContain("?tab=");
  });

  it("aucun lien ?tab= dans le module, et les adresses visées sont lues par SitterProfile", () => {
    expect(readFileSync("src/lib/dashboardNextStep.ts", "utf8")).not.toMatch(/\/profile\?tab=/);
    const page = readFileSync("src/pages/SitterProfile.tsx", "utf8");
    expect(page).toContain('identite: "identity"');
    expect(page).toContain('focus === "postal_code"');
  });
});
