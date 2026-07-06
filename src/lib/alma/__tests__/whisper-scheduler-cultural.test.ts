/**
 * Tests scheduler Pass 5 — cultural_fact (P3).
 *
 * Vérifie :
 *  - Un cultural_fact ne passe jamais si un whisper actionnable est éligible.
 *  - En l'absence d'actionnable, un cultural_fact est retenu.
 *  - Silent = jamais.
 */
import { describe, it, expect } from "vitest";
import { makeInitialState, pickNext } from "@/lib/alma/whisper-scheduler";
import type { AlmaWhisper } from "@/lib/alma/whisper-types";

function fact(id = "f1"): AlmaWhisper {
  return {
    id,
    type: "cultural_fact",
    audience: "owner",
    surface: "dashboard",
    priority: "P3",
    message: "Le Chartreux ronronne à 25 à 140 Hz.",
  };
}

function actionable(id = "a1"): AlmaWhisper {
  return {
    id,
    type: "owner_traffic_no_action",
    audience: "owner",
    surface: "owner_dashboard",
    priority: "P1",
    message: "Votre annonce a été vue 20 fois sans candidature.",
  };
}

describe("scheduler pickNext — cultural_fact (P3)", () => {
  it("un cultural_fact seul est retenu", () => {
    const state = makeInitialState("balanced");
    expect(pickNext([fact()], state)?.type).toBe("cultural_fact");
  });

  it("un cultural_fact ne passe jamais si un whisper actionnable est en queue", () => {
    const state = makeInitialState("balanced");
    expect(pickNext([fact(), actionable()], state)?.type).toBe(
      "owner_traffic_no_action",
    );
    // Ordre inversé : idem
    expect(pickNext([actionable(), fact()], state)?.type).toBe(
      "owner_traffic_no_action",
    );
  });

  it("fréquence silent → aucun whisper émis, cultural inclus", () => {
    const state = makeInitialState("silent");
    expect(pickNext([fact()], state)).toBeNull();
    expect(pickNext([actionable()], state)).toBeNull();
  });
});
