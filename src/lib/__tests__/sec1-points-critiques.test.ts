import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const migration = read("drizzle/migrations/0040_sec1_points_critiques.sql");

// Verrou SEC1 (29/09/2026) : qui lit quoi apres fermeture.
describe("SEC1, politiques de lecture", () => {
  it("sauvegarde les definitions avant toute modification", () => {
    expect(migration.indexOf("_backup_policies_sec1_20260929")).toBeLessThan(migration.indexOf("DROP POLICY"));
    expect(migration).toMatch(/RETOUR ARRIERE/);
  });

  it("owner_profiles : proprietaire, admin, gardien en discussion ou accepte", () => {
    expect(migration).not.toMatch(/ON public\.owner_profiles\s+FOR SELECT TO authenticated\s+USING \(true\)/);
    expect(migration).toMatch(/auth\.uid\(\) = user_id OR public\.has_role\(auth\.uid\(\), 'admin'::app_role\) OR public\.is_engaged_sitter_of\(user_id\)/);
    expect(migration).toMatch(/'accepted'::application_status, 'discussing'::application_status/);
  });

  it("vue membre : sans composition du foyer ni habitudes de contact, jamais pour un visiteur", () => {
    const view = migration.slice(migration.indexOf("CREATE VIEW public.member_owner_profiles"), migration.indexOf("REVOKE ALL ON public.member_owner_profiles"));
    for (const col of ["household_composition", "communication_notes", "preferred_time", "accept_unsolicited_pitches"]) {
      expect(view).not.toContain(col);
    }
    expect(view).toContain("auth.uid() IS NOT NULL");
    expect(migration).toMatch(/REVOKE ALL ON public\.member_owner_profiles FROM PUBLIC, anon/);
  });

  it("ecussons publics sans donneur, table restreinte au receveur, au donneur, a l'admin", () => {
    const view = migration.slice(migration.indexOf("CREATE VIEW public.public_badge_attributions"), migration.indexOf("GRANT SELECT ON public.public_badge_attributions"));
    expect(view).not.toContain("giver_id");
    expect(migration).toMatch(/auth\.uid\(\) = user_id OR auth\.uid\(\) = giver_id OR public\.has_role/);
    expect(migration).toMatch(/FROM public_badge_attributions ba CROSS JOIN config/);
  });

  it("mercis, humeurs et stockages fermes", () => {
    expect(migration).not.toMatch(/small_mission_response_thanks\s+FOR SELECT TO anon/);
    expect(migration).toMatch(/"SEC1 admins read alma moods"[\s\S]*has_role\(auth\.uid\(\), 'admin'::app_role\)/);
    expect(migration).toMatch(/consent_status = 'granted'/);
    expect(migration).toMatch(/bucket_id = 'pro-logos' AND public\.has_role/);
  });
});

describe("SEC1, lectures du site", () => {
  const otherOwnerReads: Array<[string, RegExp]> = [
    ["src/pages/Favorites.tsx", /from\("public_owner_profiles"\)\s*\.select\("user_id, preferred_sitter_types/],
    ["src/pages/Sits.tsx", /from\("public_owner_profiles"\)/],
    ["src/hooks/useSitterTopAffinitySits.ts", /from\("public_owner_profiles"\)/],
    ["src/components/search/SearchSitter.tsx", /from\("public_owner_profiles"\)/],
    ["src/components/sits/ApplicationModal.tsx", /from\("public_owner_profiles"\)/],
    ["src/pages/PublicSitDetail.tsx", /member_owner_profiles/],
    ["src/pages/SitDetail.tsx", /member_owner_profiles/],
  ];
  it.each(otherOwnerReads)("%s lit une vue pour le profil d'un autre propriétaire", (file, re) => {
    expect(read(file)).toMatch(re);
  });

  const badgeReads = [
    "src/pages/PublicSitDetail.tsx",
    "src/pages/PublicSitterProfile.tsx",
    "src/hooks/useOwnerDashboardData.ts",
    "src/components/sits/ApplicationsList.tsx",
    "src/components/search/SearchOwner.tsx",
    "src/components/search/SearchSitter.tsx",
    "src/hooks/useProfileReputation.ts",
  ];
  it.each(badgeReads)("%s lit les écussons d'autrui par la vue publique", (file) => {
    const src = read(file);
    expect(src).toMatch(/public_badge_attributions/);
    expect(src).not.toMatch(/from\(["']badge_attributions["']\)/);
  });
});
