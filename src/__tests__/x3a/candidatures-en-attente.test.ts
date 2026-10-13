/**
 * Lot X3a (13/10/2026), constats A-03, A-05, B-08 : candidatures en attente
 * de décision, ancienneté, repères propriétaire et gardien.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  awaitingLink,
  awaitingSentence,
  daysSince,
  isAwaitingDecision,
  sitStatusMap,
  sitterWaitingDays,
  sitterWaitingNote,
  staleSuffix,
  summarizeAwaiting,
} from "@/lib/applicationsAwaiting";

const NOW = new Date("2026-10-13T12:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("X3a, A-03 : une candidature ouverte attend toujours une décision", () => {
  it("pending, viewed et discussing comptent, les décisions non", () => {
    expect(isAwaitingDecision("pending")).toBe(true);
    expect(isAwaitingDecision("viewed")).toBe(true);
    expect(isAwaitingDecision("discussing")).toBe(true);
    for (const s of ["accepted", "rejected", "cancelled", null, undefined]) expect(isAwaitingDecision(s as any)).toBe(false);
  });

  it("23 candidatures vues sans pending ne donnent plus une pastille à 0", () => {
    const apps = [
      { id: "a1", sit_id: "s1", status: "viewed", created_at: ago(2) },
      { id: "a2", sit_id: "s1", status: "discussing", created_at: ago(3) },
      { id: "a3", sit_id: "s1", status: "rejected", created_at: ago(4) },
    ];
    const r = summarizeAwaiting(apps, sitStatusMap([{ id: "s1", status: "published" }]), NOW);
    expect(r.count).toBe(2);
    expect(r.fresh).toBe(0);
  });

  it("les annonces closes sortent du compte, les brouillons (propositions) restent", () => {
    const apps = [
      { id: "a1", sit_id: "pub", status: "pending", created_at: ago(1) },
      { id: "a2", sit_id: "exp", status: "pending", created_at: ago(1) },
      { id: "a3", sit_id: "arc", status: "viewed", created_at: ago(1) },
      { id: "a4", sit_id: "draft", status: "pending", created_at: ago(1) },
    ];
    const map = sitStatusMap([
      { id: "pub", status: "published" },
      { id: "exp", status: "expired" },
      { id: "arc", status: "archived" },
      { id: "draft", status: "draft" },
    ]);
    const r = summarizeAwaiting(apps, map, NOW);
    expect(r.count).toBe(2);
    expect(r.fresh).toBe(2);
  });

  it("sans table de statuts, rien n'est écarté", () => {
    expect(summarizeAwaiting([{ id: "a", sit_id: "x", status: "viewed", created_at: ago(1) }], null, NOW).count).toBe(1);
    expect(summarizeAwaiting(null, null, NOW)).toEqual({ count: 0, fresh: 0, staleCount: 0, oldest: null });
  });

  it("la pastille de navigation suit le même compte (useNavBadgeCounts)", () => {
    const src = readFileSync("src/hooks/useNavBadgeCounts.ts", "utf8");
    expect(src).toContain("summarizeAwaiting(rows as any[], sitStatusMap(userSits))");
    expect(src).not.toContain('rows.filter((a: any) => a.status === "pending")');
    expect(src).toContain("result.ownerInboxSitId");
  });

  it("le tableau de bord propriétaire ne compte plus pending seul", () => {
    const src = readFileSync("src/components/dashboard/OwnerDashboard.tsx", "utf8");
    expect(src).not.toContain('recentApps.filter(a => a.status === "pending").length');
    expect(src).not.toContain('pendingApps={recentApps.filter(a => a.status === "pending")}');
    expect(src).toContain("const pendingAppCount = awaiting.count;");
    expect(src).toContain('label: "Candidatures à traiter", to: awaitingLink(awaiting)');
    // Lot P1b : aucune lecture ajoutée, tout dérive des listes déjà chargées.
    expect(src).not.toMatch(/supabase\s*\.from\(/);
  });
});

describe("X3a, A-05 : la plus ancienne candidature et son ancienneté", () => {
  const apps = [
    { id: "new", sit_id: "s2", status: "pending", created_at: ago(1) },
    { id: "old", sit_id: "s1", status: "viewed", created_at: ago(12) },
    { id: "mid", sit_id: "s1", status: "pending", created_at: ago(8) },
  ];
  const r = summarizeAwaiting(apps, null, NOW);

  it("repère la plus ancienne, son annonce et le nombre de jours", () => {
    expect(r.oldest).toEqual({ appId: "old", sitId: "s1", days: 12 });
    expect(r.staleCount).toBe(2);
    expect(awaitingLink(r)).toBe("/sits/s1#candidatures");
    expect(awaitingLink(summarizeAwaiting([], null, NOW))).toBe("/sits");
  });

  it("phrase d'accueil : nombre, nouvelles, ancienneté au-delà de 7 jours", () => {
    expect(awaitingSentence(r)).toBe(
      "3 candidatures attendent votre réponse, dont 2 nouvelles. La plus ancienne attend depuis 12 jours.",
    );
    const one = summarizeAwaiting([{ id: "a", sit_id: "s", status: "pending", created_at: ago(2) }], null, NOW);
    expect(awaitingSentence(one)).toBe("1 candidature attend votre réponse.");
    expect(awaitingSentence(summarizeAwaiting([], null, NOW))).toBeNull();
  });

  it("le repère d'ancienneté n'apparaît qu'à partir de 7 jours", () => {
    expect(staleSuffix(6)).toBeNull();
    expect(staleSuffix(7)).toBe("La plus ancienne attend depuis 7 jours.");
  });

  it("la vedette « Quelqu'un se propose » porte l'ancienneté", () => {
    const star = readFileSync("src/components/dashboard/owner/OwnerStarSection.tsx", "utf8");
    expect(star).toContain("staleSuffix(oldestWaitingDays)");
    const dash = readFileSync("src/components/dashboard/OwnerDashboard.tsx", "utf8");
    expect(dash).toContain("oldestWaitingDays={awaiting.oldest?.days ?? 0}");
  });

  it("aucun email ajouté (lot R1)", () => {
    const dash = readFileSync("src/components/dashboard/OwnerDashboard.tsx", "utf8");
    expect(dash).not.toMatch(/sendTransactionalEmail|send-transactional-email/);
  });
});

describe("X3a, B-08 : le gardien sait depuis quand il attend et ce qu'il peut faire", () => {
  it("au-delà de 7 jours sans réponse, sur une annonce publiée", () => {
    expect(sitterWaitingDays("pending", "published", ago(9), NOW)).toBe(9);
    expect(sitterWaitingDays("viewed", "published", ago(7), NOW)).toBe(7);
    expect(sitterWaitingDays("pending", "published", ago(6), NOW)).toBeNull();
    expect(sitterWaitingDays("discussing", "published", ago(20), NOW)).toBeNull();
    expect(sitterWaitingDays("pending", "expired", ago(20), NOW)).toBeNull();
    expect(sitterWaitingDays("accepted", "confirmed", ago(20), NOW)).toBeNull();
  });

  it("la note dit le nombre de jours, écrire et retirer, sans tiret long", () => {
    const note = sitterWaitingNote(9);
    expect(note).toContain("depuis 9 jours");
    expect(note).toContain("écrire au propriétaire");
    expect(note).toContain("retirer votre candidature");
    expect(note).not.toMatch(/[\u2013\u2014]/);
  });

  it("daysSince est robuste aux dates absentes ou futures", () => {
    expect(daysSince(null, NOW)).toBe(0);
    expect(daysSince("pas une date", NOW)).toBe(0);
    expect(daysSince(new Date(NOW.getTime() + 86_400_000).toISOString(), NOW)).toBe(0);
  });
});
