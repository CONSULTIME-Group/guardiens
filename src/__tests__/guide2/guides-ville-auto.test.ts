/** Lot GUIDE2 : création automatique des guides de ville en France (migration 0185, défaut V2 de l'audit du 22/11/2026). */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const sql = read("drizzle/migrations/0185_guide2_guides_ville_auto.sql");

describe("GUIDE2, sélection des demandes", () => {
  it("ne retient que les demandes en attente, en France, avec une annonce active", () => {
    expect(sql).toContain("WHERE gr.status = 'pending'");
    expect(sql).toContain("AND upper(coalesce(nullif(trim(gr.country), ''), 'FR')) = 'FR'");
    expect(sql).toContain("AND gr.active_sits_count >= 1");
  });
  it("trois essais au plus, espacés de 7 jours, jamais sur un guide déjà créé", () => {
    expect(sql).toContain("AND gr.auto_attempts < 3");
    expect(sql).toContain("gr.auto_attempted_at < now() - interval '7 days'");
    expect(sql).toContain("AND NOT EXISTS (SELECT 1 FROM public.city_guides g WHERE g.slug = gr.slug)");
  });
  it("le plafond se compte par jour de Paris", () => {
    expect(sql).toContain("date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris'");
    expect(sql).toContain("_room := greatest(coalesce(p_daily_cap, 5) - _done_today, 0);");
  });
});

describe("GUIDE2, appel et journal", () => {
  it("appelle generate-city-guide avec la clé du coffre, jamais la clé publique", () => {
    expect(sql).toContain("/functions/v1/generate-city-guide");
    expect(sql).toContain("WHERE name = 'supabase_service_role_key'");
    expect(sql).not.toMatch(/anon_key|publishable/i);
  });
  it("écrit une ligne de journal par passage, avec un statut admis par cron_run_log", () => {
    expect(sql).toContain("'auto-create-city-guides', _started, clock_timestamp(), 'success'");
    expect(sql).toContain("'auto-create-city-guides', _started, clock_timestamp(), 'failed'");
    expect(sql).not.toMatch(/clock_timestamp\(\), 'error'/);
  });
  it("la fonction est fermée aux membres", () => {
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.auto_create_city_guides(integer) FROM PUBLIC, anon, authenticated;");
  });
  it("la tâche tourne toutes les heures sur une minute qui n'est pas multiple de 5", () => {
    const m = sql.match(/cron\.schedule\('auto-create-city-guides', '(\d+) \* \* \* \*'/);
    expect(m).not.toBeNull();
    expect(Number(m![1]) % 5).not.toBe(0);
  });
  it("le contrat de production suit la migration", () => {
    const contracts = JSON.parse(read("scripts/db/production-contracts.json"));
    const c = contracts.contracts.find((x: { migration: string }) => x.migration === "0185_guide2_guides_ville_auto.sql");
    expect(c?.checks?.length).toBe(3);
  });
});
