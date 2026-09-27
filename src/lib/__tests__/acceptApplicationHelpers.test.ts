import { describe, it, expect } from "vitest";
import { isOpenApplicationStatus } from "@/lib/applicationSitState";
import { buildPlatformCandidates } from "@/lib/platformCandidates";
import { acceptErrorMessage } from "@/hooks/useAcceptApplication";

describe("isOpenApplicationStatus (bouton Accepter de la messagerie)", () => {
  it("affiche le bouton pour viewed, pending et discussing", () => {
    expect(isOpenApplicationStatus("viewed")).toBe(true);
    expect(isOpenApplicationStatus("pending")).toBe(true);
    expect(isOpenApplicationStatus("discussing")).toBe(true);
  });
  it("masque le bouton une fois la réponse donnée", () => {
    for (const s of ["accepted", "rejected", "cancelled", null, undefined]) {
      expect(isOpenApplicationStatus(s as any)).toBe(false);
    }
  });
});

describe("buildPlatformCandidates", () => {
  it("fusionne candidatures et conversations, sans doublon ni propriétaire", () => {
    const res = buildPlatformCandidates({
      openApplications: [{ id: "a1", sitter_id: "s1" }],
      conversationSitterIds: ["s2", "s1", "owner", null],
      profiles: [
        { id: "s1", first_name: "Léa", city: "Lyon", avatar_url: "x.jpg" },
        { id: "s2", first_name: "Marc", city: null },
      ],
      ownerId: "owner",
    });
    expect(res).toEqual([
      { sitterId: "s1", firstName: "Léa", city: "Lyon", avatarUrl: "x.jpg", applicationId: "a1" },
      { sitterId: "s2", firstName: "Marc", city: null, avatarUrl: null, applicationId: null },
    ]);
  });
  it("renvoie une liste vide sans candidature ni conversation", () => {
    expect(buildPlatformCandidates({ openApplications: [], conversationSitterIds: [], profiles: [] })).toEqual([]);
  });
});

describe("acceptErrorMessage", () => {
  it("jamais « Erreur » seul", () => {
    for (const m of ["must_use_accept_rpc", "sit_not_open: confirmed", "", "boom"]) {
      const out = acceptErrorMessage(m);
      expect(out.length).toBeGreaterThan(20);
      expect(out).not.toBe("Erreur");
    }
  });
});
