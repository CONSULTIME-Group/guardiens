import { describe, it, expect } from "vitest";
import { shouldPrefillDraft } from "@/lib/conversation";

const sys = (overrides: Partial<{ is_system: boolean }> = {}) => ({
  is_system: true,
  ...overrides,
});
const real = (overrides: Partial<{ is_system: boolean }> = {}) => ({
  is_system: false,
  ...overrides,
});

describe("shouldPrefillDraft", () => {
  describe("✅ pré-remplissage AUTORISÉ", () => {
    it("conversation totalement vide + input vide", () => {
      const decision = shouldPrefillDraft({ messages: [], currentInput: "" });
      expect(decision.shouldPrefill).toBe(true);
      expect(decision.reason).toBe("empty_conversation_and_input");
    });

    it("uniquement des messages système + input vide", () => {
      const decision = shouldPrefillDraft({
        messages: [sys(), sys(), sys()],
        currentInput: "",
      });
      expect(decision.shouldPrefill).toBe(true);
      expect(decision.reason).toBe("empty_conversation_and_input");
    });

    it("input composé uniquement d'espaces (trim) + conv vide", () => {
      const decision = shouldPrefillDraft({
        messages: [],
        currentInput: "   \n\t  ",
      });
      expect(decision.shouldPrefill).toBe(true);
      expect(decision.reason).toBe("empty_conversation_and_input");
    });
  });

  describe("❌ pré-remplissage REFUSÉ — conversation déjà entamée", () => {
    it("un seul message non-système suffit à bloquer", () => {
      const decision = shouldPrefillDraft({
        messages: [real()],
        currentInput: "",
      });
      expect(decision.shouldPrefill).toBe(false);
      expect(decision.reason).toBe("conversation_already_started");
    });

    it("mix de système + un message réel → bloqué", () => {
      const decision = shouldPrefillDraft({
        messages: [sys(), real(), sys()],
        currentInput: "",
      });
      expect(decision.shouldPrefill).toBe(false);
      expect(decision.reason).toBe("conversation_already_started");
    });

    it("priorité : conv entamée l'emporte même si l'input est non-vide", () => {
      // On veut que l'utilisateur sache que la conv est entamée,
      // pas qu'on lui dise "input non vide" alors que c'est secondaire.
      const decision = shouldPrefillDraft({
        messages: [real()],
        currentInput: "Bonjour, j'écris déjà",
      });
      expect(decision.shouldPrefill).toBe(false);
      expect(decision.reason).toBe("conversation_already_started");
    });
  });

  describe("❌ pré-remplissage REFUSÉ — input non vide", () => {
    it("conv vide mais utilisateur a déjà tapé du texte", () => {
      const decision = shouldPrefillDraft({
        messages: [],
        currentInput: "Bonjour Patricia",
      });
      expect(decision.shouldPrefill).toBe(false);
      expect(decision.reason).toBe("input_not_empty");
    });

    it("conv avec uniquement messages système mais input non vide", () => {
      const decision = shouldPrefillDraft({
        messages: [sys()],
        currentInput: "j'écris...",
      });
      expect(decision.shouldPrefill).toBe(false);
      expect(decision.reason).toBe("input_not_empty");
    });

    it("input avec un seul caractère significatif", () => {
      const decision = shouldPrefillDraft({
        messages: [],
        currentInput: "a",
      });
      expect(decision.shouldPrefill).toBe(false);
      expect(decision.reason).toBe("input_not_empty");
    });
  });

  describe("garanties anti-régression", () => {
    it("AUCUN brouillon n'est proposé dès qu'un message non-système existe", () => {
      // Cas réel du bug : Elisa a candidaté → message créé → Patricia ouvre
      // la conv et NE doit PAS voir un brouillon générique se coller.
      const cases = [
        { messages: [real()], currentInput: "" },
        { messages: [real(), sys()], currentInput: "" },
        { messages: [sys(), real(), real()], currentInput: "  " },
      ];
      for (const c of cases) {
        expect(shouldPrefillDraft(c).shouldPrefill).toBe(false);
      }
    });

    it("AUCUN brouillon n'écrase la saisie en cours de l'utilisateur", () => {
      const cases = [
        { messages: [], currentInput: "x" },
        { messages: [sys()], currentInput: "Mon message perso" },
      ];
      for (const c of cases) {
        const d = shouldPrefillDraft(c);
        expect(d.shouldPrefill).toBe(false);
        // raison = input_not_empty (et non conversation_already_started)
        expect(d.reason).toBe("input_not_empty");
      }
    });
  });
});
