import { describe, it, expect } from "vitest";
import {
  transactionalSender,
  FOUNDER_SIGNED_TEMPLATES,
  REPLY_TO_ADDRESS,
  CONTACT_REPLY_ADDRESS,
} from "../../supabase/functions/_shared/sender-address";

describe("lot M1b, adresse de réponse des gabarits signés par un fondateur", () => {
  it("contact@guardiens.fr est l'adresse de réponse", () => {
    expect(REPLY_TO_ADDRESS).toBe("contact@guardiens.fr");
  });
  it.each(["admin-personal-message", "founder-personal-notice"])("%s porte le reply-to, expéditeur inchangé", (t) => {
    expect(transactionalSender(t, "Guardiens", "guardiens.fr")).toEqual({
      from: "Guardiens <noreply@guardiens.fr>",
      reply_to: "contact@guardiens.fr",
    });
  });
  it("tous les gabarits signés listés portent le reply-to", () => {
    for (const t of FOUNDER_SIGNED_TEMPLATES) {
      expect(transactionalSender(t, "Guardiens", "guardiens.fr").reply_to, t).toBe("contact@guardiens.fr");
    }
  });
  it("contact-reply et les gabarits non signés sont inchangés", () => {
    expect(transactionalSender("contact-reply", "Guardiens", "guardiens.fr").reply_to).toBe(CONTACT_REPLY_ADDRESS);
    expect(transactionalSender("application-accepted", "Guardiens", "guardiens.fr").reply_to).toBeUndefined();
  });
});
