/**
 * Lot Z2, audit C-18 (13/10/2026) : le bloc d'invitation des personnes proches
 * reste à l'auteur tant que son besoin est ouvert et sans proposition vivante,
 * au lieu de disparaître à la fermeture de la bannière de publication.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { showMissionInviteBlock } from "@/lib/missionInviteBlock";

describe("C-18, règle pure", () => {
  it("auteur, besoin ouvert, aucune proposition : bloc visible", () => {
    expect(showMissionInviteBlock({ isAuthor: true, status: "open", responses: [] })).toBe(true);
    expect(showMissionInviteBlock({ isAuthor: true, status: "open", responses: null })).toBe(true);
  });

  it("propositions retirées ou déclinées : l'auteur peut encore inviter", () => {
    expect(
      showMissionInviteBlock({ isAuthor: true, status: "open", responses: [{ status: "withdrawn" }, { status: "declined" }] }),
    ).toBe(true);
  });

  it("une proposition en attente ou retenue : bloc masqué", () => {
    expect(showMissionInviteBlock({ isAuthor: true, status: "open", responses: [{ status: "pending" }] })).toBe(false);
    expect(showMissionInviteBlock({ isAuthor: true, status: "open", responses: [{ status: "accepted" }] })).toBe(false);
  });

  it("visiteur, ou besoin en cours, terminé, clos : bloc masqué", () => {
    expect(showMissionInviteBlock({ isAuthor: false, status: "open", responses: [] })).toBe(false);
    for (const status of ["in_progress", "completed", "cancelled"]) {
      expect(showMissionInviteBlock({ isAuthor: true, status, responses: [] })).toBe(false);
    }
  });
});

describe("C-18, branchement", () => {
  it("la fiche ne lie plus le bloc au paramètre ?published=1", () => {
    const src = readFileSync("src/pages/SmallMissionDetail.tsx", "utf8");
    expect(src).toContain("{showMissionInviteBlock({ isAuthor, status: mission.status, responses }) && (");
    expect(src).not.toContain('{showPublishedBanner && isAuthor && mission.status === "open" && (');
    const i = src.indexOf("<MatchedHelpersInviteBlock");
    expect(src.slice(Math.max(0, i - 200), i)).toContain("showMissionInviteBlock(");
  });
});
