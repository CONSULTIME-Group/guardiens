import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { openRate, openRatePct, formatOpenRate } from "@/lib/admin/openRate";
import { statusChangeActivity } from "@/lib/admin/activityLabels";
import { articleSlugFromUrl, articlesWithoutImpressions, daysInclusive, organicSessions } from "@/lib/admin/seoMetrics";
import { UNAVAILABLE_LABEL } from "@/lib/admin/readError";

const read = (p: string) => readFileSync(p, "utf8");

describe("A10, taux d'ouverture unique", () => {
  it("ouverts sur livrés, jamais sur envoyés", () => {
    expect(openRate(5, 10)).toBe(0.5);
    expect(openRatePct(1, 3)).toBe(33.3);
    expect(openRate(3, 0)).toBeNull();
    expect(formatOpenRate(3, 0)).toBe("·");
  });
  it("les écrans emails passent par la fonction partagée", () => {
    for (const f of [
      "src/pages/admin/AdminNurturing.tsx",
      "src/pages/admin/AdminLifecycle.tsx",
      "src/pages/admin/AdminEmails.tsx",
      "src/pages/admin/_components/MissionDigestTab.tsx",
      "src/pages/admin/_components/SitterDigestTab.tsx",
      "src/pages/admin/_components/MutualAidDashboardTab.tsx",
    ]) expect(read(f)).toContain("@/lib/admin/openRate");
  });
});

describe("A10, activité récente", () => {
  it("confirmation et expiration ne sont pas des dépublications", () => {
    expect(statusChangeActivity("published", "confirmed")?.kind).toBe("confirmation");
    expect(statusChangeActivity("published", "expired")?.kind).toBe("expiration");
    expect(statusChangeActivity("published", "draft")?.kind).toBe("brouillon");
    expect(statusChangeActivity("published", "cancelled")?.kind).toBe("depublication");
    expect(statusChangeActivity("draft", "published")?.kind).toBe("publication");
  });
});

describe("A10, SEO", () => {
  it("reconnaît /actualites/ et /articles/", () => {
    expect(articleSlugFromUrl("https://guardiens.fr/actualites/mon-article")).toBe("mon-article");
    expect(articleSlugFromUrl("https://guardiens.fr/articles/ancien")).toBe("ancien");
  });
  it("pages sans impression calculées sur la liste complète", () => {
    const res = articlesWithoutImpressions(
      [{ slug: "a", published_at: "2026-01-01" }, { slug: "b", published_at: "2026-01-01" }],
      [{ page: "https://guardiens.fr/actualites/a", impressions: 4 }],
    );
    expect(res.map((r) => r.slug)).toEqual(["b"]);
  });
  it("période inclusive et séances organiques", () => {
    expect(daysInclusive("2026-09-01", "2026-09-29")).toBe(29);
    expect(organicSessions([{ channel: "Organic Search", sessions: 12 }, { channel: "Direct", sessions: 3 }])).toBe(12);
  });
});

describe("A10, lectures non plafonnées et erreurs visibles", () => {
  it("libellé d'erreur commun", () => expect(UNAVAILABLE_LABEL).toBe("Chiffre indisponible"));
  it("Erreurs : plus de plafond à 200, réseau exclu", () => {
    const s = read("src/pages/admin/AdminErrors.tsx");
    expect(s).not.toContain(".limit(200)");
    expect(s).toContain("fetchAllRows");
    expect(s).toContain("NetworkErrorMonitor");
  });
  it("Entraide : lectures paginées, clôtures automatiques sans migrations", () => {
    const s = read("src/pages/admin/_components/MutualAidDashboardTab.tsx");
    expect(s).not.toMatch(/\.limit\((200|10000|20000|50000)\)/);
    expect(s).toContain('AUTO_CLOSE_REASONS = ["expired", "auto_completed_after_date"]');
  });
  it("Nurturing : paquets de 150 identifiants", () => {
    expect(read("src/pages/admin/AdminNurturing.tsx")).toContain("i += 150");
  });
  it("Membres : statut supprimé et non vérifiés vides", () => {
    const s = read("src/pages/admin/AdminUsers.tsx");
    expect(s).toContain('deleted: { label: "Supprimé"');
    expect(s).toContain("identity_verification_status.is.null");
  });
  it("aucun tiret long dans les nouveaux libellés", () => {
    for (const f of ["src/lib/admin/openRate.ts", "src/lib/admin/activityLabels.ts", "src/lib/admin/readError.ts"]) {
      expect(read(f)).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
