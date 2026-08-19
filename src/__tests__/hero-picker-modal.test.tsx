import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { HeroPickerModal } from "@/components/profile/HeroPickerModal";

/**
 * Garde-fou de régression : le titre de l'aperçu doit porter l'identité réelle
 * de l'illustration (son n° de banque), jamais sa position dans la liste
 * filtrée. Bug observé : filtre « Maison » actif, clic sur la 5ᵉ vignette,
 * titre affiché « n° 071 » (premier de la catégorie) au lieu de « n° 075 ».
 */

// Évite toute dépendance réseau : la sauvegarde n'est pas exercée ici.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
  },
}));

function renderModal() {
  return render(
    <HeroPickerModal
      open
      onClose={() => {}}
      userId="00000000-0000-0000-0000-000000000000"
      currentIndex={null}
      onSaved={() => {}}
    />,
  );
}

/** Vignettes de la grille, identifiées par leur attribut title « Illustration n°NNN, … ». */
function thumbnails() {
  return screen
    .getAllByRole("button")
    .filter((b) => /^Illustration n°\d{3}, /.test(b.getAttribute("title") ?? ""));
}

function previewOverlay() {
  return screen.getByRole("dialog", { name: "Aperçu de l'illustration" });
}

describe("HeroPickerModal — identité de l'aperçu", () => {
  it("sans filtre, cliquer la 3ᵉ vignette affiche « n° 003 » et l'image hero-03", () => {
    renderModal();

    const thumbs = thumbnails();
    expect(thumbs.length).toBe(100);
    expect(thumbs[2]).toHaveAttribute("title", "Illustration n°003, Animaux & plantes");

    fireEvent.click(thumbs[2]);

    const preview = previewOverlay();
    expect(preview.textContent).toContain("n° 003");
    const img = within(preview).getByAltText("Aperçu illustration 3");
    expect(img.getAttribute("src")).toMatch(/hero-03\.jpg/);
  });

  it("avec le filtre « Maison » actif, cliquer la 5ᵉ vignette affiche « n° 075 » et l'image hero-75", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /^Maison \(10\)$/ }));

    const thumbs = thumbnails();
    expect(thumbs.length).toBe(10);
    // La 5ᵉ vignette de la catégorie « Maison » est l'illustration n° 075.
    expect(thumbs[4]).toHaveAttribute("title", "Illustration n°075, Maison");

    fireEvent.click(thumbs[4]);

    const preview = previewOverlay();
    expect(preview.textContent).toContain("n° 075");
    expect(preview.textContent).not.toContain("n° 071");
    const img = within(preview).getByAltText("Aperçu illustration 75");
    expect(img.getAttribute("src")).toMatch(/hero-75\.jpg/);
  });

  it("avec le filtre « Maison », chaque vignette cliquée affiche son propre numéro", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /^Maison \(10\)$/ }));
    const thumbs = thumbnails();

    for (const k of [0, 4, 9]) {
      fireEvent.click(thumbs[k]);
      const expectedNum = String(71 + k).padStart(3, "0");
      const preview = previewOverlay();
      expect(preview.textContent).toContain(`n° ${expectedNum}`);
      const img = within(preview).getByAltText(`Aperçu illustration ${71 + k}`);
      expect(img.getAttribute("src")).toContain(`hero-${71 + k}.jpg`);
      // Retour à la galerie avant le clic suivant.
      fireEvent.click(within(preview).getByRole("button", { name: "Retour à la galerie" }));
    }
  });
});
