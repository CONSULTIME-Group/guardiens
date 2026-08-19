/**
 * Carte rencontre gardien (SitterMatchSection), refonte lisibilité :
 *
 * - libellés d'espèces via le mapping partagé (jamais la valeur brute "dog"),
 * - photo d'animal prioritaire sur la couverture du lieu,
 * - fond d'attente aquarelle toujours présent sous la photo (pas de vide blanc),
 * - rangée compacte complétée depuis le pool de repli, sans doublon,
 * - lien de recherche explicite avec compte réel (jamais codé en dur).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SitterMatchSection from "../SitterMatchSection";
import type { AffinitySitCard } from "@/hooks/useSitterTopAffinitySits";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

const sit = (over: Partial<AffinitySitCard>): AffinitySitCard => ({
  id: over.id ?? "sit-x",
  title: over.title ?? "Garde de Nougat",
  city: over.city ?? "Gex",
  start_date: "2026-08-27",
  end_date: "2026-09-30",
  cover_photo_url: null,
  pet_photo_url: null,
  owner_first_name: "Jennifer",
  pet_species: ["dog"],
  affinity: null,
  ...over,
});

const scored = (id: string, score: number, over: Partial<AffinitySitCard> = {}): AffinitySitCard =>
  sit({
    id,
    title: `Annonce ${id}`,
    affinity: { score, matched: ["Langue commune"], total: 5, displayed: true },
    ...over,
  });

const renderSection = (props: Partial<Parameters<typeof SitterMatchSection>[0]>) =>
  render(
    <MemoryRouter>
      <SitterMatchSection
        topSits={[]}
        fallbackSits={[]}
        scopeUsed="dept"
        isLoading={false}
        {...props}
      />
    </MemoryRouter>,
  );

describe("SitterMatchSection — libellés et photo de la vedette", () => {
  it("affiche « Chien », jamais la valeur brute « dog »", () => {
    renderSection({ topSits: [scored("a", 80)] });
    expect(screen.getByText(/Chien · 27 août au 30 septembre/)).toBeInTheDocument();
    expect(screen.queryByText(/\bdog\b/)).not.toBeInTheDocument();
  });

  it("omet l'espèce inconnue plutôt que d'afficher la valeur brute", () => {
    renderSection({ topSits: [scored("a", 80, { pet_species: ["licorne"] })] });
    expect(screen.queryByText(/licorne/)).not.toBeInTheDocument();
  });

  it("préfère la photo d'animal à la couverture du lieu", () => {
    renderSection({
      topSits: [
        scored("a", 80, {
          cover_photo_url: "https://img.test/lieu.jpg",
          pet_photo_url: "https://img.test/nougat.jpg",
        }),
      ],
    });
    const img = screen.getByRole("img", { name: /Annonce a/ });
    expect(img.getAttribute("src")).toContain("nougat.jpg");
  });

  it("retombe sur la couverture du lieu sans photo d'animal", () => {
    renderSection({
      topSits: [scored("a", 80, { cover_photo_url: "https://img.test/lieu.jpg" })],
    });
    const img = screen.getByRole("img", { name: /Annonce a/ });
    expect(img.getAttribute("src")).toContain("lieu.jpg");
  });

  it("garde un fond d'attente sous la photo pendant le chargement", () => {
    renderSection({
      topSits: [scored("a", 80, { pet_photo_url: "https://img.test/nougat.jpg" })],
    });
    const img = screen.getByRole("img", { name: /Annonce a/ });
    expect(img.parentElement?.style.background).toContain("--photo-placeholder-green");
  });
});

describe("SitterMatchSection — rangée compacte et sortie recherche", () => {
  it("complète la rangée depuis le pool de repli quand le top affinité est pauvre", () => {
    renderSection({
      topSits: [scored("a", 80)],
      fallbackSits: [
        scored("a", 80),
        sit({ id: "b", title: "Garde B" }),
        sit({ id: "c", title: "Garde C" }),
        sit({ id: "d", title: "Garde D" }),
      ],
    });
    expect(screen.getByText("Garde B")).toBeInTheDocument();
    expect(screen.getByText("Garde C")).toBeInTheDocument();
    expect(screen.getByText("Garde D")).toBeInTheDocument();
  });

  it("ne duplique jamais la vedette dans la rangée", () => {
    renderSection({
      topSits: [],
      fallbackSits: [sit({ id: "a", title: "Vedette unique" }), sit({ id: "b", title: "Garde B" })],
    });
    expect(screen.getAllByText("Vedette unique")).toHaveLength(1);
  });

  it("affiche le score sur une rangée scorée, jamais sur une rangée de repli", () => {
    renderSection({
      topSits: [scored("a", 80), scored("b", 62)],
      fallbackSits: [scored("a", 80), scored("b", 62), sit({ id: "c", title: "Garde C" })],
    });
    expect(screen.getByText("62 %")).toBeInTheDocument();
    const rowC = screen.getByText("Garde C").closest("a");
    expect(rowC?.textContent).not.toMatch(/%/);
  });

  it("plafonne la rangée à 3 gardes", () => {
    renderSection({
      topSits: [scored("a", 80)],
      fallbackSits: [
        scored("a", 80),
        sit({ id: "b", title: "Garde B" }),
        sit({ id: "c", title: "Garde C" }),
        sit({ id: "d", title: "Garde D" }),
        sit({ id: "e", title: "Garde E" }),
      ],
    });
    expect(screen.queryByText("Garde E")).not.toBeInTheDocument();
  });

  it("affiche le compte réel dans le lien de recherche", () => {
    renderSection({ topSits: [scored("a", 80)], totalPublished: 11 });
    const link = screen.getByRole("link", { name: "Voir les 11 gardes disponibles" });
    expect(link.getAttribute("href")).toBe("/search");
  });

  it("accorde le singulier quand une seule garde est en ligne", () => {
    renderSection({ topSits: [scored("a", 80)], totalPublished: 1 });
    expect(screen.getByRole("link", { name: "Voir la garde disponible" })).toBeInTheDocument();
  });

  it("affiche le lien de recherche même sans rangée compacte", () => {
    renderSection({
      topSits: [scored("a", 80)],
      fallbackSits: [scored("a", 80)],
      totalPublished: 11,
    });
    expect(screen.getByRole("link", { name: "Voir les 11 gardes disponibles" })).toBeInTheDocument();
  });

  it("n'invente pas de rangée vide quand rien ne correspond", () => {
    renderSection({ topSits: [], fallbackSits: [], totalPublished: 0 });
    expect(screen.getByText(/Votre prochaine rencontre se prépare/)).toBeInTheDocument();
  });
});
