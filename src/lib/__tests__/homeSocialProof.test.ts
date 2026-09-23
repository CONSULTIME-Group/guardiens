import { describe, expect, it } from "vitest";
import { hasEnoughHomeSocialProof, type HomeSocialProof } from "../homeSocialProof";

const proof = (name: string): HomeSocialProof => ({
  proof_type: "avis",
  first_name: name,
  city: "Lyon",
  proof_text: "Une belle rencontre.",
  happened_at: "2026-09-01T10:00:00Z",
});

describe("preuve sociale de la home", () => {
  it("reste masquée avec un seul contenu éligible", () => expect(hasEnoughHomeSocialProof([proof("A")])).toBe(false));
  it("apparaît dès deux contenus éligibles", () => expect(hasEnoughHomeSocialProof([proof("A"), proof("B")])).toBe(true));
});