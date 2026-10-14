/**
 * Lot Z2 (14/10/2026) : verrou statique de la migration de finitions
 * (droits, gardes réalisées, dates d'une garde confirmée, crons). La CI n'a
 * pas accès à la base ; les contrôles en base sont inscrits, commentés, à la
 * fin du fichier SQL.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const FILE = "supabase/prepared-migrations/20261014100000_z2_finitions.sql";
const raw = readFileSync(FILE, "utf8");
/** Le SQL exécuté, sans les commentaires de ligne. */
const sql = raw.replace(/--[^\n]*/g, "");

function between(start: string, end: string): string {
  const i = sql.indexOf(start);
  expect(i, `repère absent : ${start}`).toBeGreaterThanOrEqual(0);
  const j = sql.indexOf(end, i + start.length);
  expect(j, `repère de fin absent : ${end}`).toBeGreaterThan(i);
  return sql.slice(i, j);
}

/** Fonctions réservées aux membres connectés, relevées en base le 14/10/2026. */
const MEMBER_ONLY = [
  "accept_application(uuid)",
  "accept_mission_response(uuid, boolean)",
  "admin_alma_matching_diagnosis(text, text, jsonb, uuid)",
  "admin_cron_health()",
  "admin_dashboard_snapshot()",
  "admin_get_conversation_messages(uuid)",
  "admin_get_listing_applications(uuid)",
  "admin_get_listing_conversations(uuid)",
  "admin_get_pending_deletions_count()",
  "admin_get_recent_account_deletions(integer)",
  "admin_get_recent_sit_status_changes(integer)",
  "admin_get_sits_status_counts(timestamp with time zone)",
  "admin_liquidity_snapshot()",
  "admin_projet_kpis()",
  "admin_release_projet(uuid)",
  "admin_sit_exit_reasons(integer)",
  "archive_sit(uuid)",
  "decline_garde_accord(uuid)",
  "filter_blocked_partners(uuid[])",
  "get_activity_since_last_visit()",
  "get_affinity_completeness_stats()",
  "get_alma_blacklisted_types()",
  "get_alma_mood(uuid, text, text, text, text)",
  "get_garde_accord_status(uuid)",
  "get_mutual_aid_funnel_metrics(integer)",
  "get_nearby_helpers(integer, double precision)",
  "get_or_create_conversation(uuid, public.conversation_context, uuid, uuid)",
  "get_owner_sits_enriched(uuid)",
  "get_signup_funnel_metrics(integer)",
  "mark_sit_applications_viewed(uuid)",
  "my_mission_meetup_tokens(uuid)",
  "notify_owner_of_new_application(uuid)",
  "patch_my_email_preferences(boolean, boolean, boolean, boolean, boolean, boolean, integer)",
  "profile_completion_missing(uuid, text)",
  "reopen_application(uuid)",
  "report_contact_details_attempt(text, text[], text)",
  "report_mission_content_signal(uuid, text, jsonb)",
  "signal_sit_publish_error(uuid, text, text)",
  "sitter_missing_opportunities(uuid)",
  "unpublish_sit(uuid, text)",
  "upsert_my_email_preferences(boolean, boolean, boolean, boolean, boolean, integer, text, text)",
  "upsert_my_email_preferences(boolean, boolean, boolean, boolean, boolean, integer)",
];

/** Appelées par des écrans visiteurs ou des vues publiques : jamais fermées ici. */
const VISITOR = [
  "get_public_sit",
  "search_sitter_pool",
  "search_sitter_pool_mobile",
  "search_sitter_country_counts",
  "can_view_restricted_profile",
  "log_client_error",
  "increment_small_mission_view",
  "link_referral",
  "count_mission_notification_audience",
];

describe("Z2, forme du fichier", () => {
  it("contient les blocs Z2.1 à Z2.5", () => {
    for (let k = 1; k <= 5; k++) expect(raw).toContain(`-- Z2.${k}.`);
  });

  it("aucun accès au coffre de secrets, aucun tiret cadratin ni demi-cadratin", () => {
    expect(raw.toLowerCase()).not.toContain("vault");
    expect(raw).not.toMatch(new RegExp("[\\u2013\\u2014]"));
  });

  it("chaque REVOKE nomme PUBLIC, anon et authenticated", () => {
    const revokes = [...sql.matchAll(/REVOKE[^;]+;/g)].map((m) => m[0]);
    expect(revokes.length).toBe(MEMBER_ONLY.length + 3);
    for (const r of revokes) expect(r).toMatch(/FROM PUBLIC, anon, authenticated;$/);
  });

  it("aucun GRANT à anon ou PUBLIC", () => {
    const grants = [...sql.matchAll(/GRANT[^;]+;/g)].map((m) => m[0]);
    for (const g of grants) {
      expect(g).toMatch(/TO (authenticated, )?service_role;$/);
      expect(g).not.toMatch(/\b(anon|PUBLIC)\b/);
    }
  });

  it("rejouable : DROP ... IF EXISTS avant chaque CREATE TRIGGER ou CREATE FUNCTION", () => {
    for (const [, name] of sql.matchAll(/CREATE TRIGGER\s+(\w+)/g)) {
      expect(sql).toMatch(new RegExp(`DROP TRIGGER IF EXISTS ${name} ON`));
    }
    for (const [, name] of sql.matchAll(/CREATE FUNCTION\s+public\.(\w+)\(/g)) {
      expect(sql).toContain(`DROP FUNCTION IF EXISTS public.${name}(`);
    }
  });

  it("aucune écriture de ligne hors des corps de fonction", () => {
    const outside = sql.replace(/\$function\$[\s\S]*?\$function\$/g, "");
    expect(outside).not.toMatch(/^\s*(UPDATE|DELETE FROM|INSERT INTO)\b/m);
  });

  it("contrôles commentés en fin de fichier", () => {
    const tail = raw.slice(raw.indexOf("-- Z2.5."));
    expect(tail).toContain("doit renvoyer 0 ligne");
    expect(tail.split("\n").every((l) => l.trim() === "" || l.startsWith("--"))).toBe(true);
    expect((tail.match(/-- SELECT /g) ?? []).length).toBeGreaterThanOrEqual(6);
  });
});

describe("Z2.1, droits des fonctions réservées aux membres", () => {
  const block = between("REVOKE EXECUTE ON FUNCTION public.accept_application", "DROP FUNCTION IF EXISTS public.get_my_applications");

  it("chaque fonction passe à authenticated et service_role", () => {
    for (const sig of MEMBER_ONLY) {
      expect(block).toContain(`REVOKE EXECUTE ON FUNCTION public.${sig} FROM PUBLIC, anon, authenticated;`);
      expect(block).toContain(`GRANT EXECUTE ON FUNCTION public.${sig} TO authenticated, service_role;`);
    }
    expect(new Set(MEMBER_ONLY).size).toBe(42);
  });

  it("freeze_seasonal_cohorts au seul service_role", () => {
    expect(block).toContain("REVOKE EXECUTE ON FUNCTION public.freeze_seasonal_cohorts(text, integer) FROM PUBLIC, anon, authenticated;");
    expect(block).toContain("GRANT EXECUTE ON FUNCTION public.freeze_seasonal_cohorts(text, integer) TO service_role;");
  });

  it("les fonctions des écrans visiteurs restent ouvertes", () => {
    for (const fn of VISITOR) expect(sql).not.toMatch(new RegExp(`FUNCTION public\\.${fn}\\(`));
  });
});

describe("Z2.2, get_my_applications expose sit_reviewable", () => {
  const fn = between("CREATE FUNCTION public.get_my_applications()", "$function$;");

  it("garde l'ordre des colonnes et ajoute sit_reviewable à la fin", () => {
    expect(fn).toContain(
      "RETURNS TABLE(application_id uuid, status application_status, created_at timestamp with time zone, viewed_at timestamp with time zone, sit_id uuid, sit_status sit_status, sit_title text, sit_start_date date, sit_end_date date, sit_city text, owner_id uuid, cover_photo text, content_visible boolean, sit_cancelled_by_me boolean, sit_reviewable boolean)",
    );
    expect(fn).toMatch(/a\.status = 'cancelled'::application_status\),\s*public\.sit_is_reviewable\(s\.id\)\s*FROM applications a/);
    expect(fn).toContain("WHERE a.sitter_id = auth.uid()");
  });

  it("DROP puis CREATE, mêmes droits", () => {
    expect(sql.indexOf("DROP FUNCTION IF EXISTS public.get_my_applications();")).toBeLessThan(
      sql.indexOf("CREATE FUNCTION public.get_my_applications()"),
    );
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.get_my_applications() TO authenticated, service_role;");
  });
});

describe("Z2.3, dates d'une garde confirmée", () => {
  const fn = between("CREATE OR REPLACE FUNCTION public.notify_sitter_on_sit_dates_change()", "$function$;");
  const trg = between("CREATE TRIGGER trg_notify_sitter_on_sit_dates_change", ";");

  it("trigger sur les dates d'une annonce qui reste confirmée ou en cours", () => {
    expect(trg).toContain("AFTER UPDATE OF start_date, end_date ON public.sits");
    expect(trg).toContain("OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.end_date IS DISTINCT FROM NEW.end_date");
    expect(trg).toContain("OLD.status IN ('confirmed'::sit_status, 'in_progress'::sit_status)");
    expect(trg).toContain("NEW.status IN ('confirmed'::sit_status, 'in_progress'::sit_status)");
  });

  it("notification sit_dates_changed au gardien retenu, dates JJ/MM/AAAA, une seule non lue", () => {
    expect(fn).toContain("a.status = 'accepted'::application_status");
    expect(fn).toContain("'sit_dates_changed'");
    expect(fn).toContain("v_link text := '/sits/' || NEW.id::text;");
    expect(fn).toContain("to_char(NEW.start_date, 'DD/MM/YYYY')");
    expect(fn).toContain("to_char(NEW.end_date, 'DD/MM/YYYY')");
    expect(fn).toMatch(/DELETE FROM public\.notifications n\s+WHERE n\.user_id = v_sitter\s+AND n\.type = 'sit_dates_changed'\s+AND n\.read_at IS NULL/);
  });

  it("message système dans la conversation du couple propriétaire et gardien retenu", () => {
    expect(fn).toContain("c.owner_id = NEW.user_id");
    expect(fn).toContain("c.sitter_id = v_sitter");
    expect(fn).toMatch(/INSERT INTO public\.messages \(conversation_id, sender_id, content, is_system, metadata\)/);
    expect(fn).toMatch(/true,\s*jsonb_build_object\(\s*'actor', 'proprio',\s*'action', 'sit_dates_changed'/);
    expect(fn).toContain("IF v_conv IS NOT NULL THEN");
  });

  it("le changement de dates passe même si une écriture échoue", () => {
    expect((fn.match(/EXCEPTION WHEN OTHERS THEN\s+RAISE WARNING/g) ?? []).length).toBe(2);
  });

  it("sit_date_changes reste écrite par trg_log_sit_date_change seul", () => {
    expect(sql).not.toContain("sit_date_changes");
    expect(raw).toContain("trg_log_sit_date_change");
  });
});

describe("Z2.4, crons", () => {
  it("aucune déprogrammation : les quatre fonctions sont déployées et répondent", () => {
    expect(sql).not.toContain("cron.unschedule");
    const block = raw.slice(raw.indexOf("-- Z2.4."), raw.indexOf("-- Z2.5."));
    for (const job of [
      "nudge-suspicious-accounts",
      "nudge-repeated-cancellations",
      "nudge-repeated-republished-sits",
      "nudge-dormant-top-sitters",
    ]) {
      expect(block).toContain(job);
    }
    expect(block).toContain("cron_run_log");
  });
});
