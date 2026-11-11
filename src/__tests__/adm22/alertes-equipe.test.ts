import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TEAM_ALERTS, TEAM_ALERT_DEFAULTS, readTeamAlertPrefs } from "@/lib/admin/teamAlerts";

// Lot ADM22 : alertes de l'équipe, au choix de chaque admin.
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const migration = read("drizzle/migrations/0141_adm22_alertes_equipe.sql");
const component = read("src/components/settings/AdminTeamAlertsSection.tsx");
const template = read("supabase/functions/_shared/transactional-email-templates/admin-team-alert.tsx");

describe("ADM22, alertes de l'équipe", () => {
  it("tout est éteint par défaut, côté écran comme côté base", () => {
    expect(TEAM_ALERT_DEFAULTS).toEqual({ contact_email: false, suspicious_email: false, health_email: false });
    expect(readTeamAlertPrefs(null)).toEqual(TEAM_ALERT_DEFAULTS);
    expect(readTeamAlertPrefs({ contact_email: true, health_email: "oui" })).toEqual({
      contact_email: true, suspicious_email: false, health_email: false,
    });
    for (const { key } of TEAM_ALERTS) {
      expect(migration).toContain(`${key} boolean NOT NULL DEFAULT false`);
    }
  });

  it("le bloc est réservé aux comptes admin, à l'écran et en base", () => {
    expect(component).toContain("if (!user?.id || !isAdmin) return null;");
    expect(read("src/pages/Settings.tsx")).toContain("<AdminTeamAlertsSection />");
    expect(migration.match(/has_role\(auth\.uid\(\), 'admin'::public\.app_role\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration).toContain("JOIN public.user_roles r ON r.user_id = p.user_id AND r.role = 'admin'::public.app_role");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.admin_alert_enqueue(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;");
  });

  it("l'alerte ne bloque jamais l'écriture d'origine", () => {
    expect(migration.match(/EXCEPTION WHEN OTHERS THEN/g)?.length).toBe(2);
    expect(migration.match(/AFTER INSERT ON public\.(contact_messages|admin_signals)/g)?.length).toBe(2);
  });

  it("l'email part à l'adresse du compte admin : gabarit sans destinataire fixe, catégorie transactionnelle", () => {
    expect(migration).toContain("'admin-team-alert'");
    expect(template).not.toMatch(/^\s*to:/m);
    expect(read("supabase/functions/_shared/transactional-email-templates/registry.ts")).toContain("'admin-team-alert': adminTeamAlert");
    expect(read("supabase/functions/_shared/email-categories.ts")).toContain("'admin-team-alert'");
  });

  it("un email par événement et par admin, texte constant sans nom ni extrait", () => {
    expect(migration).toContain("'admin-alert-' || p_kind || '-' || p_ref || '-' || p.user_id::text");
    expect(migration).not.toMatch(/NEW\.(name|email|message|subject|metadata)/);
  });

  it("textes sans tiret long", () => {
    for (const source of [component, template, TEAM_ALERTS.map((a) => a.label + a.hint).join(" ")]) {
      expect(source).not.toMatch(/[–—]/);
    }
  });
});
