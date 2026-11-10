/**
 * Verrou du lot SC3 (10/11/2026, arène claude/arene/2026-11-10-score-completion) :
 * la question des trajets posée au moment où elle compte, la phrase lue par le
 * propriétaire après un « non », les besoins particuliers cherchés en début de mot.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent } from "@testing-library/react";
import { matchesNeedKeyword, normalizeFreeText, SPECIAL_NEED_SIGNALS } from "../../../supabase/functions/_shared/affinity/vocab.ts";
import { computeAffinityResultFull } from "@/lib/affinityScore";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ update: () => ({ eq: () => ({ select: async () => ({ data: [{ user_id: "u1" }], error: null }) }) }) }) },
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/myProfile", () => ({ fetchMySitterProfile: vi.fn(), patchMyProfileCache: vi.fn() }));

import TripsPrompt, { isTripsSnoozed, shouldAskTrips, snoozeTrips, TRIPS_SNOOZE_DAYS } from "@/components/sits/TripsPrompt";

const aged = SPECIAL_NEED_SIGNALS.find((s) => s.skill === "Animal âgé ou en fin de vie")!;
const needsAged = (raw: string) => aged.keywords.some((k) => matchesNeedKeyword(normalizeFreeText(raw), k));

describe("lot SC3 : besoins particuliers en début de mot", () => {
  it("les textes réels qui parlent d'un animal âgé restent reconnus", () => {
    expect(needsAged("Chat âgé a du mal à sauter")).toBe(true);
    expect(needsAged("Lulú est une chatte âgée, calme et indépendante")).toBe(true);
    expect(needsAged("En fin de vie. Reste calme a dormir dans la maison.")).toBe(true);
  });

  it("cage, étage, langage, garage, image ne déclenchent plus « âgé »", () => {
    expect(needsAged("Il doit être en cage quand le gardien s absente")).toBe(false);
    expect(needsAged("Elle vit à l'étage, veille mémère tranquille")).toBe(false);
    expect(needsAged("savoir décoder le langage félin est nécessaire")).toBe(false);
    expect(needsAged("ne pas entrer dans le garage")).toBe(false);
    expect(needsAged("une image vaut mieux")).toBe(false);
  });

  it("les mots-clés longs gardent leurs dérivés (médicaments, réactive)", () => {
    const t = normalizeFreeText("Un médicament par jour ; elle était très réactive");
    expect(matchesNeedKeyword(t, "medicament")).toBe(true);
    expect(matchesNeedKeyword(t, "reactif")).toBe(false);
    expect(matchesNeedKeyword(t, "reactive")).toBe(true);
  });
});

describe("lot SC3 : ce que lit le propriétaire après un « non »", () => {
  const owner = { car_required: true, life_pace: "calme" };
  it("« Je me déplace autrement » se dit tel quel, score inchangé (silence neutre)", () => {
    const declared = computeAffinityResultFull(owner, { has_license: false, has_vehicle: false, lifestyle: ["Tranquille / casanier"] });
    const silent = computeAffinityResultFull(owner, { lifestyle: ["Tranquille / casanier"] });
    expect(declared.explanation).toContain("Se déplace sans voiture, alors qu'une voiture est nécessaire sur place");
    expect(silent.explanation).toContain("N'a pas déclaré de véhicule, alors qu'une voiture est nécessaire sur place");
    expect(declared.score).toBe(silent.score);
    expect(declared.sortScore).toBe(silent.sortScore);
  });
  it("« J'ai le permis, sans véhicule » : demi-portion, phrase sans « déclaré »", () => {
    const r = computeAffinityResultFull(owner, { has_license: true, has_vehicle: false, lifestyle: ["Tranquille / casanier"] });
    expect(r.explanation).toContain("A le permis, sans véhicule");
  });
});

describe("lot SC3 : la question au bon moment", () => {
  beforeEach(() => localStorage.clear());

  it("posée seulement si la voiture est nécessaire et la réponse absente", () => {
    expect(shouldAskTrips(true, { has_vehicle: null }, "u1")).toBe(true);
    expect(shouldAskTrips(false, { has_vehicle: null }, "u1")).toBe(false);
    expect(shouldAskTrips(null, { has_vehicle: null }, "u1")).toBe(false);
    expect(shouldAskTrips(true, { has_vehicle: false }, "u1")).toBe(false);
    expect(shouldAskTrips(true, { has_vehicle: true }, "u1")).toBe(false);
    expect(shouldAskTrips(true, { has_vehicle: null }, null)).toBe(false);
  });

  it("« Plus tard » la fait taire 30 jours", () => {
    const now = Date.now();
    snoozeTrips("u1", now);
    expect(isTripsSnoozed("u1", now + 1000)).toBe(true);
    expect(isTripsSnoozed("u1", now + TRIPS_SNOOZE_DAYS * 86_400_000 + 1)).toBe(false);
    expect(shouldAskTrips(true, { has_vehicle: null }, "u1")).toBe(false);
  });

  it("une réponse s'enregistre et se confirme en mots", async () => {
    const answered = vi.fn();
    render(<TripsPrompt userId="u1" carRequired columns={{ has_license: null, has_vehicle: null }} context="application" onAnswered={answered} />);
    expect(screen.getByTestId("trips-prompt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "J'ai le permis, sans véhicule" }));
    expect(await screen.findByTestId("trips-prompt-saved")).toHaveTextContent("Merci, c'est noté sur votre profil.");
    expect(answered).toHaveBeenCalledWith({ has_license: true, has_vehicle: false });
  });

  it("la candidature, la page d'annonce et l'accueil posent la même question", () => {
    expect(readFileSync("src/components/sits/ApplicationModal.tsx", "utf8")).toContain("<TripsPrompt");
    expect(readFileSync("src/components/sits/views/SitterSitView.tsx", "utf8")).toContain("<SitCarNeed");
    const arrivee = readFileSync("src/pages/arrival/ArriveeGarder.tsx", "utf8");
    expect(arrivee).toContain("TRIPS_OPTIONS");
    expect(arrivee).toContain("tripsColumns");
  });
});
