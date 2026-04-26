/**
 * Tests de tri des blocs de la "journée type".
 * Vérifient que parseRoutine retourne TOUJOURS l'ordre logique :
 *   Matin → Midi → Après-midi → Soir → Nuit
 * quel que soit l'ordre dans le texte d'origine.
 */
import { describe, it, expect } from "vitest";
import { parseRoutine } from "../SitImmersiveContent";

const labelsOf = (raw: string) => parseRoutine(raw)?.blocks.map((b) => b.label) ?? [];

describe("parseRoutine — tri chronologique des moments de la journée", () => {
  it("ordre déjà correct : conserve Matin → Midi → Après-midi → Soir → Nuit", () => {
    const txt = [
      "Matin : balade 30 min",
      "Midi : repas",
      "Après-midi : sieste calme",
      "Soir : croquettes + câlins",
      "Nuit : dort dans le panier",
    ].join("\n");
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Après-midi", "Soir", "Nuit"]);
  });

  it("ordre totalement inversé : Nuit → Soir → Après-midi → Midi → Matin", () => {
    const txt = [
      "Nuit : panier dans la cuisine",
      "Soir : repas léger",
      "Après-midi : jardin",
      "Midi : pâtée",
      "Matin : sortie pipi",
    ].join("\n");
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Après-midi", "Soir", "Nuit"]);
  });

  it("ordre mélangé : Soir, Matin, Nuit, Midi, Après-midi", () => {
    const txt = [
      "Soir — sortie courte",
      "Matin — gamelle + balade",
      "Nuit — dort en bas",
      "Midi — sieste",
      "Après-midi — jeu",
    ].join("\n");
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Après-midi", "Soir", "Nuit"]);
  });

  it("blocs partiels mélangés (Soir + Matin) : Matin avant Soir", () => {
    const txt = "Soir : repas\nMatin : balade";
    expect(labelsOf(txt)).toEqual(["Matin", "Soir"]);
  });

  it("variantes de casse et accents : APRÈS-MIDI, aprem, MATIN restent triés", () => {
    const txt = ["APRÈS-MIDI : jardin", "aprem : oups doublon", "MATIN : croquettes"].join("\n");
    const result = parseRoutine(txt);
    expect(result).not.toBeNull();
    // Matin doit venir avant tout après-midi (peu importe combien)
    const labels = result!.blocks.map((b) => b.label);
    expect(labels[0]).toBe("Matin");
    expect(labels.slice(1).every((l) => l === "Après-midi")).toBe(true);
  });

  it("séparateurs hétérogènes (—, –, -, :) avec ordre mélangé", () => {
    const txt = "Soir - tv\nMatin — promenade\nMidi : pâtée\nAprès-midi – sieste";
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Après-midi", "Soir"]);
  });

  it("séparateurs inline (• | /) avec ordre mélangé", () => {
    const txt = "Nuit : dort • Matin : balade • Midi : repas";
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Nuit"]);
  });

  it("texte avec puces et ordre mélangé", () => {
    const txt = ["- Soir : câlin", "• Matin : sortie", "→ Midi : sieste"].join("\n");
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Soir"]);
  });

  it("texte sans aucun moment reconnaissable retourne null (fallback texte libre)", () => {
    expect(parseRoutine("Mon chien aime beaucoup les promenades.")).toBeNull();
  });

  it("input null ou vide retourne null", () => {
    expect(parseRoutine(null)).toBeNull();
    expect(parseRoutine("")).toBeNull();
  });

  it("texte non labellisé entre blocs : préservé dans notes, blocs triés", () => {
    const txt = [
      "Soir : repas",
      "Note : éviter les sucreries",
      "Matin : balade",
    ].join("\n");
    const result = parseRoutine(txt);
    expect(result).not.toBeNull();
    expect(result!.blocks.map((b) => b.label)).toEqual(["Matin", "Soir"]);
    expect(result!.notes).toContain("éviter les sucreries");
  });

  it("ponctuation finale supprimée des textes de blocs même quand mélangés", () => {
    const txt = "Soir : croquettes.\nMatin : balade,";
    const result = parseRoutine(txt);
    expect(result!.blocks[0]).toMatchObject({ label: "Matin", text: "balade" });
    expect(result!.blocks[1]).toMatchObject({ label: "Soir", text: "croquettes" });
  });
});
