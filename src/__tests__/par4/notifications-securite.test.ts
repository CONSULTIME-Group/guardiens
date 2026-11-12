import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Lot PAR4 (12/11/2026) : notifications regroupées par sujet, sécurité en
// sommaire avec une page par sujet.
const settings = readFileSync(resolve(process.cwd(), "src/pages/Settings.tsx"), "utf8");

describe("PAR4", () => {
  it("les cinq emails sont rangés en deux sujets, sans en perdre un", () => {
    const groups = settings.slice(settings.indexOf("const EMAIL_GROUPS"), settings.indexOf("const NotificationsSection"));
    for (const key of ["email_messages", "email_new_application", "email_reminders", "email_review_prompts", "email_sitter_suggestions"]) {
      expect(groups.split(`"${key}"`).length).toBe(2);
    }
    expect(groups).toContain("Vos échanges");
    expect(groups).toContain("Près de chez vous");
    expect(settings).toContain('to="/settings?section=alerts"');
  });

  it("ordre de lecture : cet appareil, les emails, puis les alertes de l'équipe", () => {
    const section = settings.slice(settings.indexOf("const NotificationsSection"));
    expect(section.indexOf("<PushNotificationsSection />")).toBeLessThan(section.indexOf('title="Par email"'));
    expect(section.indexOf('title="Par email"')).toBeLessThan(section.indexOf("<AdminTeamAlertsSection />"));
  });

  it("sécurité : un sommaire de quatre sujets, chacun à son adresse", () => {
    for (const id of ["password", "sessions", "identity", "pro"]) {
      expect(settings).toContain(`{ id: "${id}", label:`);
    }
    expect(settings).toContain('{ section: "security", focus: part }');
    expect(settings).toContain('data-testid="security-hub"');
    expect(settings).toContain('data-testid="security-back"');
    expect(settings).not.toContain("scrollIntoView");
    // Les invitations à vérifier son identité arrivent sur la page Identité.
    expect(settings).toContain('(searchParams.get("src") ? "identity" : null)');
  });
});
