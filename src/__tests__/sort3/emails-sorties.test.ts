// Lot SORT3 (13/11/2026) : emails de service des sorties, derrière le drapeau sorties_emails.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { EMAIL_CATEGORY_MAP } from "../../../supabase/functions/_shared/email-categories";

const read = (p: string) => readFileSync(p, "utf8");
const sql = read("drizzle/migrations/0147_sort3_emails_sorties.sql");
const template = read("supabase/functions/_shared/transactional-email-templates/outing-update.tsx");

describe("gabarit outing-update", () => {
  it("déclaré au registre, classé email de service", () => {
    expect(read("supabase/functions/_shared/transactional-email-templates/registry.ts")).toContain("'outing-update': outingUpdate");
    expect(EMAIL_CATEGORY_MAP["outing-update"]).toBe("transactional");
  });
  it("textes du gabarit : ponctuation du projet, formulations affirmatives", () => {
    const visible = template.slice(template.indexOf("const Email"), template.indexOf("const main"));
    expect(visible).not.toMatch(/[—–]/);
    expect(visible).not.toMatch(/\bvoisins?\b/i);
    expect(visible.replace(/\/\/.*$/gm, "")).not.toMatch(/\b(ne|pas|jamais|aucun|aucune|rien)\b/i);
  });
});

describe("migration 0147", () => {
  it("drapeau créé éteint, et lu par les deux points d'entrée", () => {
    expect(sql).toContain("VALUES ('sorties_emails', false,");
    expect(sql.match(/WHERE key = 'sorties_emails'\), false\) THEN\s+RETURN 0;/g)?.length).toBe(2);
  });
  it("une clé d'envoi par destinataire et par moment, un seul gabarit", () => {
    expect(sql).toContain("v_key := 'outing-' || p_kind || '-' || p_outing::text || '-' || p_recipient::text");
    expect(sql).toContain("WHERE NOT EXISTS (SELECT 1 FROM public.email_deferred_queue q WHERE q.idempotency_key = v_key)");
    expect(sql.match(/'outing-update'/g)?.length).toBe(1);
  });
  it("un email en échec laisse passer l'inscription et la modification", () => {
    expect(sql.match(/EXCEPTION WHEN OTHERS THEN\s+NULL;/g)?.length).toBe(2);
  });
  it("rappel : veille, 18 h à Paris, une fois, passage horaire", () => {
    expect(sql).toContain("IF extract(hour FROM v_paris) < 18 THEN");
    expect(sql).toContain("AND (o.starts_at AT TIME ZONE 'Europe/Paris')::date = (v_paris::date + 1)");
    expect(sql).toContain("o.reminder_sent_at IS NULL");
    expect(sql).toContain("cron.schedule('outing-reminders', '12 * * * *'");
  });
  it("fonctions fermées aux membres, entraide intacte", () => {
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.outing_email_enqueue(text, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.outing_enqueue_reminders(timestamptz) FROM PUBLIC, anon, authenticated;");
    expect(sql).not.toMatch(/small_missions/);
  });
  it("textes des emails : ponctuation du projet, « gens du coin »", () => {
    const strings = [...sql.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]).filter((t) => t.length > 25);
    for (const t of strings) {
      expect(t, t).not.toMatch(/[—–]/);
      expect(t, t).not.toMatch(/\bvoisins?\b/i);
    }
    expect(sql).toContain("elle revient aux gens du coin");
  });
});
