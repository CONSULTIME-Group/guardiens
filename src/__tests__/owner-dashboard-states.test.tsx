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
  hasNoActiveSit,
  useIsNewOwner,
  computeOwnerNbaVariant,
} from "@/hooks/useIsNewUser";

type SitLite = { status: string };

function state(sits: SitLite[], pets: unknown[], role: "owner" | "sitter" | "both" = "owner") {
  const isNewOwner = useIsNewOwner({
    sitsCount: sits.length,
    petsCount: pets.length,
  });
  const early = isEarlyOwner({ sits, pets });
  const noActiveSit = hasNoActiveSit(sits);
  const isOwnerRole = role === "owner" || role === "both";
  const showAlmaProactive = early || (noActiveSit && isOwnerRole);
  const hasDraft = sits.some((s) => s.status === "draft");
  const nbaVariant = computeOwnerNbaVariant({ isNewOwner, hasDraft, hasNoActiveSit: noActiveSit });
  return {
    isNewOwner,
    earlyOwner: early,
    noActiveSit,
    showAlmaProactive,
    hasDraft,
    nbaVariant,
    // Miroir des conditions JSX du dashboard :
    showSitDraftFromPrompt: showAlmaProactive, // toujours accessible si Alma proactive
    showDraftResumeCard: hasDraft,
    showPriorityActionCard: !hasDraft && !showAlmaProactive,
    showOwnerFirstNBAGardiens: showAlmaProactive,
    showDesktopHeroCta: !showAlmaProactive,
    sitDraftSecondary: showAlmaProactive && hasDraft,
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

  it("new-owner avec draft : DraftResumeCard + SitDraftFromPrompt secondaire (concierge toujours accessible)", () => {
    const s = state([{ status: "draft" }], []);
    expect(s.earlyOwner).toBe(true);
    expect(s.nbaVariant).toBe("sit_draft_from_prompt_with_existing_draft");
    expect(s.showSitDraftFromPrompt).toBe(true);
    expect(s.sitDraftSecondary).toBe(true);
    expect(s.showDraftResumeCard).toBe(true);
    expect(s.showPriorityActionCard).toBe(false);
    expect(s.showOwnerFirstNBAGardiens).toBe(true);
    expect(s.showDesktopHeroCta).toBe(false);
  });

  it("early owner (drafts uniquement) : DraftResumeCard + concierge IA secondaire", () => {
    const s = state([{ status: "draft" }, { status: "draft" }], []);
    expect(s.isNewOwner).toBe(false);
    expect(s.earlyOwner).toBe(true);
    expect(s.nbaVariant).toBe("sit_draft_from_prompt_with_existing_draft");
    expect(s.showDraftResumeCard).toBe(true);
    expect(s.showSitDraftFromPrompt).toBe(true);
    expect(s.sitDraftSecondary).toBe(true);
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

  it("owner avec animaux mais aucun sit : n'est PAS early, mais hasNoActiveSit + role owner → Alma proactive", () => {
    const s = state([], [{ id: "pet1" }], "owner");
    expect(s.isNewOwner).toBe(false);
    expect(s.earlyOwner).toBe(false);
    expect(s.noActiveSit).toBe(true);
    expect(s.showAlmaProactive).toBe(true);
    expect(s.nbaVariant).toBe("no_active_sit");
    expect(s.showSitDraftFromPrompt).toBe(true);
    expect(s.showPriorityActionCard).toBe(false);
    expect(s.showOwnerFirstNBAGardiens).toBe(true);
    expect(s.showDesktopHeroCta).toBe(false);
  });

  it("owner avec draft + publié : n'est PAS early, une annonce est en ligne", () => {
    const s = state([{ status: "draft" }, { status: "published" }], []);
    expect(s.earlyOwner).toBe(false);
    expect(s.noActiveSit).toBe(false);
    expect(s.nbaVariant).toBe("draft_resume");
  });

  // Cas Jérémie martinot@gmail.com : role=both, 2 pets, 1 draft + 2 archived, 0 published.
  // Doit voir DraftResumeCard EN TÊTE + SitDraftFromPrompt secondaire + OwnerFirstNBAGardiens.
  it("owner (role=both) avec pets + draft + archived : DraftResumeCard + concierge IA secondaire", () => {
    const s = state(
      [{ status: "draft" }, { status: "archived" }, { status: "archived" }],
      [{ id: "pet1" }, { id: "pet2" }],
      "both",
    );
    expect(s.isNewOwner).toBe(false);
    expect(s.earlyOwner).toBe(false);
    expect(s.noActiveSit).toBe(true);
    expect(s.showAlmaProactive).toBe(true);
    expect(s.hasDraft).toBe(true);
    expect(s.nbaVariant).toBe("sit_draft_from_prompt_with_existing_draft");
    expect(s.showDraftResumeCard).toBe(true);
    expect(s.showSitDraftFromPrompt).toBe(true);
    expect(s.sitDraftSecondary).toBe(true);
    expect(s.showPriorityActionCard).toBe(false);
    expect(s.showOwnerFirstNBAGardiens).toBe(true);
    expect(s.showDesktopHeroCta).toBe(false);
  });

  it("sitter pur avec pets et archived : hasNoActiveSit vrai mais role sitter → PAS Alma proactive", () => {
    const s = state([{ status: "archived" }], [{ id: "pet1" }], "sitter");
    expect(s.noActiveSit).toBe(true);
    expect(s.showAlmaProactive).toBe(false);
    expect(s.showPriorityActionCard).toBe(true);
    expect(s.showDesktopHeroCta).toBe(true);
  });
});
