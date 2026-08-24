import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(
  __dirname,
  "../../supabase/functions/_shared/transactional-email-templates",
);

const read = (f: string) => readFileSync(resolve(dir, f), "utf8");

const DEEP_LINK_TEMPLATES = [
  "new-message.tsx",
  "new-application.tsx",
  "unread-messages-reminder.tsx",
  "owner-pending-application-nudge.tsx",
  "first-application-received.tsx",
];

// Gabarits d'avis : le bouton doit déposer la personne directement sur le
// formulaire de dépôt, session ouverte, sans page de connexion intermédiaire.
const REVIEW_DEEP_LINK_TEMPLATES = ["review-reminder.tsx", "review-received.tsx"];

describe("lien profond authentifie dans les emails de conversation", () => {
  it("chaque gabarit concerne accepte deepLinkUrl et l'utilise en priorite", () => {
    for (const f of DEEP_LINK_TEMPLATES) {
      const src = read(f);
      expect(src, f).toContain("deepLinkUrl?: string");
      expect(src, f).toMatch(/deepLinkUrl\s*\|\||\{deepLinkUrl \|\|/);
    }
  });

  it("le bouton principal dit qu'il s'agit de repondre", () => {
    for (const f of DEEP_LINK_TEMPLATES) {
      expect(read(f), f).toContain("Répondre");
    }
    expect(read("new-message.tsx")).not.toContain("Lire et répondre");
    expect(read("unread-messages-reminder.tsx")).not.toContain("Lire et répondre");
  });

  it("le sender injecte le lien profond pour ces gabarits", () => {
    const sender = readFileSync(
      resolve(__dirname, "../../supabase/functions/send-transactional-email/index.ts"),
      "utf8",
    );
    expect(sender).toContain("create_email_deep_link");
    expect(sender).toContain("/acces?t=");
    for (const f of DEEP_LINK_TEMPLATES) {
      expect(sender, f).toContain(`'${f.replace(".tsx", "")}'`);
    }
  });

  it("les gabarits d'avis acceptent deepLinkUrl et l'utilisent en priorite", () => {
    for (const f of REVIEW_DEEP_LINK_TEMPLATES) {
      const src = read(f);
      expect(src, f).toContain("deepLinkUrl?: string");
      expect(src, f).toMatch(/deepLinkUrl\s*\|\|/);
      expect(src, f).toContain("Laisser mon avis");
    }
  });

  it("le sender cible le formulaire d'avis pour les gabarits d'avis", () => {
    const sender = readFileSync(
      resolve(__dirname, "../../supabase/functions/send-transactional-email/index.ts"),
      "utf8",
    );
    expect(sender).toContain("/review/");
    for (const f of REVIEW_DEEP_LINK_TEMPLATES) {
      expect(sender, f).toContain(`'${f.replace(".tsx", "")}'`);
    }
  });

  // Régression mesurée en production le 23/08/2026 : le bouton principal de
  // la relance « discussion enlisée » menait à /dashboard/candidatures/:id,
  // une route inexistante (404). Le gabarit doit accepter le lien profond et
  // le sender doit l'injecter.
  it("la relance discussion enlisée accepte le lien profond et le sender l'injecte", () => {
    const src = read("discussion-stalled-nudge.tsx");
    expect(src).toContain("deepLinkUrl?: string");
    expect(src).toMatch(/deepLinkUrl\s*\|\|/);
    const sender = readFileSync(
      resolve(__dirname, "../../supabase/functions/send-transactional-email/index.ts"),
      "utf8",
    );
    expect(sender).toContain("'discussion-stalled-nudge'");
  });

  it("aucune relance candidature ne pointe vers la route inexistante /dashboard/candidatures", () => {
    const nudge = readFileSync(
      resolve(__dirname, "../../supabase/functions/nudge-owner-pending-application/index.ts"),
      "utf8",
    );
    expect(nudge).not.toContain("/dashboard/candidatures/");
    expect(nudge).toContain("#candidatures");
  });

  // Relance secteur : le bouton doit déposer la personne sur /mon-secteur,
  // session ouverte, et une ligne de réassurance doit suivre le bouton.
  it("la relance secteur accepte le lien profond et affiche sa ligne de réassurance", () => {
    const src = read("relance-cp-manquant.tsx");
    expect(src).toContain("deepLinkUrl?: string");
    expect(src).toMatch(/deepLinkUrl\s*\|\|/);
    expect(src).toContain("Indiquer mon secteur");
    expect(src).toContain("Trente secondes, et vous voyez les gardes autour de vous.");
    const sender = readFileSync(
      resolve(__dirname, "../../supabase/functions/send-transactional-email/index.ts"),
      "utf8",
    );
    expect(sender).toContain("'relance-cp-manquant'");
    expect(sender).toContain("'/mon-secteur'");
  });
});
