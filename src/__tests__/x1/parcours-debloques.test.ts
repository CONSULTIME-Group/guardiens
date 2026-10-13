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
  it("garde les deux protections : rôle en métadonnées, compte de moins de 30 minutes", () => {
    expect(fn).toContain("IF _meta_role IN ('owner','sitter','both') THEN");
    expect(fn).toContain("_created < now() - interval '30 minutes'");
    expect(fn.indexOf("interval '30 minutes'")).toBeLessThan(fn.indexOf("set_config"));
  });
  it("la date de création vient d'auth.users, jamais de profiles", () => {
    expect(fn).toMatch(/SELECT u\.raw_user_meta_data ->> 'role', u\.created_at\s+INTO _meta_role, _created\s+FROM auth\.users u WHERE u\.id = _uid;/);
    expect(fn).not.toContain("SELECT created_at INTO _created FROM public.profiles");
  });
  it("le drapeau est éteint juste après l'écriture", () => {
    expect(fn.indexOf("set_config('app.allow_internal_profile_update', 'off', true)")).toBeGreaterThan(fn.indexOf("UPDATE public.profiles SET role = p_role"));
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
  it("une réponse ne se crée que sur un besoin ouvert et visible", () => {
    const fn = block("CREATE OR REPLACE FUNCTION public.enforce_mission_response_open", "DROP TRIGGER IF EXISTS trg_enforce_mission_response_open");
    expect(fn).toContain("IF v_status <> 'open'::small_mission_status OR v_hidden THEN");
    expect(fn).toContain("HINT = 'mission_closed'");
    expect(sql).toMatch(/CREATE TRIGGER trg_enforce_mission_response_open\s+BEFORE INSERT ON public\.small_mission_responses/);
  });
  it("fonction sans paramètre d'identité, retraits exclus, fermée aux anonymes", () => {
    const fn = block("CREATE OR REPLACE FUNCTION public.is_mission_responder", "REVOKE ALL ON FUNCTION public.is_mission_responder");
    expect(fn).toContain("SECURITY DEFINER");
    expect(fn).toContain("r.responder_id = auth.uid()");
    expect(fn).toContain("r.status <> 'withdrawn'::small_mission_response_status");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.is_mission_responder(uuid) FROM PUBLIC, anon;");
  });
  it("politique de lecture hors masquage, sans toucher aux autres", () => {
    expect(sql).toMatch(/CREATE POLICY "Responders can read missions they answered"[\s\S]*hidden_by IS NULL\s+AND moderation_hidden_at IS NULL\s+AND public\.is_mission_responder\(id\)/);
    expect(sql).not.toMatch(/DROP POLICY IF EXISTS "Authenticated can read open or own missions"/);
  });
  it("l'écran reconnaît le refus serveur", () => {
    const src = readFileSync("src/lib/missionRespond.ts", "utf8");
    expect(src).toContain('hint === "mission_closed"');
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
    expect(fn).toContain("ACTIVE_SITTING");
    expect(fn).toContain("ACTIVE_APPLICATIONS");
    expect(fn).toContain("UPDATE public.sitter_profiles SET is_available = false WHERE user_id = v_uid;");
    expect(fn.indexOf("ACTIVE_APPLICATIONS")).toBeLessThan(fn.indexOf("set_config"));
  });
  it("les réglages appellent la fonction, plus d'écriture directe du rôle", () => {
    const src = readFileSync("src/components/settings/ActiveRolesSection.tsx", "utf8");
    expect(src).toContain('supabase.rpc("deactivate_my_space"');
    expect(src).not.toMatch(/update\(\{ role: newRole \}/);
    expect(src).not.toMatch(/abonnement/i);
  });
});
