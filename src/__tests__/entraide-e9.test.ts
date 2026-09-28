import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const read = (p: string) => readFileSync(p, "utf8");

describe("E9 garde-fou gabarit sans file", () => {
  const src = read("supabase/functions/send-mass-email/index.ts");
  const guard = src.indexOf("if (filters.template_name) {");
  it("409 avec le message exact, avant toute création de ligne mass_emails", () => {
    expect(guard).toBeGreaterThan(0);
    const block = src.slice(guard, src.indexOf("=== Anti double-envoi"));
    expect(block).toContain("Ce gabarit part uniquement par la file d'envoi. Activez la file avant de lancer.");
    expect(block).toContain("status: 409");
    expect(block).toContain('.select("mass_email_use_queue")');
    expect(guard).toBeLessThan(src.indexOf('.from("mass_emails")'));
    expect(guard).toBeLessThan(src.indexOf("htmlTemplate = buildHtml(subject"));
  });
});

describe("E9 expéditeur des fondateurs", () => {
  it("send-transactional-email passe par la constante partagée", () => {
    const src = read("supabase/functions/send-transactional-email/index.ts");
    expect(src).toContain("transactionalSender(templateName, SITE_NAME, FROM_DOMAIN)");
    expect(src).not.toContain("'contact.guardiens@gmail.com'");
  });
});

describe("E9 préréglage A bis", () => {
  const src = read("src/pages/admin/AdminMassEmails.tsx");
  const p = src.slice(src.indexOf("Entraide A bis, relance de la ligne"));
  it("objet du gabarit et début réel de l'email, template inchangé", () => {
    expect(p).toContain('subject: "Rendre service fait du bien. À vous aussi."');
    expect(p).toContain("Une partie de cartes, un panier de légumes, un trajet en voiture");
    expect(p.slice(0, 800)).toContain('template_name: "entraide-ligne-relance"');
  });
});
