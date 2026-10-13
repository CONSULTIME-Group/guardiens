/**
 * Lot Y2, verrou des droits : aucune nouvelle fonction SECURITY DEFINER qui
 * renvoie une adresse email sans REVOKE explicite à anon et authenticated
 * dans le même fichier de migration.
 *
 * La CI n'a pas accès à la base : le verrou est statique. Le contrôle en
 * base équivalent (à lancer après chaque migration) est inscrit, commenté,
 * à la fin de supabase/prepared-migrations/20261013200100_y2_droits.sql.
 */
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { scanRepository, scanSql } from "./securityDefinerEmail";

/**
 * Expositions historiques, relevées le 13/10/2026. Toutes sont fermées en
 * production (droits relus en base : aucune n'est exécutable par anon ou
 * authenticated sans contrôle d'appelant, ou la migration Y2 la corrige).
 * Cette liste ne s'allonge jamais : une nouvelle migration doit porter son
 * propre REVOKE ... FROM PUBLIC, anon, authenticated.
 */
const HISTORICAL: ReadonlyArray<string> = [
  "supabase/migrations/20260405223930_d5dd9973-7eb3-4ad2-9608-70a8cc8d8400.sql::get_user_emails_admin",
  "supabase/migrations/20260503160355_b7787dd3-b0cf-4f3f-9168-cbd0467097b7.sql::find_duplicate_gmail_account",
  "supabase/migrations/20260509053909_fedebd7f-9de7-4fcb-8695-82fac2ac40ad.sql::admin_get_signup_confirmations",
  "supabase/migrations/20260509054818_888706bc-48c8-458d-9afa-a6ff6544e8f4.sql::find_available_sitters_for_nudge",
  "supabase/migrations/20260509093958_7d256ae9-bb03-4b9d-94b9-6bb9b3503c7b.sql::get_email_preferences_by_email",
  "supabase/migrations/20260711235817_6d3c4877-feb8-4cdd-9222-be577ee2c2bd.sql::detect_dormant_sitters",
  "supabase/migrations/20260711235817_6d3c4877-feb8-4cdd-9222-be577ee2c2bd.sql::detect_stale_verifications",
  "supabase/migrations/20260711235817_6d3c4877-feb8-4cdd-9222-be577ee2c2bd.sql::detect_affinity_stale",
  "supabase/migrations/20260712075240_668af65a-7c59-442b-89cc-3c5f856fa344.sql::detect_suspicious_accounts",
  "supabase/migrations/20260716062916_bf98c097-089d-4383-839a-cae87c84c6bf.sql::detect_pending_applications",
  "supabase/migrations/20260720122632_821d05d6-aa51-45b3-a013-5b5099d9f5fd.sql::detect_identity_orphan_documents",
  "supabase/migrations/20260726071819_774fdd1e-2c7c-4648-b2f4-800229e16fa4.sql::get_email_preferences_by_email",
  "supabase/migrations/20260728125322_84b34d87-abaa-4ccb-901a-07014ed892f7.sql::detect_pending_applications",
  "supabase/migrations/20260729155331_3c41c41d-f6be-4433-9026-a49ca97be3de.sql::detect_stale_drafts",
  "supabase/migrations/20260807071005_c2bf2fc1-015e-479b-9774-a1f8bbe0bbae.sql::detect_pending_applications",
  "supabase/migrations/20260807071005_c2bf2fc1-015e-479b-9774-a1f8bbe0bbae.sql::detect_stale_drafts",
  "supabase/migrations/20260807074630_eadeb74a-a503-4737-9ec1-e6c69a3393ea.sql::detect_pending_applications",
  "supabase/migrations/20260809111538_b0415c02-7ad4-4a8a-94a3-22059bbaf66b.sql::close_orphan_applications",
  "supabase/migrations/20260810122958_1cd45367-e5a4-4000-9ef9-43137092e60d.sql::detect_unconfirmed_sits",
  "supabase/migrations/20260810124220_7c6b62a9-451c-4b06-b1fe-88b6d4c76335.sql::close_orphan_applications",
  "supabase/migrations/20260810124300_fcffd2bd-7420-4a84-9f11-3ca3b792fa9d.sql::detect_unconfirmed_sits",
  "drizzle/migrations/0030_admin_signals_s1.sql::detect_stale_drafts",
  "drizzle/migrations/0033_admin_email_pipeline_health.sql::admin_email_pipeline_health",
];

const ROOT = process.cwd();

describe("Y2, fonctions SECURITY DEFINER qui renvoient un email", () => {
  it("aucune nouvelle migration n'expose un email sans REVOKE à anon et authenticated", () => {
    const found = scanRepository(ROOT).map((e) => `${e.file}::${e.fn}`);
    const fresh = found.filter((k) => !HISTORICAL.includes(k));
    expect(
      fresh,
      "Ajoutez REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon, authenticated dans le même fichier " +
        "(et un contrôle auth.uid() ou has_role si un GRANT rend l'accès à un membre)",
    ).toEqual([]);
  });

  it("la liste historique reste exacte (aucune entrée inventée)", () => {
    const found = new Set(scanRepository(ROOT).map((e) => `${e.file}::${e.fn}`));
    const stale = HISTORICAL.filter((k) => existsSync(k.split("::")[0]) && !found.has(k));
    expect(stale).toEqual([]);
  });

  it("la migration Y2 est conforme", () => {
    const y2 = scanRepository(ROOT).filter((e) => e.file.endsWith("20261013200100_y2_droits.sql"));
    expect(y2).toEqual([]);
  });
});

describe("Y2, analyseur", () => {
  const fn = (returns: string, extra = "", body = "SELECT email FROM public.profiles") => `
    CREATE OR REPLACE FUNCTION public.leak(p uuid)
     RETURNS ${returns}
     LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $function$ ${body} $function$;
    ${extra}`;

  it("un REVOKE FROM PUBLIC seul ne suffit pas (cause commune P3-01 à P3-03)", () => {
    const sql = fn("TABLE(user_id uuid, email text)", "REVOKE EXECUTE ON FUNCTION public.leak(uuid) FROM PUBLIC;");
    expect(scanSql("x.sql", sql).map((e) => e.reason)).toEqual(["revoke_missing"]);
  });

  it("REVOKE à PUBLIC, anon et authenticated : conforme", () => {
    const sql = fn(
      "TABLE(user_id uuid, owner_email text)",
      "REVOKE EXECUTE ON FUNCTION public.leak(uuid) FROM PUBLIC, anon, authenticated;\nGRANT EXECUTE ON FUNCTION public.leak(uuid) TO service_role;",
    );
    expect(scanSql("x.sql", sql)).toEqual([]);
  });

  it("accès rendu à authenticated sans contrôle d'appelant : refusé", () => {
    const sql = fn(
      "TABLE(canonical_email text)",
      "REVOKE ALL ON FUNCTION public.leak(uuid) FROM PUBLIC, anon, authenticated;\nGRANT EXECUTE ON FUNCTION public.leak(uuid) TO authenticated;",
    );
    expect(scanSql("x.sql", sql).map((e) => e.reason)).toEqual(["regrant_without_guard"]);
  });

  it("accès rendu à authenticated avec contrôle auth.uid() : conforme", () => {
    const sql = fn(
      "TABLE(canonical_email text)",
      "REVOKE EXECUTE ON FUNCTION public.leak(uuid) FROM PUBLIC, anon, authenticated;\nGRANT EXECUTE ON FUNCTION public.leak(uuid) TO authenticated;",
      "SELECT email FROM public.profiles WHERE id = p AND p = auth.uid()",
    );
    expect(scanSql("x.sql", sql)).toEqual([]);
  });

  it("une ligne entière de profiles compte comme un email", () => {
    expect(scanSql("x.sql", fn("SETOF public.profiles")).length).toBe(1);
  });

  it("SECURITY INVOKER, trigger, colonne sans email et commentaires : ignorés", () => {
    expect(scanSql("x.sql", fn("TABLE(user_id uuid, first_name text)"))).toEqual([]);
    expect(scanSql("x.sql", fn("trigger"))).toEqual([]);
    expect(
      scanSql("x.sql", "CREATE FUNCTION public.f() RETURNS TABLE(email text) LANGUAGE sql AS $$ SELECT ''::text $$;"),
    ).toEqual([]);
    expect(scanSql("x.sql", `-- ${fn("TABLE(email text)").replace(/\n/g, " ")}`)).toEqual([]);
  });

  it("style ancien : SECURITY DEFINER après le corps", () => {
    const sql = "CREATE FUNCTION public.old() RETURNS TABLE(email text) AS $$ SELECT ''::text $$ LANGUAGE sql SECURITY DEFINER;";
    expect(scanSql("x.sql", sql).map((e) => e.fn)).toEqual(["old"]);
  });
});
