import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEFAULT_LEADS_PERIOD, LEADS_TRACKING_START, buildChannelLeads, cleanLandingPath,
  leadsCoverage, leadsPeriodLabel, leadsRange,
} from "@/lib/admin/channelLeads";
import { templateTable } from "@/lib/admin/seoPilot";
import { SIGNUP_FAILURE_LABELS } from "@/components/admin/AdminSignupFunnelTab";
import { buildSnapshotRows, shouldSnapshot, snapshotPath } from "../../../supabase/functions/_shared/gsc-snapshot";

const sql = readFileSync("drizzle/migrations/0174_trf3_trf4_justesse_collecte.sql", "utf8");

describe("TRF-3, onglet Leads", () => {
  it("s'ouvre depuis le début du suivi de la source", () => {
    expect(DEFAULT_LEADS_PERIOD).toBe("suivi");
    expect(leadsPeriodLabel("suivi")).toBe("Depuis le suivi (12/11)");
    expect(leadsRange("suivi", new Date("2026-11-15T21:00:00Z"))).toEqual({ from: LEADS_TRACKING_START, to: "2026-11-15" });
    expect(leadsRange(7, new Date("2026-11-15T21:00:00Z"))).toEqual({ from: "2026-11-09", to: "2026-11-15" });
  });
  it("range la source non enregistrée en dernier et mesure la couverture", () => {
    const leads = buildChannelLeads({ sits_published: 22, rows: [
      { channel: "inconnu", is_campaign: false, visits: 0, signups: 202, published_members: 16 },
      { channel: "recherche_naturelle", is_campaign: false, visits: 73, signups: 9, published_members: 1 },
      { channel: "retour_membre", is_campaign: false, visits: 120, signups: 0, published_members: 0 },
    ] });
    expect(leads.channels.at(-1)?.channel).toBe("inconnu");
    expect(leads.channels.at(-1)?.label).toBe("Source non enregistrée");
    expect(leads.channels.find((c) => c.channel === "retour_membre")?.label).toBe("Retours de membres connectés");
    const c = leadsCoverage(leads.channels);
    expect(c).toMatchObject({ signups: 211, known: 9, publishedMembers: 17, publishedKnown: 1 });
  });
  it("nettoie un chemin d'arrivée pollué", () => {
    expect(cleanLandingPath("/annonces/une-garde-de-2-chiens-et-1-chat-saint-vulbas-f5e13dPartagez")).toBe("/annonces/une-garde-de-2-chiens-et-1-chat-saint-vulbas-f5e13d");
    expect(cleanLandingPath("/")).toBe("/");
    expect(cleanLandingPath("/house-sitting/lyon/?utm_source=fb")).toBe("/house-sitting/lyon");
  });
});

describe("TRF-3, base", () => {
  it("sépare les retours de membres de l'accès direct", () => {
    expect(sql).toContain("WHEN member AND public.derive_signup_channel(src) = 'direct' THEN 'retour_membre'");
  });
  it("compte les inscrits par canal sur la même cohorte que Leads", () => {
    const fn = sql.slice(sql.indexOf("FUNCTION public.admin_signup_sources"));
    expect(fn.slice(0, fn.indexOf("$function$;"))).toContain("pr.account_status::text <> 'deleted'");
  });
  it("lit le motif d'échec dans error_code", () => {
    expect(sql).toContain("public.trf3_signup_failure_code(metadata) AS code");
    expect(sql).toContain("LIKE '%for security purposes%' THEN 'rate_limited'");
    expect(SIGNUP_FAILURE_LABELS.weak_password).toMatch(/Mot de passe refusé/);
    expect(SIGNUP_FAILURE_LABELS.rate_limited).toMatch(/Second envoi/);
  });
});

describe("TRF-3, onglet SEO", () => {
  it("compte au numérateur les seules pages du sitemap", () => {
    const totals = new Map([
      ["/house-sitting/lyon", { impressions: 10, clicks: 1, position: 5 }],
      ["/house-sitting/ancien", { impressions: 4, clicks: 0, position: 9 }],
    ]) as never;
    const row = templateTable(["/house-sitting/lyon", "/house-sitting/annecy"], totals).find((r) => r.template === "villes")!;
    expect(row).toMatchObject({ inSitemap: 2, seenInSitemap: 1, offSitemap: 1, seen: 2 });
  });
});

describe("TRF-4, relevé hebdomadaire Search Console", () => {
  it("écrit un relevé par semaine", () => {
    expect(shouldSnapshot(null, "2026-11-13")).toBe(true);
    expect(shouldSnapshot("2026-11-13", "2026-11-16")).toBe(false);
    expect(shouldSnapshot("2026-11-13", "2026-11-20")).toBe(true);
  });
  it("regroupe les pages par chemin et garde les requêtes vues cinq fois", () => {
    expect(snapshotPath("https://guardiens.fr/house-sitting/lyon/?lang=en#prix")).toBe("/house-sitting/lyon");
    const rows = buildSnapshotRows({
      allPages: [
        { page: "https://guardiens.fr/house-sitting/lyon", clicks: 2, impressions: 100, position: 10 },
        { page: "https://guardiens.fr/house-sitting/lyon#prix", clicks: 1, impressions: 100, position: 20 },
      ],
      allQueries: [
        { query: "home sitter", clicks: 1, impressions: 1743, position: 18.46 },
        { query: "rare", clicks: 0, impressions: 2, position: 3 },
      ],
      queryTopPages: { "home sitter": "https://guardiens.fr/house-sitting/valence" },
    }, "2026-11-13", 29);
    expect(rows).toEqual([
      { period_end: "2026-11-13", kind: "page", key: "/house-sitting/lyon", clicks: 3, impressions: 200, position: 15, top_page: null, period_days: 29 },
      { period_end: "2026-11-13", kind: "query", key: "home sitter", clicks: 1, impressions: 1743, position: 18.46, top_page: "/house-sitting/valence", period_days: 29 },
    ]);
  });
  it("journalise les titres d'articles réécrits", () => {
    expect(sql).toContain("AFTER UPDATE OF meta_title, meta_description ON public.articles");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.seo_action_log");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.seo_gsc_snapshots");
  });
});
