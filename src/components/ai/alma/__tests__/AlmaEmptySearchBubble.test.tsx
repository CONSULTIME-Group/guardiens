import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlmaEmptySearchBubble } from "../AlmaEmptySearchBubble";
import { trackEvent } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

const freqMock = vi.fn(() => ({ frequency: "balanced", loading: false, setFrequency: vi.fn() }));
vi.mock("@/hooks/useAlmaFrequency", () => ({
  useAlmaFrequency: () => freqMock(),
}));

const defaultProps = {
  hasFilters: true,
  radius: 15,
  zoneMode: "radius" as const,
  activeFilters: { verifiedOnly: true },
  onExpandToRegion: vi.fn(),
  onOpenAlert: vi.fn(),
  onRelaxFilter: vi.fn(),
};

describe("AlmaEmptySearchBubble", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    freqMock.mockReturnValue({ frequency: "balanced", loading: false, setFrequency: vi.fn() });
  });

  it("renders 3 actions when a restrictive filter is active", () => {
    render(<AlmaEmptySearchBubble {...defaultProps} />);
    expect(screen.getByRole("button", { name: /élargir à la région/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /activer une alerte/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /relâcher le filtre vérifié/i })).toBeInTheDocument();
  });

  it("uses tutoiement (audience sitter)", () => {
    render(<AlmaEmptySearchBubble {...defaultProps} />);
    expect(screen.getByText(/veux-tu que je propose/i)).toBeInTheDocument();
  });

  it("returns null when frequency is silent", () => {
    freqMock.mockReturnValue({ frequency: "silent", loading: false, setFrequency: vi.fn() });
    const { container } = render(<AlmaEmptySearchBubble {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when no filters and radius >= 100 in france mode", () => {
    const { container } = render(
      <AlmaEmptySearchBubble
        {...defaultProps}
        hasFilters={false}
        radius={100}
        zoneMode="france"
        activeFilters={{}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("fires analytics on relax_filter click with restrictive_filter", () => {
    render(<AlmaEmptySearchBubble {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /relâcher/i }));
    expect(defaultProps.onRelaxFilter).toHaveBeenCalledWith("verifiedOnly");
    expect(trackEvent).toHaveBeenCalledWith(
      "alma_empty_search_action_clicked",
      expect.objectContaining({
        metadata: expect.objectContaining({ action_id: "relax_filter", restrictive_filter: "verifiedOnly" }),
      }),
    );
  });

  it("contains no em-dash", () => {
    render(<AlmaEmptySearchBubble {...defaultProps} />);
    expect(document.body.textContent).not.toMatch(/—/);
  });
});
