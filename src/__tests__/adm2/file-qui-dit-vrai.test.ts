/**
 * Lot ADM2 (18/10/2026) : la file, l'email du matin et l'accueil disent vrai.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { waitingQueueItems } from "@/pages/admin/_components/dashboard/SignalsSection";
import { freshAiActions, AI_ACTIONS_MAX_AGE_MS } from "@/pages/admin/_components/dashboard/useActivityAnalysis";
import { sitGroupOwner } from "@/components/admin/signals/SitSignalGroupCard";
import type { AdminSignalBase } from "@/components/admin/signals/signalGrouping";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const SIGNALS_DIR = "src/components/admin/signals";

describe("File « À traiter » : une carte traitée disparaît", () => {
  const section = read("src/pages/admin/_components/dashboard/SignalsSection.tsx");

  it("la file lit une clé rangée sous admin_dashboard_snapshot", () => {
    expect(section).toContain('queryKey: ["admin_dashboard_snapshot", "open"]');
    expect(section).not.toContain('"admin_open_signals"');
  });

  it("chaque carte qui écrit dans admin_signals invalide le préfixe lu par la file", () => {
    const files = readdirSync(resolve(process.cwd(), SIGNALS_DIR)).filter((f) => f.endsWith(".tsx"));
    const writers = files.filter((f) => read(join(SIGNALS_DIR, f)).includes('from("admin_signals")'));
    expect(writers.length).toBeGreaterThan(10);
    for (const f of writers) {
      expect(read(join(SIGNALS_DIR, f)), f).toContain('queryKey: ["admin_dashboard_snapshot"]');
    }
  });
});

describe("Aucun bouton qui ferme sans agir", () => {
  it("plus de relance de masse sans cible ni d'envoi « à faire »", () => {
    for (const f of readdirSync(resolve(process.cwd(), SIGNALS_DIR))) {
      const src = read(join(SIGNALS_DIR, f));
      expect(src, f).not.toContain("envoi manuel à faire");
      expect(src, f).not.toContain("body: {}");
    }
  });

  it("les cartes de comportement ouvrent un vrai email et ne ferment qu'après envoi", () => {
    for (const f of ["RepeatedCancellationsCard.tsx", "RepeatedRepublishCard.tsx", "SitSignalGroupCard.tsx"]) {
      const src = read(join(SIGNALS_DIR, f));
      expect(src, f).toContain("WriteToMemberDialog");
      expect(src, f).toMatch(/onSent=\{/);
    }
    const dialog = read("src/pages/admin/_components/users/WriteToMemberDialog.tsx");
    // onSent seulement sur envoi accepté : jamais dans l'annulation.
    expect(dialog.match(/onSent\?\.\(\)/g)?.length).toBe(2);
  });

  it("le propriétaire de l'annonce est lu dans les métadonnées du groupe", () => {
    const s = (metadata: Record<string, unknown>) => ({ id: "x", signal_type: "pending_application", severity: "critical", entity_type: "application", entity_id: "a", detected_at: "", metadata }) as AdminSignalBase;
    expect(sitGroupOwner([s({}), s({ owner_id: "u1", owner_first_name: " Julie " })])).toEqual({ userId: "u1", name: "Julie" });
    expect(sitGroupOwner([s({ owner_id: "u2" })])).toEqual({ userId: "u2", name: "le propriétaire" });
    expect(sitGroupOwner([s({})])).toBeNull();
  });
});

describe("Accueil", () => {
  it("membres qui attendent : un lien par file non vide, libellés au pluriel juste", () => {
    expect(waitingQueueItems({ contactMessages: 2, reports: 0, deletionRequests: 1, reviewDisputes: 0, verifications: 0 })).toEqual([
      { to: "/admin/contact-messages", label: "2 messages de contact" },
      { to: "/admin/demandes-suppression", label: "1 demande RGPD" },
    ]);
    expect(waitingQueueItems({})).toEqual([]);
  });

  it("suggestions IA : écartées au-delà de 24 h", () => {
    const now = Date.parse("2026-10-18T09:00:00Z");
    const actions = [{ title: "t", why: "w", priority: "haute", link: "/admin" }] as never;
    expect(freshAiActions({ generated_at: new Date(now - 3600_000).toISOString(), actions }, now)).toHaveLength(1);
    expect(freshAiActions({ generated_at: new Date(now - AI_ACTIONS_MAX_AGE_MS - 1).toISOString(), actions }, now)).toEqual([]);
    expect(freshAiActions(null, now)).toEqual([]);
  });

  it("signaux désactivés : message explicite, jamais « Tout est calme »", () => {
    const section = read("src/pages/admin/_components/dashboard/SignalsSection.tsx");
    const i = section.indexOf("!flagEnabled ? (");
    expect(i).toBeGreaterThan(0);
    expect(section.indexOf("Tout est calme")).toBeGreaterThan(i);
  });
});

describe("Migration 0091", () => {
  const sql = read("drizzle/migrations/0091_adm2_file_matin.sql");

  it("ferme la demande Alma seulement avec une réponse réellement partie", () => {
    expect(sql).toContain("alma_contact_answered");
    expect(sql).toContain("e.template_name = 'contact-reply'");
    expect(sql).toContain("UNION ALL SELECT * FROM alma_contact_answered");
  });

  it("annonce sans candidature : 48 h après publication", () => {
    expect(sql).toContain("COALESCE(s.published_at, s.created_at) < now() - interval '48 hours'");
  });

  it("l'email du matin a sa propre tâche et sa ligne de santé", () => {
    expect(sql).toContain("('alert-admin-signals', 1440, 'Email admin du matin')");
    expect(sql).toContain("'alert-admin-signals-daily',\n  '35 5 * * *'");
    const analysis = sql.slice(sql.indexOf("'daily-admin-activity-analysis'"), sql.indexOf("'alert-admin-signals-daily'"));
    expect(analysis).not.toContain("functions/v1/alert-admin-signals");
  });

  it("files humaines lisibles par le seul service_role", () => {
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_human_queues() FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_human_queues() TO service_role;");
  });

  it("aucun tiret cadratin ni demi-cadratin", () => {
    expect(/[—–]/.test(sql)).toBe(false);
  });
});
