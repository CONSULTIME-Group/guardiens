import { describe, it, expect } from "vitest";
import {
  shouldOfferPublishExitChoice,
  draftHoldReasonLabel,
  DRAFT_HOLD_REASONS,
} from "../draftHoldReasons";
import { sitWriteErrorNeedsSignal, describeSitWriteError } from "../sitDbErrors";

/**
 * Verrous de la décision produit du 18/08/2026 : un brouillon complet jamais
 * publié ne se quitte plus en silence, et une erreur de publication non
 * prévue ne peut plus rester invisible côté admin.
 */

describe("Écran de choix à la sortie du formulaire", () => {
  it("s'affiche pour un brouillon complet jamais publié", () => {
    expect(
      shouldOfferPublishExitChoice({ canPublish: true, publishedAt: null, justPublished: false }),
    ).toBe(true);
  });

  it("ne s'affiche jamais si l'annonce n'est pas publiable", () => {
    expect(
      shouldOfferPublishExitChoice({ canPublish: false, publishedAt: null, justPublished: false }),
    ).toBe(false);
  });

  it("ne s'affiche pas pour une annonce publiée puis dépubliée, choix déjà assumé", () => {
    expect(
      shouldOfferPublishExitChoice({ canPublish: true, publishedAt: "2026-08-01", justPublished: false }),
    ).toBe(false);
  });

  it("ne s'affiche pas juste après une publication réussie", () => {
    expect(
      shouldOfferPublishExitChoice({ canPublish: true, publishedAt: null, justPublished: true }),
    ).toBe(false);
  });

  it("les quatre raisons proposées restent stables et libellées", () => {
    expect(DRAFT_HOLD_REASONS.map((r) => r.id)).toEqual([
      "dates_uncertain",
      "want_reread",
      "still_thinking",
      "other",
    ]);
    for (const r of DRAFT_HOLD_REASONS) expect(draftHoldReasonLabel(r.id)).toBe(r.label);
  });
});

describe("Signal admin sur erreur de publication", () => {
  it("le refus animal, contraire à la règle produit, déclenche un signal", () => {
    expect(
      sitWriteErrorNeedsSignal({ code: "P0001", message: "aucun animal n est enregistre" }),
    ).toBe(true);
  });

  it("les erreurs de données connues et traduites ne déclenchent pas de signal", () => {
    expect(
      sitWriteErrorNeedsSignal({ code: "P0001", message: "liste d'environnements invalide" }),
    ).toBe(false);
    expect(
      sitWriteErrorNeedsSignal({ code: "P0001", message: "min_gardien_sits invalide" }),
    ).toBe(false);
    expect(sitWriteErrorNeedsSignal({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(sitWriteErrorNeedsSignal({ code: "42501", message: "permission denied" })).toBe(false);
    expect(sitWriteErrorNeedsSignal({ code: "PGRST301", message: "jwt" })).toBe(false);
    expect(sitWriteErrorNeedsSignal({ code: "23514", message: "check violation" })).toBe(false);
    expect(sitWriteErrorNeedsSignal({ code: "23502", message: "not null" })).toBe(false);
  });

  it("une erreur inconnue déclenche toujours un signal", () => {
    expect(sitWriteErrorNeedsSignal({ code: "XX999", message: "unexpected" })).toBe(true);
    expect(sitWriteErrorNeedsSignal({ message: "Network error" })).toBe(true);
    expect(sitWriteErrorNeedsSignal({ code: "P0001", message: "raise exception inconnue" })).toBe(true);
  });

  it("le message utilisateur reste traduit même pour une erreur inconnue", () => {
    expect(describeSitWriteError({ code: "XX999" }, "publish")).toContain("publication");
    expect(describeSitWriteError({ code: "XX999" }, "republish")).toContain("republication");
  });
});
