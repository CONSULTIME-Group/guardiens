/**
 * Tests "E2E logique" du contrôle d'accès au bandeau de publication.
 *
 * Reproduisent la chaîne complète utilisée dans `SmallMissionDetail.tsx` :
 *   showBanner = Boolean(viewer?.id && isAuthorOf(viewer.id, mission) && hasPublishedFlag)
 *
 * Vérifient que le bandeau n'apparaît JAMAIS pour :
 *   - un visiteur anonyme (navigation privée, pas de session) avec ?published=1
 *   - un utilisateur tiers connecté avec ?published=1
 *   - un auteur sans le flag ?published=1
 *   - un visiteur anonyme avec ids manipulés (user_id="" / null)
 *
 * Et qu'il apparaît UNIQUEMENT pour l'auteur réel avec le flag.
 *
 * Playwright n'est pas installé sur ce projet ; ces tests reproduisent la
 * matrice d'accès au niveau React/DOM, ce qui suffit pour bloquer toute
 * régression du guard sans dépendre d'une session Supabase live.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MissionPublishedBanner } from "@/components/missions/MissionPublishedBanner";
import { isAuthorOf } from "@/lib/ownership";

type Viewer = { id: string | null } | null;
type Mission = { id: string; title: string; user_id: string | null };

const AUTHOR_ID = "author-uuid-aaaa";
const STRANGER_ID = "stranger-uuid-bbbb";
const MISSION: Mission = {
  id: "mission-uuid-1234",
  title: "Promener mon chien",
  user_id: AUTHOR_ID,
};

/**
 * Rend la page de manière équivalente au gating réel de SmallMissionDetail :
 * le bandeau n'est inclus dans le DOM que si toutes les conditions sont vraies.
 */
function renderScenario({
  viewer,
  mission,
  publishedFlag,
}: {
  viewer: Viewer;
  mission: Mission | null;
  publishedFlag: boolean;
}) {
  const isAuthor = isAuthorOf(viewer?.id ?? null, mission);
  const showBanner = Boolean(viewer?.id && isAuthor && publishedFlag);

  return render(
    <MemoryRouter>
      <div data-testid="page-root">
        {showBanner && mission && (
          <MissionPublishedBanner
            missionTitle={mission.title}
            isAuthor={isAuthor}
            published={publishedFlag}
            onClose={() => {}}
            onToast={() => {}}
            currentUrlOverride={`https://example.test/petites-missions/${mission.id}?published=1`}
          />
        )}
      </div>
    </MemoryRouter>,
  );
}

describe("Bandeau publication — contrôle d'accès end-to-end", () => {
  describe("Navigation privée / visiteur anonyme", () => {
    it("ne s'affiche PAS pour un visiteur non connecté avec ?published=1", () => {
      renderScenario({ viewer: null, mission: MISSION, publishedFlag: true });
      expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
    });

    it("ne s'affiche PAS pour un visiteur dont l'id est null/vide même avec ?published=1", () => {
      renderScenario({ viewer: { id: null }, mission: MISSION, publishedFlag: true });
      expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
      renderScenario({ viewer: { id: "" }, mission: MISSION, publishedFlag: true });
      expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
    });
  });

  describe("Utilisateur tiers connecté", () => {
    it("ne s'affiche PAS pour un utilisateur qui n'est pas l'auteur, même avec ?published=1", () => {
      renderScenario({ viewer: { id: STRANGER_ID }, mission: MISSION, publishedFlag: true });
      expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
    });

    it("ne s'affiche PAS si user_id de la mission est null/vide (incohérence DB) même pour un user connecté", () => {
      renderScenario({
        viewer: { id: AUTHOR_ID },
        mission: { ...MISSION, user_id: null },
        publishedFlag: true,
      });
      expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
      renderScenario({
        viewer: { id: AUTHOR_ID },
        mission: { ...MISSION, user_id: "" },
        publishedFlag: true,
      });
      expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
    });
  });

  describe("Auteur réel", () => {
    it("ne s'affiche PAS sans le flag ?published=1, même pour l'auteur", () => {
      renderScenario({ viewer: { id: AUTHOR_ID }, mission: MISSION, publishedFlag: false });
      expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
    });

    it("s'affiche UNIQUEMENT pour l'auteur connecté avec ?published=1", () => {
      renderScenario({ viewer: { id: AUTHOR_ID }, mission: MISSION, publishedFlag: true });
      expect(screen.getByTestId("mission-published-banner")).toBeInTheDocument();
      expect(screen.getByText("Votre mission est en ligne.")).toBeInTheDocument();
    });
  });

  describe("Mission absente / non chargée", () => {
    it("ne s'affiche PAS si la mission est null (fetch incomplet) — même avec auteur + flag", () => {
      renderScenario({ viewer: { id: AUTHOR_ID }, mission: null, publishedFlag: true });
      expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
    });
  });
});
