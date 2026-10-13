/**
 * Lot X2 (13/10/2026) : liens morts, porte des projets, espace propriétaire.
 *
 * E-01 : /devenir-home-sitter menait à /auth et /gardes (404, 17 vues en 30 jours).
 * E-03 : CityPage envoyait role=guardian, valeur ignorée par l'inscription.
 * C-13 : /projets restait soumis à la porte d'affinité.
 * A-02 : un compte gardien qui enregistre une annonce ne la retrouvait nulle part.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { isGateAlwaysOpenPath } from "@/lib/onboardingGateRules";
import { ensureOwnerSpace, needsOwnerSpace } from "@/lib/ownerSpace";

describe("X2, liens réparés", () => {
  it("DevenirHomeSitter mène à l'inscription gardien et aux annonces", () => {
    const src = readFileSync("src/pages/DevenirHomeSitter.tsx", "utf8");
    expect(src).toContain('<Link to="/inscription?role=sitter">');
    expect(src).toContain('<Link to="/annonces">');
    expect(src).not.toContain('to="/auth?role=sitter"');
    expect(src).not.toContain('to="/gardes"');
    expect(src).not.toContain("phase de lancement");
  });
  it("les anciens liens diffusés sont redirigés", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toContain('<Route path="/auth" element={<RegisterRedirect />} />');
    expect(app).toContain('<Route path="/gardes" element={<Navigate to="/annonces" replace />} />');
  });
  it("CityPage envoie un rôle reconnu", () => {
    const src = readFileSync("src/pages/CityPage.tsx", "utf8");
    expect(src).toContain("/inscription?role=sitter");
    expect(src).not.toContain("role=guardian");
  });
});

describe("X2, projets hors de la porte d'affinité", () => {
  it("page projet et publication", () => {
    expect(isGateAlwaysOpenPath("/projets")).toBe(true);
    expect(isGateAlwaysOpenPath("/projets/jardin-partage-croix-rousse")).toBe(true);
    expect(isGateAlwaysOpenPath("/projetsx")).toBe(false);
  });
});

describe("X2, espace propriétaire pour un gardien qui enregistre une annonce", () => {
  beforeEach(() => rpc.mockReset());

  it("seul un compte gardien est concerné", () => {
    expect(needsOwnerSpace("sitter")).toBe(true);
    expect(needsOwnerSpace("both")).toBe(false);
    expect(needsOwnerSpace("owner")).toBe(false);
    expect(needsOwnerSpace(undefined)).toBe(false);
  });

  it("passe en double rôle puis bascule sur l'espace propriétaire", async () => {
    rpc.mockResolvedValue({ error: null });
    const refreshProfile = vi.fn(async () => {});
    const switchRole = vi.fn();
    expect(await ensureOwnerSpace({ userId: "u1", role: "sitter", refreshProfile, switchRole })).toBe(true);
    expect(rpc).toHaveBeenCalledWith("change_user_role", { p_user_id: "u1", p_new_role: "both" });
    expect(refreshProfile).toHaveBeenCalled();
    expect(switchRole).toHaveBeenCalledWith("owner");
  });

  it("un refus laisse l'annonce enregistrée, sans bascule", async () => {
    rpc.mockResolvedValue({ error: { message: "refus" } });
    const switchRole = vi.fn();
    expect(await ensureOwnerSpace({ userId: "u1", role: "sitter", refreshProfile: async () => {}, switchRole })).toBe(false);
    expect(switchRole).not.toHaveBeenCalled();
  });

  it("câblé au premier brouillon et à la publication", () => {
    const src = readFileSync("src/pages/CreateSit.tsx", "utf8");
    expect(src.match(/grantOwnerSpace\(\);/g)?.length).toBe(2);
    expect(src).toContain('import { ensureOwnerSpace, needsOwnerSpace } from "@/lib/ownerSpace";');
  });
});
