/**
 * Lot Y2 : écrans qui lisent autrui par une vue publique, allergie servie
 * sous un libellé neutre, et contenu de la migration de droits.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { computeAffinityResultFull, computeAffinityScore } from "@/lib/affinityScore";

const read = (p: string) => readFileSync(p, "utf8");
const SQL = read("supabase/prepared-migrations/20261013200100_y2_droits.sql");

describe("Y2, P3-10 et P3-12 : lectures d'autrui par les vues publiques", () => {
  it("les écrans gardien ne lisent plus la table pets d'une annonce d'autrui", () => {
    for (const p of [
      "src/lib/arrivalFirstStep.ts",
      "src/hooks/useSitterTopAffinitySits.ts",
      "src/pages/Favorites.tsx",
      "src/pages/Sits.tsx",
      "src/components/sits/ApplicationModal.tsx",
    ]) {
      expect(read(p), p).not.toMatch(/\.from\(\s*["']pets["']\s*\)/);
    }
    // Repli pets réservé au gardien retenu, après public_pets.
    const helper = read("src/lib/visiblePets.ts");
    expect(helper.indexOf('"public_pets"')).toBeGreaterThan(-1);
    expect(helper.indexOf('"public_pets"')).toBeLessThan(helper.indexOf('.from("pets")'));
  });

  it("aucune lecture de profiles ou sitter_profiles d'autrui dans les écrans corrigés", () => {
    expect(read("src/components/missions/MissionResponseCard.tsx")).not.toMatch(/\.from\(\s*["']profiles["']\s*\)/);
    expect(read("src/components/missions/MissionResponseCard.tsx")).toMatch(/from\("public_helpers"\)/);
    expect(read("src/components/dashboard/MesCoupsDeMain.tsx")).not.toMatch(/\.from\(\s*["']profiles["']\s*\)/);
    expect(read("src/components/dashboard/MesCoupsDeMain.tsx")).toMatch(/rpc\("get_member_display"/);
    expect(read("src/components/dashboard/NearbyEmergencySitters.tsx")).not.toMatch(/\.from\(\s*["']sitter_profiles["']\s*\)/);
    // La fiche publique ne lit profiles que pour son titulaire.
    expect(read("src/pages/PublicSitterProfile.tsx")).toMatch(
      /auth\?\.user\?\.id === id\s*\?\s*supabase\.from\("profiles"\)\.select\(BASE_PROFILE_COLS\)/,
    );
  });
});

describe("Y2, P3-06 : allergie servie sous un libellé neutre", () => {
  const owner = { life_pace: "calme", languages: ["Français"], interests: ["Lecture"], pets: [{ species: "cat" }] };
  const sitter = (sens: string) => ({
    life_pace: "calme",
    languages: ["Français"],
    interests: ["Lecture"],
    animal_types: ["cat"],
    sensitivities: [sens],
  });

  it("« Pas de chats » bloque comme l'allergie, sans mot de santé", () => {
    for (const sens of ["Allergie aux chats", "Pas de chats"]) {
      const r = computeAffinityScore(owner, sitter(sens));
      expect(r!.hasDeclaredIncompatibility, sens).toBe(true);
      const d = computeAffinityScore(owner, sitter(sens), { mode: "distribution" });
      expect(d.distributable, sens).toBe(false);
      const full = JSON.stringify(computeAffinityResultFull(owner, sitter(sens)));
      expect(full, sens).not.toMatch(/allergi/i);
    }
  });

  it("la vue remplace les deux allergies, sauf pour les personnes autorisées", () => {
    const view = SQL.slice(SQL.indexOf("CREATE OR REPLACE VIEW public.sitter_profiles_affinity"));
    expect(view).toMatch(/WHEN public\.sitter_health_visible\(s\.user_id\) THEN s\.sensitivities/);
    expect(view).toMatch(/'Allergie aux chats', 'Pas de chats'/);
    expect(view).toMatch(/'Allergie aux chiens', 'Pas de chiens'/);
    expect(SQL).toMatch(/REVOKE ALL ON public\.sitter_profiles_affinity FROM PUBLIC, anon, authenticated;/);
  });
});

describe("Y2, migration de droits", () => {
  it("profile_reputation en droits du propriétaire ne compte que les avis publiés et validés", () => {
    const start = SQL.indexOf("CREATE OR REPLACE VIEW public.profile_reputation AS");
    expect(start).toBeGreaterThan(-1);
    const view = SQL.slice(start, SQL.indexOf("ALTER VIEW public.profile_reputation SET (security_invoker = false);"));
    const avg = view.slice(view.indexOf("avg_ratings AS"));
    expect(avg).toMatch(/reviews\.published = true/);
    expect(avg).toMatch(/reviews\.moderation_status = 'valide'::text/);
    expect(view).toMatch(/AS user_id,[\s\S]*AS completed_sits,[\s\S]*AS active_badges,[\s\S]*AS note_moyenne,[\s\S]*AS statut_gardien/);
    expect(view).toMatch(/WHERE p\.account_status = 'active'::text;/);
  });

  it("chaque REVOKE vise PUBLIC, anon et authenticated", () => {
    const body = SQL.replace(/--[^\n]*/g, " ");
    const revokes = body.match(/REVOKE[^;]*;/g) ?? [];
    expect(revokes.length).toBeGreaterThan(20);
    for (const r of revokes) {
      expect(r, r).toMatch(/FROM PUBLIC, anon, authenticated/);
    }
  });

  it("fonctions de service réservées à service_role, fonctions du site bornées à soi", () => {
    for (const f of ["detect_stale_sits()", "get_owner_top_3_sitters(uuid)", "mission_audience(double precision, double precision, text, uuid)", "trigger_indexnow_push(text, text)"]) {
      expect(SQL).toContain(`'public.${f}'`);
    }
    expect(SQL).toMatch(/ALTER FUNCTION public\.trg_indexnow_articles\(\) SECURITY DEFINER;/);
    for (const fn of ["calculate_profile_completion", "get_unread_messages_count"]) {
      const def = SQL.slice(SQL.indexOf(`CREATE OR REPLACE FUNCTION public.${fn}`));
      expect(def.slice(0, 900), fn).toMatch(/IS DISTINCT FROM auth\.uid\(\)/);
    }
  });

  it("vues en lecture seule, modération et écussons gardés", () => {
    expect(SQL).toMatch(/REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public\.%I FROM PUBLIC, anon, authenticated/);
    expect(SQL).toMatch(/CREATE TRIGGER trg_guard_moderation_columns BEFORE UPDATE ON public\.sits/);
    expect(SQL).toMatch(/CREATE TRIGGER trg_guard_moderation_columns BEFORE UPDATE ON public\.small_missions/);
    expect(SQL).toMatch(/DROP POLICY IF EXISTS "ba_insert_authenticated" ON public\.badge_attributions;/);
  });

  it("galerie du propriétaire inchangée : P3-07 écarté par décision du fondateur", () => {
    expect(SQL).toContain("P3-07 écarté par décision du fondateur du 13/10/2026 : photos de logement");
    expect(SQL).not.toMatch(/ON public\.owner_gallery/);
  });

  it("le contrôle en base est inscrit, commenté", () => {
    expect(SQL).toMatch(/--\s+AND pg_get_function_result\(p\.oid\) ~\* 'email'/);
  });
});
