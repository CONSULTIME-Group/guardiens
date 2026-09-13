/**
 * Rendu et persistance du bloc de bénévolat en association.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VolunteerAvailabilityBlock from "@/components/profile/VolunteerAvailabilityBlock";
import {
  VOLUNTEER_CHECKBOX_LABEL,
  VOLUNTEER_WAITING_SENTENCE,
} from "@/lib/volunteerAvailability";

const upsert = vi.fn().mockResolvedValue({ error: null });
const maybeSingle = vi.fn().mockResolvedValue({ data: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      upsert,
    }),
  },
}));

const trackEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: any[]) => trackEvent(...a) }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

describe("VolunteerAvailabilityBlock", () => {
  beforeEach(() => {
    upsert.mockClear();
    trackEvent.mockClear();
  });

  it("affiche la case à cocher et la phrase d'attente, et ouvre le détail au clic", async () => {
    const user = userEvent.setup();
    render(<VolunteerAvailabilityBlock userId="u1" postalCode="74000" activeRole="sitter" />);

    expect(screen.getByText(VOLUNTEER_CHECKBOX_LABEL)).toBeInTheDocument();
    expect(screen.getByText(VOLUNTEER_WAITING_SENTENCE)).toBeInTheDocument();
    expect(screen.queryByText("Ce que je peux apporter")).toBeNull();

    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByText("Le type de structure que j'aimerais aider")).toBeInTheDocument();
    expect(screen.getByText("Ce que je peux apporter")).toBeInTheDocument();
    expect(screen.getByText("À quel rythme")).toBeInTheDocument();
    // Le département du profil est prérempli à partir du code postal.
    expect(screen.getByRole("button", { name: /74 Haute-Savoie/ })).toBeInTheDocument();
  });

  it("enregistre la déclaration et émet la mesure", async () => {
    const user = userEvent.setup();
    render(<VolunteerAvailabilityBlock userId="u1" postalCode="74000" activeRole="owner" />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Refuge et fourrière" }));
    await user.click(screen.getByRole("button", { name: "Bricolage" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer ma déclaration" }));

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    const payload = upsert.mock.calls[0][0];
    expect(payload).toMatchObject({
      user_id: "u1",
      available: true,
      structure_types: ["Refuge et fourrière"],
      skills: ["Bricolage"],
      departments: ["74"],
    });
    expect(trackEvent).toHaveBeenCalledWith(
      "volunteer_availability_saved",
      expect.objectContaining({
        metadata: { active_role: "owner", structure_types_count: 1, skills_count: 1 },
      }),
    );
  });
});
