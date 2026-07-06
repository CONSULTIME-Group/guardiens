/**
 * Couvre les 4 états UX du dashboard owner (précepte 2026 « 1 NBA dominante »).
 *
 * Test pur/logique via `isEarlyOwner` + `computeOwnerNbaVariant` +
 * `useIsNewOwner` : chaque assertion documente l'état visible attendu
 * (NBA affichée, PriorityActionCard masquée, CTA hero masqué, etc.).
 *
 * Un test de rendu complet du composant OwnerDashboard nécessiterait de
 * mocker ~10 hooks (data fetching, auth, badges…) pour un gain marginal :
 * les mêmes fonctions pures pilotent les 4 branches JSX.
 */
import { describe, it, expect } from "vitest";
import {
  isEarlyOwner,
  useIsNewOwner,
  computeOwnerNbaVariant,
} from "@/hooks/useIsNewUser";

type SitLite = { status: string };

function state(sits: SitLite[], pets: unknown[]) {
  const isNewOwner = useIsNewOwner({
    sitsCount: sits.length,
    petsCount: pets.length,
  });
  const early = isEarlyOwner({ sits, pets });
  const hasDraft = sits.some((s) => s.status === "draft");
  const nbaVariant = computeOwnerNbaVariant({ isNewOwner, hasDraft });
  return {
    isNewOwner,
    earlyOwner: early,
    hasDraft,
    nbaVariant,
    // Miroir des conditions JSX du dashboard :
    showSitDraftFromPrompt: isNewOwner && !hasDraft,
    showDraftResumeCard: hasDraft,
    showPriorityActionCard: !hasDraft && !isNewOwner,
    showOwnerFirstNBAGardiens: early,
    showDesktopHeroCta: !early,
  };
}

describe("OwnerDashboard states — précepte 2026 « 1 NBA dominante »", () => {
  it("new-owner sans draft : SitDraftFromPrompt seule NBA, PriorityActionCard masquée, CTA hero masqué", () => {
    const s = state([], []);
    expect(s.isNewOwner).toBe(true);
    expect(s.earlyOwner).toBe(true);
    expect(s.nbaVariant).toBe("sit_draft_from_prompt");
    expect(s.showSitDraftFromPrompt).toBe(true);
    expect(s.showDraftResumeCard).toBe(false);
    expect(s.showPriorityActionCard).toBe(false);
    expect(s.showOwnerFirstNBAGardiens).toBe(true);
    expect(s.showDesktopHeroCta).toBe(false);
  });

  it("new-owner avec draft : DraftResumeCard prend le relais, SitDraftFromPrompt masqué", () => {
    const s = state([{ status: "draft" }], []);
    expect(s.earlyOwner).toBe(true);
    expect(s.nbaVariant).toBe("draft_resume");
    expect(s.showSitDraftFromPrompt).toBe(false);
    expect(s.showDraftResumeCard).toBe(true);
    expect(s.showPriorityActionCard).toBe(false);
    expect(s.showOwnerFirstNBAGardiens).toBe(true);
    expect(s.showDesktopHeroCta).toBe(false);
  });

  it("early owner (drafts uniquement, aucune annonce publiée) : identique au new-owner avec draft", () => {
    const s = state([{ status: "draft" }, { status: "draft" }], []);
    expect(s.isNewOwner).toBe(false);
    expect(s.earlyOwner).toBe(true);
    expect(s.nbaVariant).toBe("draft_resume");
    expect(s.showDraftResumeCard).toBe(true);
    expect(s.showPriorityActionCard).toBe(false);
    expect(s.showOwnerFirstNBAGardiens).toBe(true);
    expect(s.showDesktopHeroCta).toBe(false);
  });

  it("returning owner (au moins 1 annonce publiée) : PriorityActionCard visible, CTA hero visible, OwnerFirstNBAGardiens masqué", () => {
    const s = state([{ status: "published" }], []);
    expect(s.isNewOwner).toBe(false);
    expect(s.earlyOwner).toBe(false);
    expect(s.nbaVariant).toBe("priority_action");
    expect(s.showSitDraftFromPrompt).toBe(false);
    expect(s.showDraftResumeCard).toBe(false);
    expect(s.showPriorityActionCard).toBe(true);
    expect(s.showOwnerFirstNBAGardiens).toBe(false);
    expect(s.showDesktopHeroCta).toBe(true);
  });

  it("owner avec animaux mais aucun sit : n'est PAS early (pets ancrent la maison)", () => {
    const s = state([], [{ id: "pet1" }]);
    expect(s.isNewOwner).toBe(false);
    expect(s.earlyOwner).toBe(false);
    expect(s.nbaVariant).toBe("priority_action");
  });

  it("owner avec draft + publié : n'est PAS early (une annonce est en ligne)", () => {
    const s = state([{ status: "draft" }, { status: "published" }], []);
    expect(s.earlyOwner).toBe(false);
    expect(s.nbaVariant).toBe("draft_resume");
  });
});
