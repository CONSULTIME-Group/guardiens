/** Lot JOURN3 (24/11/2026) : tâches SQL journalisées (migration 0186) et hub /projets au sitemap seulement quand il est indexable. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createSitemapDocument } from "../../../supabase/functions/sitemap/live.js";

const read = (p: string) => readFileSync(p, "utf8");
const sql = read("drizzle/migrations/0186_journ3_taches_sql_journalisees.sql");

describe("JOURN3, enveloppe de journal des tâches SQL", () => {
  it("un échec est rattrapé et journalisé, il n'annule que la commande", () => {
    expect(sql).toMatch(/BEGIN\s+EXECUTE _cmd;\s+EXCEPTION WHEN OTHERS THEN/);
    expect(sql).toContain("VALUES (p_name, _started, clock_timestamp(), 'failed',");
  });
  it("un succès s'écrit à chaque passage, ou une fois par heure pour les tâches fréquentes", () => {
    expect(sql).toContain("make_interval(mins => p_heartbeat_minutes)");
    expect(sql).toContain("WHEN r.jobname IN ('purge-cron-run-details', 'retry-missing-geocoding') THEN 60 ELSE 0");
  });
  it("onze tâches nommées, horaires inchangés, rejouable", () => {
    const names = sql.match(/^\s+'[a-z0-9-]+',?$/gm) ?? [];
    expect(names.length).toBe(11);
    expect(sql).toContain("AND command NOT ILIKE '%run_logged_cron%'");
    expect(sql).not.toMatch(/schedule\s*:=/);
  });
  it("la fonction est fermée aux membres et le contrat suit la migration", () => {
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.run_logged_cron(text, text, integer) FROM PUBLIC, anon, authenticated;");
    const contracts = JSON.parse(read("scripts/db/production-contracts.json"));
    const c = contracts.contracts.find((x: { migration: string }) => x.migration === "0186_journ3_taches_sql_journalisees.sql");
    expect(c?.checks?.length).toBe(3);
  });
});

describe("Hub /projets et sitemap", () => {
  const config = { version: 1, siteUrl: "https://guardiens.fr", cityLandingPages: ["lyon"],
    staticPages: [{ loc: "/", indexable: true, changefreq: "daily", priority: "1.0" }, { loc: "/projets", indexable: true, changefreq: "weekly", priority: "0.7" }] };
  const sources = (projets: unknown[]) => ({ ...Object.fromEntries(["articles", "seoCity", "guides", "depts", "breeds", "profiles", "sits", "entraideMissions", "associations", "entraideCities"].map(k => [k, []])), projetMissions: projets });
  it("sans projet indexable, /projets reste hors du sitemap (la page porte noindex)", () => {
    expect(createSitemapDocument(config, sources([])).locs).not.toContain("/projets");
  });
  it("dès un projet indexable, /projets revient au sitemap avec sa fiche", () => {
    const locs = createSitemapDocument(config, sources([{ loc: "/projets/haie", lastmod: null, changefreq: "weekly", priority: "0.5" }])).locs;
    expect(locs).toContain("/projets");
    expect(locs).toContain("/projets/haie");
  });
});
