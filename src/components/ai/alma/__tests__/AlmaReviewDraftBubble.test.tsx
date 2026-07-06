import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AlmaReviewDraftBubble from "../AlmaReviewDraftBubble";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

describe("AlmaReviewDraftBubble", () => {
  it("stays hidden when no sub-ratings filled", () => {
    render(
      <AlmaReviewDraftBubble
        sitId="s1"
        conversationId="c1"
        role="owner"
        subRatings={{}}
        comment=""
        selectedBadges={[]}
        onDraft={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /générer un brouillon/i })).not.toBeInTheDocument();
  });

  it("stays hidden when comment already reaches 50 chars", () => {
    render(
      <AlmaReviewDraftBubble
        sitId="s1"
        conversationId="c1"
        role="owner"
        subRatings={{ x: 5 }}
        comment={"a".repeat(60)}
        selectedBadges={[]}
        onDraft={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /générer un brouillon/i })).not.toBeInTheDocument();
  });

  it("stays hidden when no conversation id (no chat context to cite)", () => {
    render(
      <AlmaReviewDraftBubble
        sitId="s1"
        conversationId={null}
        role="owner"
        subRatings={{ x: 5 }}
        comment=""
        selectedBadges={[]}
        onDraft={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /générer un brouillon/i })).not.toBeInTheDocument();
  });

  it("appears with ratings + short comment, calls draft-review and returns the draft", async () => {
    invokeMock.mockResolvedValueOnce({ data: { draft: "Brouillon d'avis." }, error: null });
    const onDraft = vi.fn();
    render(
      <AlmaReviewDraftBubble
        sitId="s1"
        conversationId="c1"
        role="sitter"
        subRatings={{ x: 5 }}
        comment=""
        selectedBadges={[]}
        onDraft={onDraft}
      />,
    );
    const btn = screen.getByRole("button", { name: /générer un brouillon/i });
    fireEvent.click(btn);
    await waitFor(() => expect(onDraft).toHaveBeenCalledWith("Brouillon d'avis."));
    expect(invokeMock).toHaveBeenCalledWith("draft-review", expect.objectContaining({
      body: expect.objectContaining({ sit_id: "s1", conversation_id: "c1" }),
    }));
  });
});
