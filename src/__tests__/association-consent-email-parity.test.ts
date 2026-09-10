import { describe, it, expect } from "vitest";
import {
  ASSOCIATION_CONSENT_SUBJECT,
  buildConsentEmail,
  buildConsentText,
} from "@/lib/associationConsentEmail";
import {
  ASSOCIATION_CONSENT_SUBJECT as SERVER_SUBJECT,
  buildAssociationConsentEmail,
} from "../../supabase/functions/_shared/association-consent-email";

const NAME = "Refuge du Val";
const URL = "https://guardiens.fr/associations/refuge-du-val";

describe("demande d'accord aux associations, parité des deux textes", () => {
  it("produit exactement le même objet et le même texte des deux côtés", () => {
    const server = buildAssociationConsentEmail({ name: NAME, ficheUrl: URL });
    expect(ASSOCIATION_CONSENT_SUBJECT).toBe(SERVER_SUBJECT);
    expect(buildConsentText(NAME, URL)).toBe(server.text);
  });

  it("cite le nom, l'URL et respecte la ponctuation imposée", () => {
    const server = buildAssociationConsentEmail({ name: NAME, ficheUrl: URL });
    expect(server.text).toContain(NAME);
    expect(server.text).toContain(URL);
    expect(server.text.includes("\u2014")).toBe(false);
    expect(server.text.includes("\u2013")).toBe(false);
    expect(server.text.toLowerCase().includes("voisin")).toBe(false);
  });

  it("rend le lien cliquable en clair dans la version HTML", () => {
    const { html } = buildAssociationConsentEmail({ name: NAME, ficheUrl: URL });
    expect(html).toContain(`<a href="${URL}"`);
    expect(html).toContain(URL);
    expect(html).toContain("max-width:600px");
    expect(html).not.toContain("<img");
  });

  it("garde l'objet dans la version copiée depuis l'admin", () => {
    expect(buildConsentEmail(NAME, URL)).toContain("Objet :");
    expect(buildConsentEmail(NAME, URL)).toContain(NAME);
  });
});
