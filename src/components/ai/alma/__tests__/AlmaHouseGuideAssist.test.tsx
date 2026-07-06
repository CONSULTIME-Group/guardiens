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
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

describe("AlmaHouseGuideAssist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__almaHouseGuideSeen = false;
  });

  it("affiche la bulle Alma avec le CTA de génération", () => {
    render(<AlmaHouseGuideAssist onDrafts={() => {}} />);
    expect(screen.getByText(/guide maison/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /générer les 4 trames/i })).toBeInTheDocument();
  });

  it("track alma_house_guide_bubble_seen une seule fois au mount", () => {
    render(<AlmaHouseGuideAssist onDrafts={() => {}} />);
    expect(trackEvent).toHaveBeenCalledWith("alma_house_guide_bubble_seen");
  });

  it("respecte le vouvoiement (jamais 'tu ' dans le texte visible)", () => {
    const { container } = render(<AlmaHouseGuideAssist onDrafts={() => {}} />);
    expect(container.textContent || "").not.toMatch(/\btu\s/i);
    expect(container.textContent || "").toMatch(/vous/i);
  });

  it("aucun tiret cadratin dans la copie", () => {
    const { container } = render(<AlmaHouseGuideAssist onDrafts={() => {}} />);
    expect(container.textContent || "").not.toContain("—");
  });

  it("appelle generate-house-guide et propage les 4 trames au parent", async () => {
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
    const onDrafts = vi.fn();
    render(<AlmaHouseGuideAssist onDrafts={onDrafts} />);
    fireEvent.click(screen.getByRole("button", { name: /générer les 4 trames/i }));
    await waitFor(() => expect(onDrafts).toHaveBeenCalledTimes(1));
    expect(onDrafts).toHaveBeenCalledWith({
      wifi_info: "Trame WiFi",
      neighborhood: "Trame quartier",
      veterinary: "Trame vétérinaire",
      emergency: "Trame urgences",
    });
    expect(trackEvent).toHaveBeenCalledWith("alma_house_guide_generated");
  });

  it("gère les erreurs sans crasher", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: new Error("boom"),
    });
    const onDrafts = vi.fn();
    render(<AlmaHouseGuideAssist onDrafts={onDrafts} />);
    fireEvent.click(screen.getByRole("button", { name: /générer les 4 trames/i }));
    await waitFor(() => expect(onDrafts).not.toHaveBeenCalled());
  });
});
