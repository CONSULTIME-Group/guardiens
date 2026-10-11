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
  it("sans filtre, seules les 58 illustrations actives sont proposées ; la 2ᵉ vignette est la n° 003", () => {
    renderModal();

    const thumbs = thumbnails();
    expect(thumbs.length).toBe(58);
    // hero-02 est retirée : la 2ᵉ vignette porte l'identité n° 003, pas sa position.
    expect(thumbs[1]).toHaveAttribute("title", "Illustration n°003, Animaux & plantes");
    expect(thumbs.some((t) => t.getAttribute("title")?.startsWith("Illustration n°002,"))).toBe(false);

    fireEvent.click(thumbs[1]);

    const preview = previewOverlay();
    expect(preview.textContent).toContain("n° 003");
    const img = within(preview).getByAltText("Aperçu illustration 3");
    expect(img.getAttribute("src")).toMatch(/hero-03\.jpg/);
  });

  it("avec le filtre « Maison » actif, cliquer la 5ᵉ vignette affiche « n° 077 » et l'image hero-77", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /^Maison \(7\)$/ }));

    const thumbs = thumbnails();
    expect(thumbs.length).toBe(7);
    // 74 et 75 sont retirées : la 5ᵉ vignette de « Maison » est l'illustration n° 077.
    expect(thumbs[4]).toHaveAttribute("title", "Illustration n°077, Maison");

    fireEvent.click(thumbs[4]);

    const preview = previewOverlay();
    expect(preview.textContent).toContain("n° 077");
    expect(preview.textContent).not.toContain("n° 071");
    const img = within(preview).getByAltText("Aperçu illustration 77");
    expect(img.getAttribute("src")).toMatch(/hero-77\.jpg/);
  });

  it("avec le filtre « Maison », chaque vignette cliquée affiche son propre numéro", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /^Maison \(7\)$/ }));
    const thumbs = thumbnails();

    for (const [k, num] of [[0, 71], [4, 77], [6, 80]] as const) {
      fireEvent.click(thumbs[k]);
      const expectedNum = String(num).padStart(3, "0");
      const preview = previewOverlay();
      expect(preview.textContent).toContain(`n° ${expectedNum}`);
      const img = within(preview).getByAltText(`Aperçu illustration ${num}`);
      expect(img.getAttribute("src")).toContain(`hero-${num}.jpg`);
      // Retour à la galerie avant le clic suivant.
      fireEvent.click(within(preview).getByRole("button", { name: "Retour à la galerie" }));
    }
  });
});
