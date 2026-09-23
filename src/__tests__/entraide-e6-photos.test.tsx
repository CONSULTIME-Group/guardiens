import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NeedCard } from "@/components/entraide/EntraideCards";
import { EntraideNeed } from "@/components/entraide/EntraideCards";
import { MemoryRouter } from "react-router-dom";

const baseNeed: EntraideNeed = {
  id: "need-1",
  slug: "besoin-test",
  title: "Nourrir le chat pendant mes vacances",
  city: "Lyon",
  date_needed: "2026-10-01",
  end_date: null,
  latitude: 45.75,
  longitude: 4.85,
  response_count: 2,
};

const renderNeed = (need: EntraideNeed) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <NeedCard need={need} distance={null} showDistance={false} />
    </MemoryRouter>,
  );

describe("Lot E6 partie 3, photos des besoins", () => {
  it("affiche la première photo en tête de carte, ratio 4:3, chargement différé, alt égal au titre", () => {
    const html = renderNeed({ ...baseNeed, photos: ["https://example.com/photo1.webp", "https://example.com/photo2.webp"] });
    expect(html).toContain('src="https://example.com/photo1.webp"');
    expect(html).not.toContain("photo2.webp");
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('alt="Nourrir le chat pendant mes vacances"');
    expect(html).toMatch(/aspect-\[4\/3\]/);
  });

  it("n'affiche pas d'image générique sans photo et garde un en-tête typographique sobre avec ville et date", () => {
    const html = renderNeed({ ...baseNeed, photos: null });
    expect(html).not.toContain("<img");
    expect(html).toContain("Lyon");
    expect(html).toContain("À convenir ensemble");
  });

  it("garde le titre et le compteur de réponses dans les deux états", () => {
    const withPhoto = renderNeed({ ...baseNeed, photos: ["https://example.com/p.webp"] });
    const withoutPhoto = renderNeed({ ...baseNeed, photos: [] });
    for (const html of [withPhoto, withoutPhoto]) {
      expect(html).toContain("Nourrir le chat pendant mes vacances");
      expect(html).toContain("personnes ont dit je peux");
      expect(html).toContain("Voir le détail");
    }
  });
});
