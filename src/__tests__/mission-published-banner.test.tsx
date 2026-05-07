/**
 * Tests automatisés des checkpoints du bandeau de publication
 * d'une petite mission (composant `MissionPublishedBanner`).
 *
 * Couvre :
 *   1. Affichage uniquement si published=1 ET isAuthor
 *   2. Sécurité : pas d'affichage si non-auteur (même avec published=1)
 *   3. Sécurité : pas d'affichage si published absent
 *   4. Copy littéral (titre + paragraphe + boutons)
 *   5. "Partager le lien" → navigator.share si dispo
 *   6. "Partager le lien" → fallback clipboard si share absent
 *   7. URL partagée TOUJOURS sans ?published=1
 *   8. Fallback toast d'erreur si clipboard échoue
 *   9. Bouton X appelle onClose
 *  10. Lien dashboard pointe sur /dashboard
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MissionPublishedBanner } from "@/components/missions/MissionPublishedBanner";

const renderBanner = (overrides: Partial<React.ComponentProps<typeof MissionPublishedBanner>> = {}) => {
  const props = {
    missionTitle: "Promener mon chien",
    isAuthor: true,
    published: true,
    onClose: vi.fn(),
    onToast: vi.fn(),
    currentUrlOverride: "https://example.test/petites-missions/abc-123?published=1",
    ...overrides,
  };
  const result = render(
    <MemoryRouter>
      <MissionPublishedBanner {...props} />
    </MemoryRouter>,
  );
  return { ...result, props };
};

describe("MissionPublishedBanner — affichage conditionnel", () => {
  it("s'affiche quand published=1 ET isAuthor=true", () => {
    renderBanner();
    expect(screen.getByTestId("mission-published-banner")).toBeInTheDocument();
  });

  it("ne s'affiche PAS si l'utilisateur n'est pas l'auteur (sécurité)", () => {
    renderBanner({ isAuthor: false, published: true });
    expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
  });

  it("ne s'affiche PAS si published=false", () => {
    renderBanner({ isAuthor: true, published: false });
    expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
  });

  it("ne s'affiche PAS si ni auteur ni published", () => {
    renderBanner({ isAuthor: false, published: false });
    expect(screen.queryByTestId("mission-published-banner")).not.toBeInTheDocument();
  });
});

describe("MissionPublishedBanner — copy littéral (vouvoiement, voix On)", () => {
  it("affiche le titre exact", () => {
    renderBanner();
    expect(screen.getByText("Votre mission est en ligne.")).toBeInTheDocument();
  });

  it("affiche le paragraphe complet (alerte digest quotidienne)", () => {
    renderBanner();
    expect(
      screen.getByText(/Elle est visible dès maintenant pour les membres/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/au prochain envoi quotidien\.$/i)).toBeInTheDocument();
  });

  it("expose les deux actions : partage + retour dashboard", () => {
    renderBanner();
    expect(screen.getByRole("button", { name: "Partager le lien" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à mon tableau de bord" })).toBeInTheDocument();
  });

  it("le lien dashboard pointe sur /dashboard", () => {
    renderBanner();
    const link = screen.getByRole("link", { name: "Retour à mon tableau de bord" });
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});

describe("MissionPublishedBanner — fermeture (X)", () => {
  it("appelle onClose au clic sur le bouton X", () => {
    const onClose = vi.fn();
    renderBanner({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Fermer la confirmation" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("MissionPublishedBanner — partage du lien", () => {
  let originalShare: any;
  let originalClipboard: any;

  beforeEach(() => {
    originalShare = (navigator as any).share;
    originalClipboard = (navigator as any).clipboard;
  });

  afterEach(() => {
    if (originalShare === undefined) delete (navigator as any).share;
    else (navigator as any).share = originalShare;
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
  });

  it("utilise navigator.share quand il est disponible — URL nettoyée (sans ?published=1)", async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    (navigator as any).share = shareSpy;

    const onToast = vi.fn();
    renderBanner({ onToast });
    fireEvent.click(screen.getByRole("button", { name: "Partager le lien" }));

    await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(1));
    expect(shareSpy).toHaveBeenCalledWith({
      title: "Promener mon chien",
      url: "https://example.test/petites-missions/abc-123",
    });
    expect(onToast).not.toHaveBeenCalled();
  });

  it("fallback clipboard si navigator.share absent — URL nettoyée + toast succès", async () => {
    delete (navigator as any).share;
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
      writable: true,
    });

    const onToast = vi.fn();
    renderBanner({ onToast });
    fireEvent.click(screen.getByRole("button", { name: "Partager le lien" }));

    await waitFor(() => expect(writeTextSpy).toHaveBeenCalledTimes(1));
    expect(writeTextSpy).toHaveBeenCalledWith(
      "https://example.test/petites-missions/abc-123",
    );
    expect(onToast).toHaveBeenCalledWith({
      title: "Lien copié.",
      description: expect.any(String),
    });
  });

  it("fallback clipboard si navigator.share rejette (utilisateur annule)", async () => {
    (navigator as any).share = vi.fn().mockRejectedValue(new Error("user cancelled"));
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
      writable: true,
    });

    const onToast = vi.fn();
    renderBanner({ onToast });
    fireEvent.click(screen.getByRole("button", { name: "Partager le lien" }));

    await waitFor(() => expect(writeTextSpy).toHaveBeenCalledTimes(1));
    expect(writeTextSpy).toHaveBeenCalledWith(
      "https://example.test/petites-missions/abc-123",
    );
    expect(onToast).toHaveBeenCalledWith({
      title: "Lien copié.",
      description: expect.any(String),
    });
  });

  it("toast d'erreur si clipboard échoue (permission refusée)", async () => {
    delete (navigator as any).share;
    const writeTextSpy = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
      writable: true,
    });

    const onToast = vi.fn();
    renderBanner({ onToast });
    fireEvent.click(screen.getByRole("button", { name: "Partager le lien" }));

    await waitFor(() => expect(onToast).toHaveBeenCalledTimes(1));
    expect(onToast).toHaveBeenCalledWith({
      title: "Copie impossible.",
      description: expect.any(String),
      variant: "destructive",
    });
  });
});
