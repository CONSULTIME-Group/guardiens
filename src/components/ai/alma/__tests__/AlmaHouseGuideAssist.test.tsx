import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AlmaHouseGuideAssist } from "../AlmaHouseGuideAssist";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

describe("AlmaHouseGuideAssist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__almaHouseGuideSeen = false;
  });

  it("affiche la bulle Alma avec le CTA de génération", () => {
    render(<AlmaHouseGuideAssist onDrafts={() => 0} />);
    expect(screen.getByText(/guide maison/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /générer les 2 trames/i })).toBeInTheDocument();
  });

  it("track alma_house_guide_bubble_seen une seule fois au mount", () => {
    render(<AlmaHouseGuideAssist onDrafts={() => 0} />);
    expect(trackEvent).toHaveBeenCalledWith("alma_house_guide_bubble_seen");
  });

  it("respecte le vouvoiement (jamais 'tu ' dans le texte visible)", () => {
    const { container } = render(<AlmaHouseGuideAssist onDrafts={() => 0} />);
    expect(container.textContent || "").not.toMatch(/\btu\s/i);
    expect(container.textContent || "").toMatch(/vous/i);
  });

  it("aucun tiret cadratin dans la copie", () => {
    const { container } = render(<AlmaHouseGuideAssist onDrafts={() => 0} />);
    expect(container.textContent || "").not.toContain("—");
  });

  it("appelle generate-house-guide et propage les 2 trames de texte libre au parent", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        drafts: {
          wifi_info: "Trame WiFi",
          neighborhood: "Trame quartier",
          veterinary: "Trame vétérinaire",
          emergency: "Trame urgences",
        },
      },
      error: null,
    });
    const onDrafts = vi.fn(() => 2);
    render(<AlmaHouseGuideAssist onDrafts={onDrafts} />);
    fireEvent.click(screen.getByRole("button", { name: /générer les 2 trames/i }));
    await waitFor(() => expect(onDrafts).toHaveBeenCalledTimes(1));
    // Une ancienne réponse à quatre trames ne transmet que les deux de texte libre.
    expect(onDrafts).toHaveBeenCalledWith({
      wifi_info: "Trame WiFi",
      neighborhood: "Trame quartier",
    });
    expect(trackEvent).toHaveBeenCalledWith("alma_house_guide_generated", { metadata: { sections_filled: 2 } });
  });

  it("gère les erreurs sans crasher", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: new Error("boom"),
    });
    const onDrafts = vi.fn(() => 0);
    render(<AlmaHouseGuideAssist onDrafts={onDrafts} />);
    fireEvent.click(screen.getByRole("button", { name: /générer les 2 trames/i }));
    await waitFor(() => expect(onDrafts).not.toHaveBeenCalled());
  });
});
