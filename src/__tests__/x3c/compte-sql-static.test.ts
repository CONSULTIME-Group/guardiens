/**
 * Lot X3c : lecture statique de la migration préparée
 * supabase/prepared-migrations/20261013140200_x3c_compte_mecanique.sql
 * et du blocage d'adresse à l'effacement.
 * D-06 : levée du motif account_deleted à l'inscription confirmée.
 * D-08 : public_profiles et public_helpers suivent les réglages de confidentialité.
 * D-09 : un compte suspendu ne publie, ne candidate ni n'écrit.
 * E-08 : déprogrammation des crons orphelins, préparée et commentée.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const SQL = read("supabase/prepared-migrations/20261013140200_x3c_compte_mecanique.sql");

/** Lignes SQL actives (commentaires retirés). */
const ACTIVE = SQL.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

const block = (start: string, end: string) => {
  const i = ACTIVE.indexOf(start);
  const j = ACTIVE.indexOf(end, i + start.length);
  expect(i, start).toBeGreaterThanOrEqual(0);
  return ACTIVE.slice(i, j === -1 ? undefined : j);
};

describe("D-06 · réinscription après effacement", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.lift_erasure_suppression_on_signup", "$function$;");

  it("lève seulement le motif account_deleted", () => {
    expect(fn).toMatch(/DELETE FROM public\.suppressed_emails[\s\S]*reason = 'account_deleted'/);
    expect(fn).not.toMatch(/'bounce'|'complaint'/);
    // R5 : 'unsubscribe' n'apparaît que comme motif rendu, jamais comme motif levé.
    expect(fn.match(/'unsubscribe'/g)?.length).toBe(1);
    expect(fn).toContain("SET reason = 'unsubscribe',");
  });

  it("R5 : une adresse désinscrite retrouve son motif unsubscribe avant toute levée", () => {
    const restore = fn.indexOf("FROM public.email_unsubscribe_tokens t");
    const del = fn.indexOf("DELETE FROM public.suppressed_emails");
    expect(restore).toBeGreaterThan(0);
    expect(del).toBeGreaterThan(restore);
    expect(fn).toContain("t.used_at IS NOT NULL");
    expect(fn).toContain("jsonb_build_object('restored_from', 'account_deleted', 'restored_at', now())");
    expect(fn).toMatch(/WHERE lower\(email\) = lower\(trim\(NEW\.email\)\) AND reason = 'account_deleted';\s+RETURN NEW;\s+END IF;/);
  });

  it("attend une adresse confirmée et ignore un compte effacé ou banni", () => {
    expect(fn).toContain("NEW.email_confirmed_at IS NULL");
    expect(fn).toContain("NEW.banned_until > now()");
    expect(fn).toContain("raw_user_meta_data ->> 'deleted'");
  });

  it("ne fait jamais échouer une inscription", () => {
    expect(fn).toContain("EXCEPTION WHEN others THEN");
  });

  it("se déclenche à la création et à la confirmation dans auth.users", () => {
    expect(ACTIVE).toMatch(/CREATE TRIGGER trg_lift_erasure_suppression\s+AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth\.users/);
  });

  it("l'effacement ne réécrit plus le motif d'une ligne déjà posée", () => {
    const src = read("supabase/functions/_shared/account-erasure.ts");
    expect(src).toContain('{ onConflict: "email", ignoreDuplicates: true }');
  });
});

describe("D-08 · confidentialité dans les vues publiques", () => {
  for (const view of ["public_profiles", "public_helpers"]) {
    it(`${view} applique profile_visibility et show_last_seen`, () => {
      const v = block(`CREATE OR REPLACE VIEW public.${view} AS`, ";");
      expect(v).toContain("LEFT JOIN notification_preferences np ON np.user_id = p.id");
      expect(v).toMatch(/CASE WHEN coalesce\(np\.profile_visibility, 'all'\) = 'verified'\s+THEN public\.can_view_restricted_profile\(p\.id\)\s+ELSE true END/);
      expect(v).toMatch(/CASE WHEN coalesce\(np\.show_last_seen, true\)/);
    });
  }

  it("public_profiles garde ses 21 colonnes dans l'ordre de production", () => {
    const v = block("CREATE OR REPLACE VIEW public.public_profiles AS", "FROM profiles p");
    const cols = [
      "id", "first_name", "city", "avatar_url", "bio", "completed_sits_count", "identity_verified",
      "is_founder", "postal_code", "created_at", "profile_completion", "latitude_approx", "longitude_approx",
      "available_for_help", "skill_categories", "custom_skills", "role", "last_seen_at", "departement_code",
      "certifications", "country",
    ];
    let pos = 0;
    for (const c of cols) {
      const re = new RegExp(`(p\\.${c}\\b|AS ${c}\\b)`);
      const m = re.exec(v.slice(pos));
      expect(m, c).not.toBeNull();
      pos += (m?.index ?? 0) + 1;
    }
  });

  it("un profil restreint reste lisible du membre, de l'équipe, d'un membre vérifié et des personnes en lien", () => {
    const fn = block("CREATE OR REPLACE FUNCTION public.can_view_restricted_profile", "$function$;");
    expect(fn).toContain("_subject = auth.uid()");
    expect(fn).toContain("public.has_role(auth.uid(), 'admin'::app_role)");
    expect(fn).toContain("v.identity_verified IS TRUE");
    expect(fn).toContain("public.conversations c");
    expect(fn).toContain("public.applications a");
    expect(fn).toContain("public.small_mission_responses r");
    expect(fn).toContain("auth.uid() IS NOT NULL");
  });
});

describe("D-09 · compte suspendu", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.enforce_active_account_writes", "$function$;");

  it("suit la règle du lot C2 (statut et suspension en cours)", () => {
    const rule = block("CREATE OR REPLACE FUNCTION public.is_account_blocked_for_actions", "$function$;");
    expect(rule).toContain("coalesce(p.account_status, 'active') <> 'active'");
    expect(rule).toContain("p.suspended_until IS NULL OR p.suspended_until > now()");
  });

  it("bloque publication, candidature et message, avec l'indice account_not_active", () => {
    expect(fn).toContain("v_user_id := NEW.user_id;");
    expect(fn).toContain("v_user_id := NEW.sitter_id;");
    expect(fn).toContain("v_user_id := NEW.sender_id;");
    expect(fn).toContain("HINT = 'account_not_active'");
    expect(ACTIVE).toMatch(/trg_enforce_active_account_sits\s+BEFORE INSERT OR UPDATE OF status ON public\.sits/);
    expect(ACTIVE).toMatch(/trg_enforce_active_account_applications\s+BEFORE INSERT ON public\.applications/);
    expect(ACTIVE).toMatch(/trg_enforce_active_account_messages\s+BEFORE INSERT ON public\.messages/);
  });

  it("laisse passer messages système, retraits d'annonce et l'équipe", () => {
    expect(fn).toContain("NEW.status IS DISTINCT FROM 'published'");
    expect(fn).toContain("coalesce(NEW.is_system, false)");
    expect(fn).toContain("has_role(auth.uid(), 'admin'::app_role)");
  });

  it("R2 : un message is_system écrit par l'expéditeur lui-même est contrôlé", () => {
    expect(fn).toMatch(/IF coalesce\(NEW\.is_system, false\)\s+AND \(auth\.uid\(\) IS NULL OR auth\.uid\(\) IS DISTINCT FROM NEW\.sender_id\) THEN\s+RETURN NEW;/);
    expect(fn).not.toMatch(/IF coalesce\(NEW\.is_system, false\) THEN/);
  });

  it("R4 : is_account_blocked_for_actions fermée aux visiteurs et aux membres", () => {
    expect(ACTIVE).toContain("REVOKE ALL ON FUNCTION public.is_account_blocked_for_actions(uuid) FROM PUBLIC, anon, authenticated;");
    expect(ACTIVE).toContain("GRANT EXECUTE ON FUNCTION public.is_account_blocked_for_actions(uuid) TO service_role;");
    expect(ACTIVE).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.is_account_blocked_for_actions\(uuid\) TO [^;]*\b(anon|authenticated)\b/);
  });

  it("n'ajoute aucune politique de lecture", () => {
    expect(ACTIVE).not.toMatch(/CREATE POLICY|ALTER POLICY|DROP POLICY/);
  });
});

describe("E-08 · crons orphelins", () => {
  it("la déprogrammation est préparée et reste commentée", () => {
    for (const job of ["nudge-suspicious-accounts", "nudge-repeated-cancellations", "nudge-repeated-republished-sits"]) {
      expect(SQL).toContain(`-- SELECT cron.unschedule('${job}');`);
      expect(ACTIVE).not.toContain(`cron.unschedule('${job}')`);
    }
  });
});
