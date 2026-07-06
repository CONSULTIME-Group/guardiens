import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AlmaFitGardien } from "../AlmaFitGardien";

vi.mock("@/integrations/supabase/client", () => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [] }),
  };
  return {
    supabase: {
      from: vi.fn(() => chain),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "owner-1", role: "owner" },
    activeRole: "owner",
  }),
}));

vi.mock("@/hooks/useViewerOwnerForAffinity", () => ({
  useViewerOwnerForAffinity: () => ({
    owner: {
      preferred_sitter_types: ["retired"],
      home_ambiance: ["calme"],
      languages: ["français"],
      interests: ["nature"],
      life_pace: "calme",
      presence_expected: "présent",
      pets: [{ species: "dog" }],
    },
    loading: false,
  }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/components/sits/owner/InviteToMySitButton", () => ({
  default: ({ label }: any) => <button>{label}</button>,
}));

import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

describe("AlmaFitGardien", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Par défaut : owner a 1 sit publié, sitter n'a jamais vu l'annonce
    const from = (supabase.from as any);
    from.mockImplementation((table: string) => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(),
      };
      if (table === "sits") {
        chain.limit.mockResolvedValue({
          data: [{ id: "sit-1", title: "Ma garde", start_date: null, end_date: null }],
        });
        chain.order.mockReturnValue(chain);
      }
      if (table === "analytics_events") {
        chain.limit.mockResolvedValue({ data: [] });
        chain.gte.mockResolvedValue({ data: [] });
      }
      return chain;
    });
  });

  const sitterProfile = {
    animal_types: ["dog"],
    life_pace: "calme",
    languages: ["français"],
    interests: ["nature"],
    work_during_sit: "non",
    sitter_type: "retired",
  } as any;

  it("affiche la bulle avec le score et le CTA d'invitation quand l'owner a une annonce", async () => {
    render(
      <AlmaFitGardien
        sitter={{ id: "sitter-1", first_name: "Claire", reviewCount: 4 }}
        sitterProfile={sitterProfile}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Claire correspond à votre annonce/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /inviter claire à candidater/i })).toBeInTheDocument();
    expect(screen.getByText(/4 avis positifs/i)).toBeInTheDocument();
  });

  it("track alma_fit_gardien_seen une fois", async () => {
    render(
      <AlmaFitGardien
        sitter={{ id: "sitter-1", first_name: "Claire" }}
        sitterProfile={sitterProfile}
      />,
    );
    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith(
        "alma_fit_gardien_seen",
        expect.objectContaining({ metadata: expect.objectContaining({ sitter_id: "sitter-1" }) }),
      );
    });
  });

  it("ne rend rien si le sitterProfile est null", () => {
    const { container } = render(
      <AlmaFitGardien sitter={{ id: "sitter-1", first_name: "Claire" }} sitterProfile={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("respecte le vouvoiement et n'a pas de tiret cadratin", async () => {
    const { container } = render(
      <AlmaFitGardien
        sitter={{ id: "sitter-1", first_name: "Claire" }}
        sitterProfile={sitterProfile}
      />,
    );
    await waitFor(() => expect(screen.getByText(/correspond à votre annonce/i)).toBeInTheDocument());
    expect(container.textContent || "").not.toMatch(/\btu\s/i);
    expect(container.textContent || "").not.toContain("—");
  });
});
