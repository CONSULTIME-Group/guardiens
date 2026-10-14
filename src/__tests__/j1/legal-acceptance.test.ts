import { beforeEach, describe, expect, it, vi } from "vitest";
import authSrc from "@/contexts/AuthContext.tsx?raw";
import registerSrc from "@/pages/Register.tsx?raw";
import loginSrc from "@/pages/Login.tsx?raw";
import sqlSrc from "../../../supabase/prepared-migrations/20261014120000_j1_preuve_acceptation.sql?raw";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));

import {
  LEGAL_ACCEPTANCE_KEY,
  applyPendingLegalAcceptance,
  readPendingLegalAcceptance,
  rememberLegalAcceptance,
} from "@/lib/legalAcceptance";

beforeEach(() => {
  localStorage.clear();
  rpc.mockReset();
});

describe("lot J1, source d'acceptation en attente", () => {
  it("garde la source 30 minutes, puis l'ignore", () => {
    const now = Date.now();
    rememberLegalAcceptance("signup_google", now);
    expect(readPendingLegalAcceptance(now + 29 * 60 * 1000)).toBe("signup_google");
    expect(readPendingLegalAcceptance(now + 31 * 60 * 1000)).toBeNull();
  });

  it("sans source en attente, aucun appel réseau", async () => {
    expect(await applyPendingLegalAcceptance()).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("transmet la source au serveur une seule fois", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    rememberLegalAcceptance("login_google");
    expect(await applyPendingLegalAcceptance()).toBe(true);
    expect(rpc).toHaveBeenCalledWith("record_my_legal_acceptance", { p_source: "login_google" });
    expect(localStorage.getItem(LEGAL_ACCEPTANCE_KEY)).toBeNull();
    expect(await applyPendingLegalAcceptance()).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("un refus ou une erreur serveur efface la source sans lever", async () => {
    rpc.mockRejectedValue(new Error("network"));
    rememberLegalAcceptance("signup_google");
    expect(await applyPendingLegalAcceptance()).toBe(false);
    expect(localStorage.getItem(LEGAL_ACCEPTANCE_KEY)).toBeNull();
  });
});

describe("lot J1, câblage", () => {
  it("l'inscription par email transmet la case cochée en métadonnées", () => {
    expect(authSrc).toMatch(/data:\s*\{\s*role,\s*legal_accepted:\s*LEGAL_ACCEPTED_SIGNUP\s*\}/);
  });
  it("la session transmet la source Google sans bloquer la lecture du profil", () => {
    expect(authSrc).toContain("void applyPendingLegalAcceptance()");
  });
  it("les deux boutons Google gardent la source", () => {
    expect(registerSrc).toContain('rememberLegalAcceptance("signup_google")');
    expect(loginSrc).toContain('rememberLegalAcceptance("login_google")');
  });
  it("la mention Google de /login cite les trois textes acceptés", () => {
    expect(loginSrc).toContain('to="/cgu"');
    expect(loginSrc).toContain('to="/cgs"');
    expect(loginSrc).toContain('to="/confidentialite"');
  });
});

describe("lot J1, SQL", () => {
  it("le site lit sa trace sans pouvoir l'écrire", () => {
    expect(sqlSrc).toContain("REVOKE ALL ON public.legal_acceptances FROM PUBLIC, anon, authenticated;");
    expect(sqlSrc).toContain("GRANT SELECT ON public.legal_acceptances TO authenticated;");
  });
  it("une inscription ne peut pas échouer à cause du trigger", () => {
    expect(sqlSrc).toMatch(/record_legal_acceptance_on_signup[\s\S]*EXCEPTION WHEN others THEN[\s\S]*RETURN NEW;/);
  });
  it("Google ne vaut acceptation que pour un compte de moins de 30 minutes", () => {
    expect(sqlSrc).toContain("interval '30 minutes'");
  });
});
