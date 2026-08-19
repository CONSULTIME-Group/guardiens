import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BreedCardImage, {
  TypographicFallback,
} from "@/components/breeds/BreedCardImage";
import type { BreedListingEntry } from "@/lib/breedsListingModel";

const entry = (
  extra: Partial<BreedListingEntry> = {},
): BreedListingEntry => ({
  species: "dog",
  breed: "akita inu",
  image_url: "https://example.test/akita.webp",
  image_alt: "Un Akita Inu dans la neige",
  difficulty_level: null,
  ...extra,
});

describe("BreedCardImage — jamais de rectangle vide", () => {
  it("rend le repli typographique EN SOUS-COUCHE même quand une image existe", () => {
    render(<BreedCardImage entry={entry()} speciesLabel="Chien" />);
    expect(screen.getByTestId("breed-typographic-fallback")).toBeInTheDocument();
    const img = screen.getByRole("img", { name: "Un Akita Inu dans la neige" });
    // Tant que l'image n'est pas chargée, elle est invisible : le repli seul paraît.
    expect(img.className).toContain("opacity-0");
  });

  it("révèle l'image en fondu une fois chargée", () => {
    render(<BreedCardImage entry={entry()} speciesLabel="Chien" />);
    const img = screen.getByRole("img", { name: "Un Akita Inu dans la neige" });
    fireEvent.load(img);
    expect(img.className).toContain("opacity-100");
    expect(screen.getByTestId("breed-typographic-fallback")).toBeInTheDocument();
  });

  it("bascule sur le repli si l'image échoue (429, 404, réseau)", () => {
    render(<BreedCardImage entry={entry()} speciesLabel="Chien" />);
    const img = screen.getByRole("img", { name: "Un Akita Inu dans la neige" });
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("breed-typographic-fallback")).toBeInTheDocument();
  });

  it("sans image_url, seul le repli est rendu", () => {
    render(<BreedCardImage entry={entry({ image_url: null })} speciesLabel="Chien" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("breed-typographic-fallback")).toBeInTheDocument();
  });

  it("charge l'image en différé (lazy) et en décodage asynchrone", () => {
    render(<BreedCardImage entry={entry()} speciesLabel="Chien" />);
    const img = screen.getByRole("img", { name: "Un Akita Inu dans la neige" });
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("le repli porte l'initiale de la race et le nom d'espèce", () => {
    render(<TypographicFallback breed="sphynx" speciesLabel="Chat" />);
    const fallback = screen.getByTestId("breed-typographic-fallback");
    expect(fallback.textContent).toContain("S");
    expect(fallback.textContent).toContain("Chat");
  });
});
