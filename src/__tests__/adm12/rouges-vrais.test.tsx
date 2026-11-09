/**
 * Lot ADM12 (arène admin du 09/11/2026, GO de Jérémie) : rouges vrais,
 * pastilles d'accord.
 * - Un voyant est rouge tant que sa cause est présente, pas plus.
 * - « Annonce sans candidature » a une seule définition : en ligne depuis
 *   48 h, départ à venir, aucune candidature active.
 * - Une lecture en échec donne « ? » jusqu'au bouton du menu mobile.
 * - Le nurturing ne compte en échec que les vrais échecs.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isListingToStaff } from "@/lib/admin/listingToStaff";
import { isNurturingFailure, nurturingOutcome, nurturingReasonLabel } from "@/lib/admin/nurturingOutcome";
import { badgeTotalText, navItemTarget, adminNavGroups_export, BADGE_TITLES } from "@/components/admin/AdminSidebar";
import { buildPilotage, type PilotageSignal } from "@/lib/admin/pilotage";
import { SIGNAL_TYPES, signalNature } from "../../../supabase/functions/_shared/admin-signal-config.ts";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const MIGRATION = read("drizzle/migrations/0121_adm12_rouges_vrais.sql");

// Lundi 09/11/2026, 9 h à Paris.
const NOW = new Date("2026-11-09T08:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe("une seule définition des annonces sans candidature", () => {
  const base = { status: "published", published_at: hoursAgo(72), start_date: "2026-12-24", activeApplications: 0 };
  it("publiée depuis 48 h, départ à venir, aucune candidature active", () => {
    expect(isListingToStaff(base, NOW)).toBe(true);
  });
  it("moins de 48 h en ligne : pas encore (Brassac 37 h, Saint-Vulbas 17 h le 09/11)", () => {
    expect(isListingToStaff({ ...base, published_at: hoursAgo(37) }, NOW)).toBe(false);
    expect(isListingToStaff({ ...base, published_at: hoursAgo(17) }, NOW)).toBe(false);
  });
  it("départ passé ou candidature active : hors file", () => {
    expect(isListingToStaff({ ...base, start_date: "2026-11-08" }, NOW)).toBe(false);
    expect(isListingToStaff({ ...base, activeApplications: 1 }, NOW)).toBe(false);
    expect(isListingToStaff({ ...base, status: "draft" }, NOW)).toBe(false);
  });
  it("départ aujourd'hui : encore dans la file", () => {
    expect(isListingToStaff({ ...base, start_date: "2026-11-09" }, NOW)).toBe(true);
  });
  it("la base dit la même chose : pastille, signal du matin, page", () => {
    const badge = MIGRATION.slice(MIGRATION.indexOf("admin_menu_badges()"), MIGRATION.indexOf("detect_stale_sits()"));
    expect(badge).toContain("interval '48 hours'");
    expect(badge).toContain("s.start_date::date >= v_today");
    expect(badge).toContain("a.status NOT IN ('rejected','cancelled')");
    const detect = MIGRATION.slice(MIGRATION.indexOf("FUNCTION public.detect_stale_sits()"), MIGRATION.indexOf("-- 3."));
    expect(detect).toContain("interval '48 hours'");
    expect(detect).toContain("a.status NOT IN ('rejected', 'cancelled')");
    expect(detect).not.toContain("COUNT(a.id) = 0");
    expect(read("src/pages/admin/AdminListings.tsx")).toContain("isListingToStaff(");
  });
  it("la vue d'ensemble garde l'annonce sans gardien dans le rayon (sévérité info)", () => {
    const s: PilotageSignal = {
      id: "v", signal_type: "no_applications", severity: "info", entity_type: "sit", entity_id: "vabres",
      detected_at: "2026-10-26T10:00:00Z", metadata: {},
    };
    const m = buildPilotage([s], new Map([["vabres", { id: "vabres", start_date: "2027-02-06" }]]), NOW.getTime());
    expect(m.vous.map((l) => l.type)).toContain("no_applications");
  });
  it("un libellé, sans anglicisme", () => {
    expect(BADGE_TITLES.sitsToStaff).toBe("annonces sans candidature depuis 48 h");
    expect(JSON.stringify(BADGE_TITLES)).not.toMatch(/staff/);
  });
});

describe("voyants : rouge tant que la cause est présente", () => {
  const health = MIGRATION.slice(MIGRATION.indexOf("FUNCTION public.admin_site_health()"));
  it("tâches : en retard ou dernier passage en échec, jamais un échec rattrapé", () => {
    expect(health).toContain("x->>'state' = 'critical' OR x->>'last_status' = 'failed'");
    expect(health).not.toContain("IN ('critical', 'degraded')");
    expect(health).toContain("DISTINCT ON (l.edge_name)");
    expect(health).toContain("'link', '/admin?plus=taches'");
  });
  it("chaque voyant a un lien", () => {
    const links = health.match(/'link', ([^)\n]+)\)/g) ?? [];
    expect(links.length).toBe(6);
    for (const l of links) expect(l).not.toContain("NULL");
  });
  it("rendu SEO : même cycle et même plafond que seo_reserve_render", () => {
    expect(health).toContain("date_trunc('month', v_paris) + interval '3 days'");
    expect(health).toContain("v_renders >= 9900 AND v_allowance <= 0");
    expect(health).not.toContain("prerender_monthly_budget_reached");
  });
  it("emails : phrase française, file du matin jugée après 14 h", () => {
    expect(health).not.toContain("signal d''envoi ouvert");
    expect(health).toContain("v_paris::time < time '14:00'");
  });
  it("chaque signal qui allume un voyant se ferme avec sa cause", () => {
    for (const t of ["prerender_monthly_budget_reached", "digest_queue_morning_backlog", "sit_publish_error"]) {
      expect(MIGRATION).toMatch(new RegExp(`s\\.signal_type = '${t}'`));
    }
    expect(MIGRATION).toContain("UNION ALL SELECT * FROM adm12_prerender_back");
    expect(MIGRATION).toContain("UNION ALL SELECT * FROM adm12_digest_drained");
    expect(MIGRATION).toContain("UNION ALL SELECT * FROM adm12_sit_published");
    expect(MIGRATION).toContain("'email_destroyed' AND s.detected_at < now() - interval '7 days'");
    expect(MIGRATION.trimEnd().endsWith("SELECT * FROM public.auto_resolve_admin_signals();")).toBe(true);
  });
  it("contrat de post-déploiement présent", () => {
    expect(read("scripts/db/production-contracts.json")).toContain("0121_adm12_rouges_vrais.sql");
  });
  it("aucun tiret cadratin ni demi-cadratin", () => {
    expect(MIGRATION).not.toMatch(/[\u2013\u2014]/);
  });
});

describe("pastilles du menu", () => {
  const items = adminNavGroups_export.flatMap((g) => g.items);
  it("« ? » remonte au total quand la lecture échoue, jamais 0 ni rien", () => {
    expect(badgeTotalText(items, {}, true)).toBe("?");
    expect(badgeTotalText(items, { sitsToStaff: 6 }, false)).toBe("6");
    expect(badgeTotalText(items, {}, false)).toBeNull();
  });
  it("Messagerie n'a plus de pastille (la page ne montre pas les échecs)", () => {
    const msg = items.find((i) => i.to === "/admin/messages");
    expect(msg?.badgeKey).toBeUndefined();
    expect(badgeTotalText(items, { adminMessageFailed: 3 }, false)).toBeNull();
  });
  it("une entrée allumée mène tout entière à sa file filtrée", () => {
    const annonces = items.find((i) => i.to === "/admin/listings")!;
    expect(navItemTarget(annonces, { show: true, text: "6" })).toBe("/admin/listings?filter=to_staff");
    expect(navItemTarget(annonces, { show: false, text: "0" })).toBe("/admin/listings");
    expect(navItemTarget(annonces, { show: true, text: "?" })).toBe("/admin/listings");
  });
  it("une seule marque par entrée sur téléphone", () => {
    expect(read("src/components/admin/AdminLayout.tsx")).not.toContain("h-2 w-2 rounded-full bg-destructive");
  });
});

describe("nurturing : vrais échecs seulement", () => {
  it("plafond, désinscription, adresse bloquée, compte suspendu, saut : écarts voulus", () => {
    for (const reason of ["frequency_capped", "skipped_unsubscribed_category", "skipped_email_suppressed", "skipped_account_suspended", "skip_condition_met", "skipped_sit_not_published", "already_sent_other_path", "owner_never_published"]) {
      expect(nurturingOutcome({ sent: false, reason })).toBe("skipped");
      expect(isNurturingFailure({ sent: false, reason })).toBe(false);
    }
    expect(nurturingOutcome({ sent: false, reason: "exit_condition_met" })).toBe("exited");
    expect(nurturingOutcome({ sent: true, reason: null })).toBe("sent");
  });
  it("envoi refusé, erreur d'évaluation, motif inconnu : échec", () => {
    for (const reason of ["send_failed_400", "send_transient_failure_502", "eval_error", "template_not_found", null]) {
      expect(isNurturingFailure({ sent: false, reason })).toBe(true);
    }
  });
  it("motifs en français, jamais l'identifiant", () => {
    expect(nurturingReasonLabel("frequency_capped")).toBe("Reporté par le plafond de fréquence");
    expect(nurturingReasonLabel("send_transient_failure_502")).toBe("Échec passager à l'envoi");
    expect(nurturingReasonLabel("quelque_chose_de_neuf")).toBe("Autre motif");
    const page = read("src/pages/admin/AdminNurturing.tsx");
    expect(page).not.toContain("(evaluator)");
    expect(page).not.toContain("Échecs evaluator");
  });
});

describe("signal d'entraide déclaré", () => {
  it("mission_no_audience a un libellé et revient aux fondateurs", () => {
    expect(read("supabase/functions/_shared/admin-work-list.ts")).toContain("tout le monde à 30 km a été prévenu");
    expect(SIGNAL_TYPES.mission_no_audience?.label).toBe("Coup de main sans personne de plus à prévenir à 30 km");
    expect(signalNature("mission_no_audience")).toBe("vous");
  });
});
