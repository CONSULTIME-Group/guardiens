import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProVerifiedBadge from "@/components/pros/ProVerifiedBadge";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

import { vi } from "vitest";

describe("ProVerifiedBadge", () => {
  it("affiche le libellé « Vérifié Guardiens »", () => {
    render(<ProVerifiedBadge surface="detail" trackImpression={false} />);
    expect(screen.getByText(/Vérifié Guardiens/i)).toBeInTheDocument();
  });

  it("expose un aria-label accessible", () => {
    render(<ProVerifiedBadge surface="card_annuaire" trackImpression={false} />);
    expect(screen.getByLabelText(/Pro vérifié Guardiens/i)).toBeInTheDocument();
  });
});
