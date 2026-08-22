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
});
