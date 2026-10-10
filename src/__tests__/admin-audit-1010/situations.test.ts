import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sitSituation, sitDistribution, listingCity, listingFilterScope, missionSituation, SIT_BUCKETS_PRIMARY, SIT_BUCKETS_SECONDARY } from "@/lib/admin/listingSituation";
import { proximityBlockReason } from "@/lib/admin/missionDiffusion";
import { reconcileNotified } from "@/lib/admin/missionNotified";
import { buildTimeline, sitFieldEvents, statusHistoryEvents, adminLogEvents } from "@/lib/admin/listingHistory";
import { resolveSitStatusBadge } from "@/lib/sitStatus";

const NOW = new Date("2026-10-10T12:00:00Z");

describe("annonces : brouillon, retrait, masquage, annulation", () => {
  it("un vrai brouillon est en préparation", () => {
    const s = sitSituation({ status: "draft" });
    expect(s.label).toBe("En préparation");
    expect(s.bucket).toBe("preparing");
    expect(s.detail).toBe("Brouillon, aucun retrait enregistré, non visible");
  });
  it("confirmée, en cours, terminée, archivée : fiche consultable, avancement séparé", () => {
    for (const status of ["confirmed", "in_progress", "completed", "archived"]) {
      const s = sitSituation({ status });
      expect(s.visible).toBe(true);
      expect(s.visibility).toBe("Fiche consultable publiquement");
    }
    expect(sitSituation({ status: "confirmed" }).label).toBe("Gardien confirmé");
  });
  it("code archived : retrait / archivage enregistré, sans rôle inventé", () => {
    const s = sitSituation({ status: "cancelled", user_id: "o1", cancellation_reason: "archived" });
    expect(s.label).toBe("Retrait / archivage enregistré");
    expect(s.detail).toBe("Acteur non enregistré");
    const h = statusHistoryEvents([{ old_status: "published", new_status: "cancelled", changed_at: "2026-10-08T10:00:00Z", changed_by: "o1", reason: "archived" }], "o1");
    expect(h[0]).toMatchObject({ at: "2026-10-08T10:00:00Z", actor: "Propriétaire", detail: "Retrait / archivage enregistré" });
  });
  it("motif connu, acteur absent : acteur non enregistré", () => {
    expect(sitSituation({ status: "cancelled", user_id: "o1", cancellation_reason: "Voyage" }).detail).toBe("Motif : Voyage, acteur non enregistré");
  });
  it("found_offline : retirée par le propriétaire, solution trouvée ailleurs", () => {
    const s = sitSituation({ status: "draft", unpublished_at: "2026-10-01", last_unpublished_reason: "found_offline" });
    expect(s.label).toBe("Retirée par le propriétaire");
    expect(s.detail).toBe("Solution trouvée ailleurs");
    expect(s.declaredOutcome).toBe("Solution trouvée ailleurs");
    expect(s.bucket).toBe("withdrawn");
  });
  it("masquage admin identifié par hidden_by", () => {
    expect(sitSituation({ status: "cancelled", hidden_by: "a1" }).label).toBe("Masquée par l'équipe");
  });
  it("annulation sans acteur ni motif : aucun auteur inventé", () => {
    const s = sitSituation({ status: "cancelled", user_id: "o1" });
    expect(s.label).toBe("Annulée, motif non renseigné");
    expect(s.label).not.toContain("auteur");
    expect(resolveSitStatusBadge("cancelled").label).toBe("Annulée");
  });
  it("annulation par le propriétaire avec motif", () => {
    const s = sitSituation({ status: "cancelled", user_id: "o1", cancelled_by: "o1", cancellation_reason: "Voyage annulé" });
    expect(s.label).toBe("Annulée par le propriétaire");
    expect(s.detail).toBe("Motif : Voyage annulé");
  });
  it("filtres : préparation et retirées séparées, anciens filtres conservés", () => {
    expect(listingFilterScope("preparing")).toEqual({ status: "draft", unpublished: "null" });
    expect(listingFilterScope("withdrawn")).toEqual({ status: "draft", unpublished: "not_null" });
    expect(listingFilterScope("draft")).toEqual({ status: "draft" });
    expect(listingFilterScope("no_draft")).toEqual({ statusNeq: "draft" });
    expect(listingFilterScope("all")).toEqual({});
  });
});

describe("répartition complète", () => {
  it("la somme des cases égale le total, expirées et terminées comprises", () => {
    const rows = [
      ...Array(16).fill({ status: "published" }),
      ...Array(18).fill({ status: "draft" }),
      ...Array(7).fill({ status: "draft", unpublished_at: "2026-10-01" }),
      ...Array(13).fill({ status: "expired" }),
      ...Array(3).fill({ status: "completed" }),
      ...Array(14).fill({ status: "archived" }),
      ...Array(2).fill({ status: "cancelled" }),
    ];
    const d = sitDistribution(rows);
    const sum = [...SIT_BUCKETS_PRIMARY, ...SIT_BUCKETS_SECONDARY].reduce((a, b) => a + d.counts[b.key], 0);
    expect(d.total).toBe(73);
    expect(sum).toBe(73);
    expect(d.counts.expired).toBe(13);
    expect(d.counts.completed).toBe(3);
    expect(d.counts.withdrawn).toBe(7);
    expect(d.counts.preparing).toBe(18);
  });
  it("ville de l'annonce prioritaire, profil en repli signalé", () => {
    expect(listingCity({ city: "Marlhes", owner: { city: "Saint-Étienne" } })).toEqual({ city: "Marlhes", fromOwner: false });
    expect(listingCity({ city: null, owner: { city: "Saint-Étienne" } })).toEqual({ city: "Saint-Étienne", fromOwner: true });
  });
});

describe("entraide : personne retenue, clôtures", () => {
  it("in_progress = personne retenue, pas intervention en cours", () => {
    const s = missionSituation({ status: "in_progress" }, NOW);
    expect(s.label).toBe("Personne retenue");
    expect(s.detail).toBe("En préparation avec un membre");
  });
  it("clôture admin et automatique sans succès supposé", () => {
    expect(missionSituation({ status: "completed", close_reason: "manual_admin" }).label).toBe("Clôturée par l'équipe");
    const auto = missionSituation({ status: "completed", close_reason: "auto_completed_after_date" });
    expect(auto.label).toBe("Clôturée automatiquement après la date");
    expect(auto.declaredOutcome).toBeNull();
    expect(missionSituation({ status: "completed" }).label).toBe("Clôturée, résultat non renseigné");
  });
});

describe("diffusion de proximité", () => {
  it("refuse annulée, terminée, masquée, date de besoin dépassée", () => {
    expect(proximityBlockReason({ status: "cancelled" }, NOW)).toContain("annulée");
    expect(proximityBlockReason({ status: "completed" }, NOW)).toContain("terminée");
    expect(proximityBlockReason({ status: "open", hidden_by: "a" }, NOW)).toContain("masquée");
    expect(proximityBlockReason({ status: "open", mission_type: "besoin", date_needed: "2026-10-06" }, NOW)).toContain("Date de besoin");
  });
  it("autorise une offre durable sans échéance et une demande à venir", () => {
    expect(proximityBlockReason({ status: "open", mission_type: "offre", date_needed: "2026-01-01" }, NOW)).toBeNull();
    expect(proximityBlockReason({ status: "open", mission_type: "offre" }, NOW)).toBeNull();
    expect(proximityBlockReason({ status: "open", mission_type: "besoin", date_needed: "2026-10-20" }, NOW)).toBeNull();
  });
  it("le serveur applique le garde-fou avant le calcul des destinataires", () => {
    const src = readFileSync("supabase/functions/send-mass-email-proximity/index.ts", "utf-8");
    const guard = src.indexOf("proximityBlockReason(state");
    const compute = src.indexOf("await computeRecipients(");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(compute);
  });
});

describe("notifiés réconciliés", () => {
  it("déduplique file automatique et campagne par publication et destinataire", () => {
    const counts = reconcileNotified(
      [{ mission_id: "m1", helper_id: "u1" }, { mission_id: "m1", helper_id: "u2" }, { mission_id: "m2", helper_id: "u1" }],
      { u1: "A@x.fr", u2: "b@x.fr" },
      [{ mission_id: "m1", email: "a@x.fr" }, { mission_id: "m1", email: "c@x.fr" }, { mission_id: "m3", email: "d@x.fr" }],
    );
    expect(counts).toEqual({ m1: 3, m2: 1, m3: 1 });
  });
});

describe("historique", () => {
  it("trie, déduplique et ne fabrique aucun événement", () => {
    const sit = { user_id: "o1", created_at: "2026-09-01T10:00:00Z", hidden_at: "2026-10-06T09:00:00Z" };
    const t = buildTimeline([
      ...sitFieldEvents(sit),
      ...statusHistoryEvents([{ old_status: "draft", new_status: "published", changed_at: "2026-09-02T10:00:00Z", changed_by: "o1", reason: null }], "o1"),
      ...adminLogEvents([{ action: "hide_listing", created_at: "2026-10-06T09:01:00Z" }]),
    ]);
    expect(t.map((e) => e.kind)).toEqual(["create", "publish", "hide"]);
    expect(t[2].source).toBe("admin_log");
    expect(t[1].actor).toBe("Propriétaire");
    expect(buildTimeline(sitFieldEvents({}))).toEqual([]);
  });
  it("garde deux actions réelles proches d'une même source et trie le résultat", () => {
    const t = buildTimeline([
      ...adminLogEvents([
        { action: "hide_listing", created_at: "2026-10-06T09:03:00Z", note: "Doublon" },
        { action: "hide_listing", created_at: "2026-10-06T09:01:00Z", note: "Signalement" },
      ]),
      ...sitFieldEvents({ created_at: "2026-10-06T09:02:00Z" }),
    ]);
    expect(t.map((e) => e.detail ?? e.kind)).toEqual(["Signalement", "create", "Doublon"]);
  });
});
