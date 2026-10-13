/**
 * Lot X3a (13/10/2026), parcours gardien :
 * B-02 annulation de participation, B-03 candidat non retenu sur une garde
 * confirmée, B-04 clôture système lue comme telle, B-07 proposition privée
 * acceptée, B-08 retrait depuis /mes-candidatures.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";

const h = vi.hoisted(() => ({
  after: "published" as string | null,
  rpcCalls: [] as Array<{ fn: string; args: any }>,
  writes: [] as Array<{ table: string; op: string; payload: any }>,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  emails: [] as any[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const from = (table: string) => {
    const chain: any = {};
    const pass = () => chain;
    Object.assign(chain, {
      select: pass, eq: pass, or: pass, in: pass, limit: pass, order: pass,
      update: (payload: any) => { h.writes.push({ table, op: "update", payload }); return chain; },
      insert: (payload: any) => { h.writes.push({ table, op: "insert", payload }); return chain; },
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any, reject?: any) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
    });
    return chain;
  };
  return {
    supabase: {
      from,
      rpc: (fn: string, args: any) => {
        h.rpcCalls.push({ fn, args });
        if (fn === "get_public_sit") return Promise.resolve({ data: h.after ? [{ id: "sit-1", status: h.after }] : [], error: null });
        return Promise.resolve({ data: "review-1", error: null });
      },
    },
  };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "sitter-1", firstName: "Ana" } }),
}));
vi.mock("@/lib/sendTransactionalEmail", () => ({
  sendTransactionalEmail: (p: any) => { h.emails.push(p); return Promise.resolve(); },
}));
vi.mock("sonner", () => ({
  toast: { success: (m: string) => h.toastSuccess(m), error: (m: string) => h.toastError(m) },
}));

import CancelSitModal from "@/components/sits/CancelSitModal";
import SitterStatusBanner from "@/components/sits/views/SitterStatusBanner";
import { cancelOutcomeFromStatus, cancelOutcomeMessage } from "@/lib/sitCancellation";
import { sitterPresenceOnSit } from "@/lib/sitterSitPresence";
import {
  cancelledApplicationLabel,
  groupApplications,
  sitStateNote,
} from "@/lib/applicationSitState";

const read = (p: string) => readFileSync(p, "utf8");
const REASON = "Un imprévu familial m'oblige à rester chez moi.";

async function cancelAsSitter(after: string | null) {
  h.after = after;
  const onCancelled = vi.fn();
  render(
    <CancelSitModal
      open
      onOpenChange={() => {}}
      sitId="sit-1"
      sitTitle="Garde à Lyon"
      sitOwnerId="owner-1"
      onCancelled={onCancelled}
    />,
  );
  fireEvent.change(screen.getByPlaceholderText(/Expliquez la raison/), { target: { value: REASON } });
  fireEvent.click(screen.getByRole("button", { name: "Confirmer l'annulation" }));
  await waitFor(() => expect(onCancelled).toHaveBeenCalled());
  return onCancelled;
}

describe("X3a, B-02 : annulation de participation par le gardien", () => {
  beforeEach(() => {
    h.rpcCalls.length = 0;
    h.writes.length = 0;
    h.emails.length = 0;
    h.toastSuccess.mockClear();
    h.toastError.mockClear();
  });
  afterEach(() => cleanup());

  it("garde à venir : le serveur republie, l'écran le dit", async () => {
    const onCancelled = await cancelAsSitter("published");
    expect(h.rpcCalls.map((c) => c.fn)).toEqual(["create_avis_annulation", "get_public_sit"]);
    expect(h.rpcCalls[0].args).toMatchObject({ p_sit_id: "sit-1", p_reviewer_id: "sitter-1", p_reviewee_id: "owner-1", p_cancelled_by_role: "gardien" });
    expect(onCancelled).toHaveBeenCalledWith("republished");
    expect(h.toastSuccess).toHaveBeenCalledWith(
      "Votre participation est annulée. L'annonce est de nouveau ouverte aux autres gardiens et le propriétaire est prévenu.",
    );
  });

  it("garde commencée : annulée, sans promesse de republication", async () => {
    const onCancelled = await cancelAsSitter(null);
    expect(onCancelled).toHaveBeenCalledWith("cancelled");
    expect(h.toastSuccess).toHaveBeenCalledWith("Votre participation est annulée. Le propriétaire est prévenu.");
  });

  it("le navigateur du gardien n'écrit plus ni sits ni applications", async () => {
    await cancelAsSitter("published");
    expect(h.writes.filter((w) => w.table === "sits" || w.table === "applications")).toEqual([]);
    expect(h.writes.some((w) => w.table === "messages" && w.op === "insert")).toBe(false); // aucune conversation simulée
    expect(h.emails[0]).toMatchObject({ templateName: "cancellation-by-sitter", recipientUserId: "owner-1" });
  });

  it("issues et messages", () => {
    expect(cancelOutcomeFromStatus("published")).toBe("republished");
    expect(cancelOutcomeFromStatus("cancelled")).toBe("cancelled");
    expect(cancelOutcomeFromStatus(null)).toBe("cancelled");
    expect(cancelOutcomeMessage("proprio", "cancelled")).toBe("Garde annulée. Le gardien a été notifié.");
    const all = [cancelOutcomeMessage("gardien", "republished"), cancelOutcomeMessage("gardien", "cancelled")].join(" ");
    expect(all).not.toMatch(/[–—]/);
  });

  it("la fiche gardien suit l'issue réelle", () => {
    const src = read("src/components/sits/views/SitterSitView.tsx");
    expect(src).toContain('status: outcome === "republished" ? "published" : "cancelled"');
  });
});

describe("X3a, B-03 : candidat non retenu sur une garde confirmée", () => {
  afterEach(() => cleanup());

  it("seul le gardien retenu est « chosen »", () => {
    expect(sitterPresenceOnSit("confirmed", "accepted")).toBe("chosen");
    expect(sitterPresenceOnSit("in_progress", "accepted")).toBe("chosen");
    expect(sitterPresenceOnSit("completed", "accepted")).toBe("chosen");
    expect(sitterPresenceOnSit("confirmed", "rejected")).toBe("other_chosen");
    expect(sitterPresenceOnSit("in_progress", "cancelled")).toBe("other_chosen");
    expect(sitterPresenceOnSit("confirmed", null)).toBe("none");
    expect(sitterPresenceOnSit("published", "pending")).toBe("none");
  });

  it("bandeau « Le propriétaire a retenu un autre gardien », avec un rebond vers la recherche", () => {
    render(
      <MemoryRouter>
        <SitterStatusBanner status="confirmed" city="Lyon" otherSitterChosen />
      </MemoryRouter>,
    );
    expect(screen.getByText("Le propriétaire a retenu un autre gardien")).toBeTruthy();
    expect(screen.queryByText(/Préparez l'arrivée/)).toBeNull();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/search?ville=Lyon");
  });

  it("garde confirmée sans signal : aucun bandeau (comportement inchangé)", () => {
    const { container } = render(
      <MemoryRouter>
        <SitterStatusBanner status="confirmed" />
      </MemoryRouter>,
    );
    expect(container.textContent).toBe("");
  });

  it("check-list, accord et annulation réservés au gardien retenu", () => {
    const src = read("src/components/sits/views/SitterSitView.tsx");
    expect(src).toContain('const isChosenSitter = presence === "chosen";');
    expect(src).toContain('{isChosenSitter && (sit.status === "confirmed" || sit.status === "in_progress") && (');
    expect(src).toContain("{isChosenSitter && accordLoaded &&");
    expect(src).toMatch(/const canSitterCancel =\s+!isPast &&\s+isChosenSitter &&/);
    expect(src).toContain('otherSitterChosen={presence === "other_chosen"}');
    const page = read("src/pages/SitDetail.tsx");
    expect(page).toContain('.select("id, status")');
    expect(page).toContain("myApplicationStatus={myApplicationStatus}");
  });
});

describe("X3a, B-04 : une clôture système n'est pas un retrait", () => {
  it("libellés d'une candidature passée en cancelled", () => {
    expect(cancelledApplicationLabel("expired")).toBe("Annonce expirée");
    expect(cancelledApplicationLabel("archived")).toBe("Annonce close");
    expect(cancelledApplicationLabel("cancelled")).toBe("Annonce close");
    expect(cancelledApplicationLabel("published")).toBe("Retirée");
    expect(cancelledApplicationLabel("cancelled", true)).toBe("Participation annulée");
  });

  it("le gardien qui a annulé lit sa propre action", () => {
    expect(sitStateNote("cancelled")).toBe("Annonce annulée par le propriétaire");
    expect(sitStateNote("cancelled", { cancelledByMe: true })).toBe("Vous avez annulé votre participation");
  });

  it("/mes-candidatures choisit le libellé d'après l'annonce", () => {
    const src = read("src/pages/MesCandidatures.tsx");
    expect(src).toContain("cancelledApplicationLabel(app.sit_status, !!app.sit_cancelled_by_me)");
  });
});

describe("X3a, B-07 : proposition privée acceptée", () => {
  const apps = [
    { sit_id: "d1", sit_status: "draft", status: "pending" },
    { sit_id: "d2", sit_status: "draft", status: "cancelled" },
    { sit_id: "d3", sit_status: "draft", status: "pending" },
    { sit_id: "p1", sit_status: "published", status: "viewed" },
  ];

  it("un oui à une proposition reste dans les candidatures en cours", () => {
    const proposals = new Set(["d1", "d2"]);
    const { active, closed } = groupApplications(apps, { isProposal: (a) => proposals.has(a.sit_id) });
    expect(active.map((a) => a.sit_id)).toEqual(["d1", "p1"]);
    expect(closed.map((a) => a.sit_id)).toEqual(["d2", "d3"]);
  });

  it("note positive, sans « remise en brouillon »", () => {
    const note = sitStateNote("draft", { fromProposal: true, appStatus: "pending" });
    expect(note).toBe("Vous avez dit oui. Le propriétaire confirme la garde avec vous.");
    expect(note).not.toContain("brouillon");
    expect(sitStateNote("draft")).toBe("Annonce remise en brouillon par le propriétaire");
  });

  it("/mes-candidatures passe la proposition au regroupement et à la note", () => {
    const src = read("src/pages/MesCandidatures.tsx");
    expect(src).toContain("groupApplications(apps, { isProposal: (a) => !!proposalBySit[a.sit_id] })");
    expect(src).toContain("fromProposal: !!proposalBySit[app.sit_id]");
  });
});

describe("X3a, B-08 : retrait et ancienneté sur /mes-candidatures", () => {
  it("note d'attente, bouton Retirer, aucun email", () => {
    const src = read("src/pages/MesCandidatures.tsx");
    expect(src).toContain("sitterWaitingDays(app.status, app.sit_status, app.created_at)");
    expect(src).toContain("{sitterWaitingNote(waitingDays)}");
    expect(src).toContain('isOpenApplicationStatus(app.status) && app.sit_status === "published"');
    expect(src).toContain('.update({ status: "cancelled" as any })');
    expect(src).toContain('.eq("sitter_id", user.id)');
    expect(src).not.toMatch(/sendTransactionalEmail/);
  });
});
