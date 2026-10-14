/**
 * Lot Z2 (14/10/2026) : écrans alignés sur la migration de finitions.
 * Gardes réalisées suivies du verdict serveur, notification de dates,
 * textes d'EditSit, action admin retirée, décisions inscrites.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { groupApplications, isCompletedSitForSitter } from "@/lib/applicationSitState";
import { notificationCategory, notificationTone, NOTIFICATION_KINDS } from "@/lib/notificationKinds";

const read = (p: string) => readFileSync(p, "utf8");
const DASHES = new RegExp("[\\u2013\\u2014]");
const NOW = new Date(2026, 9, 14, 12, 0, 0);

describe("Z2.2, gardes réalisées : le serveur tranche quand il répond", () => {
  it("sit_reviewable faux écarte une garde archivée que la règle d'écran aurait retenue", () => {
    const app = { sit_status: "archived", status: "accepted", sit_end_date: "2026-09-01", sit_reviewable: false };
    expect(isCompletedSitForSitter(app, NOW)).toBe(false);
    expect(isCompletedSitForSitter({ ...app, sit_reviewable: undefined }, NOW)).toBe(true);
  });

  it("sit_reviewable vrai compte la garde, toujours réservé à la candidature acceptée", () => {
    expect(isCompletedSitForSitter({ sit_status: "completed", status: "accepted", sit_reviewable: true }, NOW)).toBe(true);
    expect(isCompletedSitForSitter({ sit_status: "completed", status: "rejected", sit_reviewable: true }, NOW)).toBe(false);
  });

  it("repli sur la règle d'écran quand la colonne est absente ou nulle", () => {
    expect(isCompletedSitForSitter({ sit_status: "completed", status: "accepted", sit_reviewable: null }, NOW)).toBe(true);
    expect(isCompletedSitForSitter({ sit_status: "archived", status: "accepted", sit_end_date: "2026-11-01" }, NOW)).toBe(false);
  });

  it("groupApplications range selon le verdict serveur", () => {
    const apps = [
      { id: "a", sit_status: "archived", status: "accepted", sit_end_date: "2026-09-01", sit_reviewable: true },
      { id: "b", sit_status: "archived", status: "accepted", sit_end_date: "2026-09-01", sit_reviewable: false },
      { id: "c", sit_status: "published", status: "pending", sit_end_date: "2026-11-01", sit_reviewable: false },
    ];
    const { active, done, closed } = groupApplications(apps, { now: NOW });
    expect(active.map((a) => a.id)).toEqual(["c"]);
    expect(done.map((a) => a.id)).toEqual(["a"]);
    expect(closed.map((a) => a.id)).toEqual(["b"]);
  });

  it("MesCandidatures lit sit_reviewable pour l'accès à l'avis, repli conservé", () => {
    const src = read("src/pages/MesCandidatures.tsx");
    expect(src).toContain("sit_reviewable?: boolean | null;");
    expect(src).toContain('typeof app.sit_reviewable === "boolean"');
    expect(src).toContain("isSitReviewable({ status: app.sit_status, end_date: app.sit_end_date })");
  });

  it("types Supabase : get_my_applications porte sit_reviewable", () => {
    const types = read("src/integrations/supabase/types.ts");
    const i = types.indexOf("      get_my_applications: {");
    const block = types.slice(i, types.indexOf("      get_nearby_helpers: {", i));
    expect(block).toContain("sit_reviewable: boolean");
    expect(block).toContain("sit_cancelled_by_me: boolean");
  });
});

describe("Z2.3, nouvelles dates d'une garde confirmée", () => {
  it("sit_dates_changed appartient à la famille garde", () => {
    expect(NOTIFICATION_KINDS.sit_dates_changed).toBeDefined();
    expect(notificationCategory("sit_dates_changed")).toBe("garde");
    expect(notificationTone("sit_dates_changed")).toBe("warning");
  });

  it("EditSit dit que le gardien est prévenu", () => {
    const src = read("src/pages/EditSit.tsx");
    expect(src).not.toContain("n'enverra pas de notification");
    expect(src).not.toContain("n'enverra <strong>pas</strong>");
    expect(src).toContain("le gardien reçoit une notification avec les nouvelles");
    expect(src).not.toMatch(DASHES);
  });
});

describe("Z2, action admin « Offrir Premium » retirée", () => {
  it("plus de notification subscription_offered ni de Premium offert", () => {
    const src = read("src/pages/admin/AdminSubscriptions.tsx");
    expect(src).not.toContain('type: "subscription_offered"');
    expect(src).not.toContain("offer_premium");
    expect(src).not.toContain("Premium offert");
    expect(src).not.toContain("pour l'instant");
    expect(src).toContain("Guardiens est gratuit");
  });
});

describe("Z2, décisions inscrites", () => {
  const agents = read("AGENTS.md");
  const lovable = agents.indexOf("<!-- LOVABLE:BEGIN -->");

  it("la ligne X3b dit que le besoin de Mascouche est clos", () => {
    expect(agents).not.toContain("le besoin de Mascouche reste à arbitrer");
    expect(agents).toContain("le besoin de Mascouche, seul besoin ouvert sans coordonnées, a été clos par la migration X3b");
  });

  it("deux décisions Z2 après « Cloche et notifications (lot Z) », avant le bloc Lovable", () => {
    const cloche = agents.indexOf("- Cloche et notifications (lot Z)");
    for (const head of ["- Droits et dates (lot Z2)", "- Gardes réalisées et crons (lot Z2)"]) {
      const at = agents.indexOf(head);
      expect(at, head).toBeGreaterThan(cloche);
      expect(at, head).toBeLessThan(lovable);
    }
    const z2 = agents.slice(agents.indexOf("- Droits et dates (lot Z2)"), lovable);
    expect(z2).toContain("pourquoi :");
    expect(z2).not.toMatch(DASHES);
  });
});
