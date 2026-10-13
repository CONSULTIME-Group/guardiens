/**
 * Lot X1 (13/10/2026) : quatre parcours débloqués (audit complet du 13/10).
 *
 * A-01 : rôle propriétaire jamais appliqué à l'inscription Google.
 * B-01 : retrait de candidature refusé au gardien.
 * C-01 : besoin illisible pour l'aidant dès qu'il passe en cours.
 * D-01 : retrait d'un espace refusé depuis les réglages.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/prepared-migrations/20261013100000_x1_parcours_debloques.sql", "utf8");
const block = (start: string, end: string) => sql.slice(sql.indexOf(start), sql.indexOf(end));

describe("X1, A-01 : apply_signup_role", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.apply_signup_role", "-- 2. B-01 ---");
  it("pose le drapeau interne juste avant l'écriture du rôle", () => {
    const flag = fn.indexOf("set_config('app.allow_internal_profile_update', 'on', true)");
    const update = fn.indexOf("UPDATE public.profiles SET role = p_role");
    expect(flag).toBeGreaterThan(0);
    expect(update).toBeGreaterThan(flag);
  });
  it("garde les deux protections : rôle en métadonnées, profil de moins de 30 minutes", () => {
    expect(fn).toContain("IF _meta_role IN ('owner','sitter','both') THEN");
    expect(fn).toContain("_created < now() - interval '30 minutes'");
    expect(fn.indexOf("interval '30 minutes'")).toBeLessThan(fn.indexOf("set_config"));
  });
});

describe("X1, B-01 : retrait de candidature", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.applications_guard_status_update", "-- 3. C-01 ---");
  it("le gardien lui-même retire une candidature avant décision", () => {
    expect(fn).toContain("NEW.status = 'cancelled'::application_status");
    expect(fn).toMatch(/OLD\.status IN \('pending'::application_status, 'viewed'::application_status, 'discussing'::application_status\)/);
    expect(fn).toContain("auth.uid() = OLD.sitter_id");
  });
  it("une candidature acceptée reste du ressort de l'annulation de garde", () => {
    const allow = fn.slice(fn.indexOf("Lot X1"), fn.indexOf("IF NEW.status IS DISTINCT FROM OLD.status"));
    expect(allow).not.toContain("'accepted'");
  });
  it("le contrôle propriétaire reste en place pour tout le reste", () => {
    expect(fn).toContain("RAISE EXCEPTION 'Only the sit owner can change application status'");
  });
});

describe("X1, C-01 : lecture du besoin par les personnes qui ont proposé leur aide", () => {
  it("fonction SECURITY DEFINER, retraits exclus, fermée aux anonymes", () => {
    const fn = block("CREATE OR REPLACE FUNCTION public.is_mission_responder", "DROP POLICY IF EXISTS");
    expect(fn).toContain("SECURITY DEFINER");
    expect(fn).toContain("r.status <> 'withdrawn'::small_mission_response_status");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.is_mission_responder(uuid, uuid) FROM PUBLIC, anon;");
  });
  it("politique de lecture ajoutée, sans toucher aux autres", () => {
    expect(sql).toMatch(/CREATE POLICY "Responders can read missions they answered"\s+ON public\.small_missions\s+FOR SELECT\s+TO authenticated\s+USING \(public\.is_mission_responder\(id, auth\.uid\(\)\)\);/);
    expect(sql).not.toMatch(/DROP POLICY IF EXISTS "Authenticated can read open or own missions"/);
  });
});

describe("X1, D-01 : retrait d'un espace", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.deactivate_my_space", "REVOKE ALL ON FUNCTION public.deactivate_my_space");
  it("réservé à un compte double rôle, pour lui-même", () => {
    expect(fn).toContain("v_uid uuid := auth.uid()");
    expect(fn).toContain("IF v_role IS DISTINCT FROM 'both'::user_role THEN");
    expect(fn).toContain("UPDATE public.profiles SET role = p_keep WHERE id = v_uid;");
  });
  it("refuse tant qu'une annonce ou une candidature est en cours", () => {
    expect(fn).toContain("ACTIVE_SITS");
    expect(fn).toContain("ACTIVE_APPLICATIONS");
    expect(fn.indexOf("ACTIVE_APPLICATIONS")).toBeLessThan(fn.indexOf("set_config"));
  });
  it("les réglages appellent la fonction, plus d'écriture directe du rôle", () => {
    const src = readFileSync("src/components/settings/ActiveRolesSection.tsx", "utf8");
    expect(src).toContain('supabase.rpc("deactivate_my_space"');
    expect(src).not.toMatch(/update\(\{ role: newRole \}/);
    expect(src).not.toMatch(/abonnement/i);
  });
});
