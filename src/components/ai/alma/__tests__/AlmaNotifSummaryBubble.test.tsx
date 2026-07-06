import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlmaNotifSummaryBubble } from "../AlmaNotifSummaryBubble";
import type { NotificationData } from "@/components/notifications/NotificationItem";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

const freqMock = vi.fn(() => ({ frequency: "balanced", loading: false, setFrequency: vi.fn() }));
vi.mock("@/hooks/useAlmaFrequency", () => ({
  useAlmaFrequency: () => freqMock(),
}));

const authMock = vi.fn(() => ({ user: { id: "u1" }, activeRole: "owner" }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authMock(),
}));

const mk = (type: string, i: number, read = false): NotificationData => ({
  id: `n${i}`,
  type,
  title: "t",
  body: "b",
  link: null,
  read_at: read ? new Date().toISOString() : null,
  created_at: new Date().toISOString(),
  actor_name: null,
  actor_avatar_url: null,
});

describe("AlmaNotifSummaryBubble", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    freqMock.mockReturnValue({ frequency: "balanced", loading: false, setFrequency: vi.fn() });
    authMock.mockReturnValue({ user: { id: "u1" }, activeRole: "owner" });
  });

  it("renders vouvoiement for owner when 5+ unread", () => {
    const notifs = Array.from({ length: 6 }, (_, i) => mk("new_application", i));
    render(
      <AlmaNotifSummaryBubble notifications={notifs} onFilterUrgent={vi.fn()} />,
    );
    expect(screen.getByText(/vous avez 6 notifications/i)).toBeInTheDocument();
  });

  it("utilise le vouvoiement même en rôle sitter", () => {
    authMock.mockReturnValue({ user: { id: "u1" }, activeRole: "sitter" });
    const notifs = Array.from({ length: 5 }, (_, i) => mk("new_message", i));
    render(
      <AlmaNotifSummaryBubble notifications={notifs} onFilterUrgent={vi.fn()} />,
    );
    expect(screen.getByText(/vous avez 5 notifications/i)).toBeInTheDocument();
  });

  it("shows on mixed types even below 5 unread", () => {
    const notifs = [mk("new_application", 1), mk("new_message", 2), mk("review_published", 3)];
    render(
      <AlmaNotifSummaryBubble notifications={notifs} onFilterUrgent={vi.fn()} />,
    );
    expect(screen.getByText(/candidature/i)).toBeInTheDocument();
  });

  it("hides when silent frequency", () => {
    freqMock.mockReturnValue({ frequency: "silent", loading: false, setFrequency: vi.fn() });
    const notifs = Array.from({ length: 6 }, (_, i) => mk("new_message", i));
    const { container } = render(
      <AlmaNotifSummaryBubble notifications={notifs} onFilterUrgent={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onFilterUrgent on button click", () => {
    const onFilter = vi.fn();
    const notifs = [
      ...Array.from({ length: 4 }, (_, i) => mk("new_message", i)),
      mk("mission_proposal", 5),
      mk("mission_accepted", 6),
    ];
    render(<AlmaNotifSummaryBubble notifications={notifs} onFilterUrgent={onFilter} />);
    fireEvent.click(screen.getByRole("button", { name: /voir les .* urgente/i }));
    expect(onFilter).toHaveBeenCalled();
  });

  it("hides when urgentFilterActive is true", () => {
    const notifs = Array.from({ length: 6 }, (_, i) => mk("new_application", i));
    const { container } = render(
      <AlmaNotifSummaryBubble notifications={notifs} urgentFilterActive onFilterUrgent={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("contains no em-dash", () => {
    const notifs = Array.from({ length: 5 }, (_, i) => mk("new_message", i));
    render(<AlmaNotifSummaryBubble notifications={notifs} onFilterUrgent={vi.fn()} />);
    expect(document.body.textContent).not.toMatch(/—/);
  });
});
