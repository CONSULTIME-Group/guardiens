/**
 * Lot X3a (13/10/2026) : assertions statiques de la migration préparée
 * supabase/prepared-migrations/20261013140000_x3a_proprietaire_gardien.sql
 * (A-04, A-08, B-02, B-04, B-05, B-06, B-17).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/prepared-migrations/20261013140000_x3a_proprietaire_gardien.sql", "utf8");
const block = (start: string, end: string) => {
  const a = sql.indexOf(start);
  const b = sql.indexOf(end, a + 1);
  expect(a, `début introuvable : ${start}`).toBeGreaterThan(-1);
  expect(b, `fin introuvable : ${end}`).toBeGreaterThan(a);
  return sql.slice(a, b);
};

describe("X3a, ensemble de la migration", () => {
  it("aucun tiret cadratin ni demi-cadratin", () => {
    expect(sql).not.toMatch(/[\u2013\u2014]/);
  });
  it("aucune instruction UPDATE ou DELETE sans WHERE (pg_safeupdate)", () => {
    const stripped = sql.replace(/--[^\n]*/g, " ");
    for (const stmt of stripped.split(";")) {
      const s = stmt.replace(/\s+/g, " ");
      if (/\bUPDATE\s+public\.\w+(\s+\w+)?\s+SET\b/i.test(s) && !/\bON CONFLICT\b/i.test(s)) {
        expect(s, s.slice(0, 120)).toMatch(/\bWHERE\b/i);
      }
      expect(s).not.toMatch(/\bDELETE\s+FROM\b(?!.*\bWHERE\b)/i);
    }
  });
});

describe("X3a, A-04 : l'auteur ouvre sa propre annonce quel que soit son statut", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.get_public_sit", "-- 2. A-08");
  it("la condition auteur ne dépend plus du brouillon", () => {
    expect(fn).toContain("OR (auth.uid() IS NOT NULL AND auth.uid() = sits.user_id)");
    expect(fn).not.toContain("sits.status::text = 'draft' AND auth.uid()");
  });
  it("les statuts publics et le masquage des dates restent ceux de la production", () => {
    expect(fn).toContain("sits.status::text = ANY (ARRAY['published','confirmed','in_progress','completed','archived'])");
    expect(fn).toContain("AND NOT COALESCE(");
    expect(fn).toContain("a.sitter_id = auth.uid() AND a.status = 'accepted'");
  });
});

describe("X3a, A-08 : avis après archivage d'une garde terminée", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.sit_is_reviewable", "-- 3. B-02");
  it("terminée, ou archivée après avoir été terminée, date de fin passée", () => {
    expect(fn).toContain("s.status = 'completed'::sit_status");
    expect(fn).toContain("s.status = 'archived'::sit_status");
    expect(fn).toContain("s.end_date < current_date");
    expect(fn).toMatch(/h\.old_status = 'completed'\s+AND h\.new_status = 'archived'/);
  });
  it("la politique d'insertion des avis passe par sit_is_reviewable des deux côtés", () => {
    const policy = block('DROP POLICY IF EXISTS "Users can create reviews for their sits" ON public.reviews;', "-- 3. B-02");
    expect(policy).toMatch(/FOR INSERT\s+TO authenticated/);
    expect(policy).toContain("auth.uid() = reviewer_id");
    expect(policy.match(/public\.sit_is_reviewable\(/g)?.length).toBe(2);
    expect(policy).toContain("applications.status = 'accepted'::application_status");
    expect(policy).not.toContain("sits.status = 'completed'::sit_status");
  });
  it("fonction fermée aux anonymes", () => {
    expect(fn).toContain("REVOKE ALL ON FUNCTION public.sit_is_reviewable(uuid) FROM PUBLIC, anon;");
  });
});

describe("X3a, B-02 : annulation de participation par le gardien", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.create_avis_annulation", "-- 4. B-04");
  it("contrôles de production conservés", () => {
    expect(fn).toContain("RAISE EXCEPTION 'Accès non autorisé : reviewer_id invalide'");
    expect(fn).toContain("RAISE EXCEPTION 'Cette garde est déjà annulée'");
    expect(fn).toContain("ON CONFLICT (sit_id, reviewer_id) WHERE review_type = 'annulation' DO NOTHING");
  });
  it("annonce annulée d'abord (notification et compte des annulations), candidature ensuite", () => {
    const cancelSit = fn.indexOf("status = 'cancelled',");
    const cancelApp = fn.indexOf("SET status = 'cancelled'::application_status");
    const republish = fn.indexOf("status = 'published',");
    expect(cancelSit).toBeGreaterThan(0);
    expect(cancelApp).toBeGreaterThan(cancelSit);
    expect(republish).toBeGreaterThan(cancelApp);
  });
  it("seulement pour le gardien, par le drapeau dédié éteint juste après", () => {
    const branch = fn.slice(fn.indexOf("IF v_actor_id = v_sitter_id THEN\n    -- Sa candidature"));
    expect(branch).toContain("set_config('app.sitter_cancel_participation', '1', true)");
    expect(branch.indexOf("set_config('app.sitter_cancel_participation', '', true)")).toBeGreaterThan(
      branch.indexOf("SET status = 'cancelled'::application_status"),
    );
    expect(branch).toContain("AND sitter_id = v_sitter_id");
  });
  it("republication seulement pour une garde qui commence après aujourd'hui, propriétaire prévenu", () => {
    expect(fn).toContain("IF v_start_date IS NOT NULL AND v_start_date > current_date THEN");
    expect(fn).toContain("accepting_applications = true");
    expect(fn).toContain("'sit_republished'");
    expect(fn).toContain("est de nouveau ouverte aux candidatures.");
  });
  it("le gardien passe accepted vers cancelled par ce seul drapeau", () => {
    const guard = block("CREATE OR REPLACE FUNCTION public.applications_guard_status_update", "-- 8. get_my_applications");
    expect(guard).toMatch(
      /current_setting\('app\.sitter_cancel_participation', true\), ''\) = '1'\s+AND NEW\.status = 'cancelled'::application_status\s+AND OLD\.status = 'accepted'::application_status/,
    );
  });
});

describe("X3a, B-04 : « Candidature annulée » seulement pour un retrait volontaire", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.notify_application_cancelled_by_sitter", "-- 5. B-05");
  it("clôture système, annulation de participation et tiers écartés avant l'insertion", () => {
    const exit = fn.indexOf("RETURN NEW;\n    END IF;");
    const insert = fn.indexOf("INSERT INTO public.notifications");
    expect(fn).toContain("current_setting('app.system_close', true), '') = '1'");
    expect(fn).toContain("current_setting('app.sitter_cancel_participation', true), '') = '1'");
    expect(fn).toContain("auth.uid() IS DISTINCT FROM NEW.sitter_id");
    expect(exit).toBeGreaterThan(0);
    expect(insert).toBeGreaterThan(exit);
  });
});

describe("X3a, B-05 : le plafond de candidatures tient côté serveur", () => {
  const guard = block("CREATE OR REPLACE FUNCTION public.guard_application_sit_open", "CREATE OR REPLACE FUNCTION public.close_sit_when_application_cap_reached");
  const close = block("CREATE OR REPLACE FUNCTION public.close_sit_when_application_cap_reached", "-- 6. B-06");
  it("refus avant insertion : annonce non publiée, fermée ou au plafond", () => {
    expect(guard).toContain("IF v_status IS NULL OR v_status <> 'published' OR v_accepting IS FALSE THEN");
    expect(guard).toContain("IF v_live >= v_max THEN");
    expect(guard).toContain("HINT = 'sit_closed'");
    expect(guard).toContain("FOR UPDATE");
    expect(guard).toMatch(/CREATE TRIGGER trg_guard_application_sit_open\s+BEFORE INSERT ON public\.applications/);
  });
  it("les propositions privées et le service_role passent", () => {
    expect(guard).toContain("current_setting('app.via_proposal_rpc', true), '') = '1'");
    expect(guard).toContain("current_setting('role', true) = 'service_role'");
  });
  it("même décompte que src/lib/applicationCap.ts (hors rejected et cancelled)", () => {
    for (const b of [guard, close]) {
      expect(b).toContain("a.status NOT IN ('rejected'::application_status, 'cancelled'::application_status)");
    }
    const lib = readFileSync("src/lib/applicationCap.ts", "utf8");
    expect(lib).toContain('a.status !== "rejected" && a.status !== "cancelled"');
  });
  it("fermeture après insertion au plafond, et rattrapage des annonces déjà au plafond", () => {
    expect(close).toContain("SET accepting_applications = false");
    expect(close).toMatch(/CREATE TRIGGER trg_close_sit_when_application_cap_reached\s+AFTER INSERT ON public\.applications/);
    expect(close).toContain("UPDATE public.sits s\n   SET accepting_applications = false\n WHERE s.status = 'published'::sit_status");
  });
  it("le navigateur du gardien n'écrit plus accepting_applications", () => {
    for (const path of ["src/components/sits/ApplicationModal.tsx", "src/components/sits/views/SitterSitView.tsx"]) {
      const src = readFileSync(path, "utf8");
      expect(src, path).not.toMatch(/update\(\{\s*accepting_applications:\s*false/);
    }
    expect(readFileSync("src/components/sits/ApplicationModal.tsx", "utf8")).toContain('includes("SIT_CLOSED")');
  });
});

describe("X3a, B-06 : le digest n'écarte que sur refus explicite", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.notify_sitters_on_new_sit", "-- 7. B-17");
  it("plus aucune exclusion d'office", () => {
    expect(fn).not.toMatch(/AND sp\.smoker IS DISTINCT FROM true\s*\n/);
    expect(fn).not.toMatch(/AND sp\.travels_with_children IS DISTINCT FROM true\s*\n/);
    expect(fn).not.toMatch(/AND sp\.travels_with_own_animals IS DISTINCT FROM true\s*\n/);
  });
  it("exclusion seulement si l'annonce ou le propriétaire refuse", () => {
    expect(fn).toContain("AND (sp.smoker IS DISTINCT FROM true OR NOT v_smokers_refused)");
    expect(fn).toContain("AND (sp.travels_with_children IS DISTINCT FROM true OR NOT v_children_refused)");
    expect(fn).toContain("AND (sp.travels_with_own_animals IS DISTINCT FROM true OR NOT v_pets_refused)");
    expect(fn).toContain("v_children_refused := lower(btrim(coalesce(NEW.accepts_sitter_children, ''))) = 'no';");
    expect(fn).toContain("v_pets_refused := lower(btrim(coalesce(NEW.accepts_sitter_pets, ''))) = 'no';");
    expect(fn).toContain("lower(btrim(coalesce(op.smoker_accepted, ''))) = 'non'");
  });
  it("le reste de la diffusion est celui de la production", () => {
    expect(fn).toContain("c_rank_cap constant integer := 100;");
    expect(fn).toContain("'sit_published_zero_reach'");
    expect(fn).toContain("ON CONFLICT (sitter_id, sit_id) DO NOTHING;");
    expect(fn).toContain("WHERE f.key = 'species_filter_blocking';");
  });
});

describe("X3a, B-17 : champs de la candidature hors de portée du gardien", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.applications_guard_status_update", "-- 8. get_my_applications");
  it("les huit colonnes sont gardées", () => {
    for (const col of ["sit_id", "sitter_id", "created_at", "viewed_at", "pricing_flag", "decline_reason", "decline_variant", "declined_at"]) {
      expect(fn).toContain(`NEW.${col} IS DISTINCT FROM OLD.${col}`);
    }
    expect(fn).toContain("RAISE EXCEPTION 'Modification interdite d''un champ de la candidature'");
  });
  it("le contrôle passe avant tout drapeau et avant le retrait X1", () => {
    const guard = fn.indexOf("Modification interdite d''un champ");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(fn.indexOf("app.auto_discussing"));
    expect(guard).toBeLessThan(fn.indexOf("Lot X1 : retrait par le gardien"));
  });
  it("le retrait X1 et le contrôle propriétaire restent en place", () => {
    expect(fn).toMatch(/OLD\.status IN \('pending'::application_status, 'viewed'::application_status, 'discussing'::application_status\)/);
    expect(fn).toContain("RAISE EXCEPTION 'Only the sit owner can change application status'");
  });
  it("aucun écran ne fait écrire viewed_at par le gardien", () => {
    for (const path of ["src/pages/Sits.tsx", "src/pages/MesCandidatures.tsx", "src/components/sits/CancelSitModal.tsx", "src/components/sits/ApplicationModal.tsx"]) {
      const src = readFileSync(path, "utf8");
      expect(src, path).not.toMatch(/update\(\{[^}]*viewed_at/);
    }
  });
});

describe("X3a, get_my_applications : annulation par le gardien lisible", () => {
  const fn = sql.slice(sql.indexOf("-- 8. get_my_applications --"));
  it("colonne ajoutée en dernier, droits rétablis", () => {
    expect(fn).toContain("DROP FUNCTION IF EXISTS public.get_my_applications();");
    expect(fn).toMatch(/content_visible boolean, sit_cancelled_by_me boolean\)/);
    expect(fn).toContain("s.cancelled_by = a.sitter_id");
    expect(fn).toContain("WHERE a.sitter_id = auth.uid()");
    expect(fn).toContain("GRANT EXECUTE ON FUNCTION public.get_my_applications() TO authenticated, service_role;");
  });
});
