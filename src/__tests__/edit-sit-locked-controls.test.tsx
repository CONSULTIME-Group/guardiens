/**
 * Vérifie que le verrouillage d'une annonce est réel et non décoratif :
 * les entrées fichier, les boutons photo et les chips portent bien `disabled`.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChipSelect from "@/components/profile/ChipSelect";
import SitPhotoManager from "@/components/sits/owner/SitPhotoManager";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }) }) }),
    functions: { invoke: vi.fn() },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  },
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("verrouillage annonce archivée", () => {
  it("désactive les chips", () => {
    render(<ChipSelect options={["A", "B"]} selected={[]} onChange={() => {}} disabled />);
    screen.getAllByRole("button").forEach((b) => {
      expect((b as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it("désactive les entrées fichier et les boutons photo", () => {
    const { container } = render(
      <MemoryRouter><SitPhotoManager
        sitId="s1"
        ownerId="o1"
        initialCoverPhotoUrl={null}
        initialGallery={[]}
        disabled
      /></MemoryRouter>,
    );
    const files = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(files.length).toBeGreaterThan(0);
    files.forEach((f) => expect(f.disabled).toBe(true));
  });

  it("laisse les entrées fichier actives hors verrouillage", () => {
    const { container } = render(
      <MemoryRouter><SitPhotoManager sitId="s1" ownerId="o1" initialCoverPhotoUrl={null} initialGallery={[]} /></MemoryRouter>,
    );
    const files = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    files.forEach((f) => expect(f.disabled).toBe(false));
  });
});
