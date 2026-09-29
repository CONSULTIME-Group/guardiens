import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { kpisFromCounts, momentsFromCounts, whispersFromCounts } from "@/lib/admin/alma-analytics";
import { competenceInsertError } from "@/lib/admin/competenceErrors";

const read = (p: string) => readFileSync(p, "utf8");
const migration = read(
  "drizzle/migrations/" + readdirSync("drizzle/migrations").find((f) => f.includes("a10_chiffres_justes_agregats"))!,
);

describe("A10 fin, agrégats Alma sans plafond", () => {
  it("les compteurs SQL au-delà de 1 000 lignes sont conservés tels quels", () => {
    const k = kpisFromCounts({
      unique_7d: 120,
      unique_30d: 413,
      by_type: [
        { event_type: "alma_motivation_bubble_seen", n: 4446, last_at: "2026-09-29T10:00:00Z" },
        { event_type: "alma_motivation_action_clicked", n: 222, last_at: "2026-09-29T11:00:00Z" },
      ],
    });
    expect(k.totalViews).toBe(4446);
    expect(k.uniqueUsers30d).toBe(413);
    expect(k.engagementRate).toBeCloseTo(222 / 4446);
    const m = momentsFromCounts([{ event_type: "alma_motivation_bubble_seen", n: 4446, last_at: "2026-09-29T10:00:00Z" }]);
    expect(m.find((x) => x.moment === "alma_motivation")?.views).toBe(4446);
  });
  it("murmures agrégés", () => {
    const w = whispersFromCounts([{ whisper_type: "t", emitted: 10, actions: 5, dismissed: 2, blacklisted_users: 1 }], {});
    expect(w[0].actionRate).toBe(0.5);
    expect(w[0].blacklistedUsers).toBe(1);
  });
  it("aucune lecture d'événements côté navigateur sur les écrans concernés", () => {
    for (const f of [
      "src/pages/admin/AdminAlma.tsx",
      "src/pages/admin/_components/alma/DiscoveryFunnelCard.tsx",
      "src/pages/admin/_components/alma/ConversationsTab.tsx",
      "src/pages/admin/_components/alma/MoodsTab.tsx",
      "src/components/admin/AffinityOnboardingFunnelCard.tsx",
      "src/components/admin/SignupFormSubStepsFunnel.tsx",
    ]) {
      const s = read(f);
      expect(s, f).not.toContain('from("analytics_events")');
      expect(s, f).not.toMatch(/\.limit\((2000|5000|20000|50000)\)/);
      expect(s, f).not.toContain("Données tronquées");
    }
  });
  it("personnes uniques 30 j toujours sur 30 jours", () => {
    expect(migration).toMatch(/'unique_30d'[\s\S]*?now\(\) - interval '30 days'/);
  });
});

describe("A10 fin, fonctions admin", () => {
  it("chaque fonction A10 exige le rôle admin et fixe search_path", () => {
    const fns = migration.split("CREATE OR REPLACE FUNCTION").slice(1).filter((b) => !b.includes("admin_sit_view_paths(p_sit_id uuid)\nRETURNS"));
    expect(fns.length).toBeGreaterThanOrEqual(13);
    for (const b of fns) {
      expect(b).toContain("SECURITY DEFINER");
      expect(b).toMatch(/search_path/i);
      expect(b).toContain("has_role(auth.uid(), 'admin'");
    }
  });
  it("compétences en attente refusées à un non-admin", () => {
    const block = migration.split("admin_a10_pending_competences()")[1];
    expect(block).toContain("RAISE EXCEPTION 'Accès admin requis'");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon");
  });
  it("doublon de compétence signalé", () => {
    expect(competenceInsertError({ code: "23505" }, "Taille de haies")).toContain("existe déjà");
    expect(read("src/pages/admin/AdminSkills.tsx")).toContain("competenceInsertError");
  });
});

describe("A10 fin, vues d'annonce identiques tableau et fiche", () => {
  it("les quatre fonctions comptent les mêmes chemins", () => {
    for (const f of ["admin_get_listings_stats", "admin_get_listing_traffic_sources", "admin_get_sits_stats", "admin_get_sit_stats"]) {
      const block = migration.split(`FUNCTION public.${f}(`)[1].split("$function$;")[0];
      expect(block, f).toContain("admin_sit_view_paths(");
    }
    const paths = migration.split("FUNCTION public.admin_sit_view_paths(p_sit_id uuid)")[1].split("$$;")[0];
    for (const p of ["'/sits/' || p_sit_id", "'/annonces/' || p_sit_id", "'/sits/' || s.slug", "'/annonces/' || s.slug"]) {
      expect(paths).toContain(p);
    }
  });
  it("colonne « Membres uniques » avec infobulle", () => {
    const s = read("src/pages/admin/AdminListings.tsx");
    expect(s).toContain(">Membres uniques</TableHead>");
    expect(s).toContain("Les visiteurs non connectés ne sont pas comptés");
  });
});

describe("A10 fin, humeurs", () => {
  it("le bouton montre l'action et un badge montre l'état", () => {
    const s = read("src/pages/admin/_components/alma/MoodsTab.tsx");
    expect(s).toContain('{row.active ? "Désactiver" : "Activer"}');
    expect(s).toMatch(/<Badge[^>]*>\s*\{row\.active \? "Active" : "Inactive"\}/);
  });
});
