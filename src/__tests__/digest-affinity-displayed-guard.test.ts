import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { computeAffinityResultFull } from "@/lib/affinityScore";

/**
 * Garde-fou du constat du 26/08/2026 sur send-sitter-daily-digest :
 * la fonction poussait `affinityScore: s.score` sans consulter le verdict
 * d'affichage du moteur (`result.displayed`). Résultat, un gardien au profil
 * quasi vide recevait « Affinité 0% » sur chacune des trois annonces
 * recommandées, alors que le moteur juge lui même ce chiffre non fiable.
 *
 * Deux règles permanentes :
 *  1. La ligne de scoring conserve `displayed: result.displayed`.
 *  2. L'item du gabarit ne porte le chiffre que si `displayed` est vrai,
 *     donc `affinityScore` est null quand le moteur se tait, jamais 0.
 */

const SRC = readFileSync(
  "supabase/functions/send-sitter-daily-digest/index.ts",
  "utf8",
);

describe("send-sitter-daily-digest : chiffre d'affinité seulement si fiable", () => {
  it("le verdict d'affichage du moteur est conservé sur chaque ligne scorée", () => {
    expect(SRC).toContain("displayed: result.displayed");
  });

  it("l'item du gabarit conditionne le chiffre au verdict d'affichage", () => {
    expect(SRC).toContain("affinityScore: s.displayed ? s.score : null");
  });

  it("le cas fautif d'origine ne revient pas : affinityScore poussé brut", () => {
    expect(SRC).not.toMatch(/affinityScore:\s*s\.score\s*,/);
  });

  it("un couple dont le moteur juge le score non affichable ne produit jamais 0", () => {
    // Gardien au profil vide, propriétaire déclarant des animaux : le moteur
    // rend un score de 0 mais refuse de l'afficher.
    const owner: any = {
      pets: [{ species: "dog", special_needs: null }],
      work_during_sit: null,
      lifestyle: null,
      life_pace: null,
      languages: null,
      interests: null,
      home_ambiance: null,
      car_required: null,
      accepts_sitter_pets: null,
      accepts_sitter_children: null,
      distance_km: null,
    };
    const sitter: any = {};

    const result = computeAffinityResultFull(owner, sitter, {
      mode: "distribution",
    });
    expect(result.displayed).toBe(false);

    const item = { affinityScore: result.displayed ? result.score : null };
    expect(item.affinityScore).toBeNull();
    expect(item.affinityScore).not.toBe(0);
  });
});
