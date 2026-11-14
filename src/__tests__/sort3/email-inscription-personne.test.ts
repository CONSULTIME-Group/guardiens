/**
 * Lot EML1 (14/11/2026) : « Maria Elisa vient à votre sortie » présente la
 * personne et part en son nom. Demande de Jérémie après l'essai du 14/11.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const sql = read("drizzle/migrations/0156_eml1_email_sortie_personne.sql");
const template = read("supabase/functions/_shared/transactional-email-templates/outing-update.tsx");
const sender = read("supabase/functions/send-transactional-email/index.ts");

describe("EML1, la personne dans l'email d'inscription", () => {
  it("la base pose photo, prénom, ville, ancienneté, identité vérifiée et fiche", () => {
    expect(sql).toContain("-- eml1_email_sortie_personne");
    for (const field of ["'firstName'", "'avatarUrl'", "'city'", "'memberSince'", "'verified'", "'profileUrl'"]) expect(sql).toContain(field);
    expect(sql).toContain("'https://guardiens.fr/gardiens/' || p.id::text");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.outing_email_enqueue(text, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;");
    expect(sql).not.toMatch(/[—–]/);
  });
  it("le gabarit montre la fiche de la personne avant le texte", () => {
    expect(template.indexOf("<PersonCard actor={actor} />")).toBeGreaterThan(-1);
    expect(template.indexOf("<PersonCard actor={actor} />")).toBeLessThan(template.indexOf("{body ? <Text style={text}>{body}</Text> : null}"));
    expect(template).toContain("Voir sa fiche");
    expect(template).toContain("Identité vérifiée");
  });
  it("l'expéditeur porte le prénom, le prestataire ne suit plus ces emails", () => {
    expect(sender).toContain("personSenderFrom(templateData?.actor?.firstName, FROM_DOMAIN)");
    expect(sender).toContain("new Set(['outing-update'])");
    expect(sender).toContain("PROVIDER_TRACKING_OFF.has(templateName) ? { opens: false, clicks: false }");
  });
});
