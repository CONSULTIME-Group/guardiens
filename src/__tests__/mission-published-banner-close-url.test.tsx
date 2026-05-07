/**
 * Test E2E "comportemental" : au clic sur le bouton X du bandeau de
 * publication, l'URL courante doit être nettoyée (suppression de
 * ?published=1) SANS rechargement de la page.
 *
 * On reproduit le câblage exact de SmallMissionDetail :
 *   - useSearchParams() pour lire ?published=1
 *   - setSearchParams({}, { replace: true }) au clic sur X
 *
 * Et on capture l'URL React Router en temps réel via un composant
 * `LocationProbe` monté dans le même MemoryRouter, ce qui permet de
 * vérifier l'état de l'URL avant et après le clic — sans navigateur réel
 * et sans refresh.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useSearchParams, useLocation } from "react-router-dom";
import { MissionPublishedBanner } from "@/components/missions/MissionPublishedBanner";

const MISSION_PATH = "/petites-missions/abc-123";

function LocationProbe({ onChange }: { onChange: (search: string) => void }) {
  const location = useLocation();
  // Reporte la search string à chaque changement d'URL.
  onChange(location.search);
  return null;
}

/**
 * Harnais qui reproduit la logique réelle de la page parente :
 * lit ?published=1, l'efface au clic sur X via setSearchParams.
 */
function HarnessedDetail({ onLocation }: { onLocation: (s: string) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const published = searchParams.get("published") === "1";

  return (
    <>
      <LocationProbe onChange={onLocation} />
      <MissionPublishedBanner
        missionTitle="Promener mon chien"
        isAuthor
        published={published}
        onClose={() => setSearchParams({}, { replace: true })}
        onToast={() => {}}
        currentUrlOverride={`https://example.test${MISSION_PATH}?published=1`}
      />
    </>
  );
}

describe("Bandeau publication — clic X nettoie l'URL sans refresh", () => {
  it("supprime ?published=1 de l'URL au clic sur X", async () => {
    const onLocation = vi.fn();

    render(
      <MemoryRouter initialEntries={[`${MISSION_PATH}?published=1`]}>
        <HarnessedDetail onLocation={onLocation} />
      </MemoryRouter>,
    );

    // État initial : ?published=1 est bien présent dans l'URL.
    expect(onLocation).toHaveBeenCalledWith("?published=1");
    expect(screen.getByTestId("mission-published-banner")).toBeInTheDocument();

    // Clic sur X.
    fireEvent.click(screen.getByRole("button", { name: "Fermer la confirmation" }));

    // L'URL passe à "" (search string vide) sans rechargement.
    await waitFor(() => {
      const lastCall = onLocation.mock.calls[onLocation.mock.calls.length - 1];
      expect(lastCall?.[0]).toBe("");
    });

    // Et le bandeau est démonté car published=false maintenant.
    expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
  });

  it("ne réaffiche pas le bandeau si on relit ?published=1 après nettoyage (URL absente)", async () => {
    const onLocation = vi.fn();
    render(
      <MemoryRouter initialEntries={[`${MISSION_PATH}?published=1`]}>
        <HarnessedDetail onLocation={onLocation} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fermer la confirmation" }));

    await waitFor(() => {
      expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
    });

    // Toute lecture ultérieure de l'URL ne contient plus published=1.
    const allSearches = onLocation.mock.calls.map((c) => c[0]);
    expect(allSearches[allSearches.length - 1]).toBe("");
    expect(allSearches.some((s) => s.includes("published=1") && s !== "?published=1")).toBe(false);
  });
});
