/**
 * Tests unitaires — conditions déclencheuses des 3 whispers P0.
 * On teste la logique métier (seuils, blacklist, gating) sans monter React.
 */
import { describe, it, expect } from "vitest";
import { detectMeetingMention } from "../wiring/meetingMentions";
import {
  buildReciprocalInterestWhisper,
  buildConversationStagnantWhisper,
  buildLongAbsenceReturnWhisper,
} from "@/lib/alma/whisper-triggers";
import { WHISPER_PRIORITY } from "@/lib/alma/whisper-types";

describe("Trigger 7 réciprocité — payload whisper", () => {
  it("produit un whisper P0 owner avec CTA Inviter", () => {
    const w = buildReciprocalInterestWhisper({
      firstName: "Camille",
      views: 3,
      onInvite: () => {},
    });
    expect(w.audience).toBe("owner");
    expect(w.priority).toBe("P0");
    expect(WHISPER_PRIORITY[w.type]).toBe("P0");
    expect(w.type).toBe("owner_reciprocal_interest");
    expect(w.message).toContain("Camille");
    expect(w.message).toContain("3 fois");
    expect(w.primaryAction?.actionId).toBe("invite");
    // pas de tiret cadratin
    expect(w.message.includes("—")).toBe(false);
  });
});

describe("Trigger 10 conversation stagnante — détecteur de rencontre", () => {
  it("détecte les mentions courantes de rendez-vous", () => {
    expect(detectMeetingMention("On peut se rencontrer mardi ?")).toBe(true);
    expect(detectMeetingMention("Un café en semaine ?")).toBe(true);
    expect(detectMeetingMention("Je vous propose un rendez-vous")).toBe(true);
    expect(detectMeetingMention("RDV vendredi ?")).toBe(true);
    expect(detectMeetingMention("On peut se voir demain")).toBe(true);
    expect(detectMeetingMention("Un appel visio jeudi")).toBe(true);
  });
  it("ne se déclenche pas sur un texte neutre", () => {
    expect(detectMeetingMention("Merci pour votre message")).toBe(false);
    expect(detectMeetingMention("Mon chien mange des croquettes")).toBe(false);
  });
  it("produit un whisper P0 owner avec CTA rencontre (vouvoiement)", () => {
    const w = buildConversationStagnantWhisper({
      firstName: "Léa",
      onProposeMeeting: () => {},
    });
    expect(w.audience).toBe("owner");
    expect(w.priority).toBe("P0");
    expect(w.type).toBe("owner_conversation_stagnant");
    expect(w.message).toContain("Léa");
    // vouvoiement
    expect(w.message.toLowerCase()).toContain("vous");
    expect(w.message.includes("—")).toBe(false);
  });
});

describe("Trigger 12 retour d'absence — payload whisper", () => {
  it("produit un whisper P0 owner en vouvoiement", () => {
    const w = buildLongAbsenceReturnWhisper({
      firstName: "Ana",
      newSits: 12,
      matches: 4,
      audience: "owner",
      onSeeMatches: () => {},
    });
    expect(w.priority).toBe("P0");
    expect(w.audience).toBe("owner");
    expect(w.message).toContain("Ana");
    expect(w.message).toContain("12");
    expect(w.message).toContain("4");
    expect(w.message).toContain("votre");
    expect(w.message.includes("—")).toBe(false);
    expect(w.primaryAction?.actionId).toBe("see_matches");
  });
  it("produit un whisper P0 sitter en vouvoiement (règle éditoriale absolue)", () => {
    const w = buildLongAbsenceReturnWhisper({
      firstName: "Yanis",
      newSits: 8,
      matches: 2,
      audience: "sitter",
      onSeeMatches: () => {},
    });
    expect(w.audience).toBe("sitter");
    expect(w.message).toContain("votre zone");
    expect(w.message).not.toMatch(/\bta\b|\bton\b|\btes\b|\btu\b/i);
  });
});
