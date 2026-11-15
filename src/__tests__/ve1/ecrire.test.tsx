// Lot VE-2 : « Écrire à Ludmila » ouvre un message prêt, envoyé par la
// messagerie Guardiens, et la ligne se ferme à l'envoi.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { rpcSpy, updateSpy, inSpy } = vi.hoisted(() => ({ rpcSpy: vi.fn(), updateSpy: vi.fn(), inSpy: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => {
  const conv = { select: () => conv, eq: () => conv, gte: () => conv, order: () => conv,
    limit: () => Promise.resolve({ data: [{ question: "je veux supprimer mon annonce" }, { question: "Ya pas !!" }], error: null }) };
  return {
    supabase: {
      rpc: (...a: unknown[]) => rpcSpy(...a),
      from: (t: string) => t === "alma_conversations"
        ? conv
        : { update: (v: unknown) => { updateSpy(t, v); return { in: (...a: unknown[]) => { inSpy(...a); return Promise.resolve({ error: null }); } }; } },
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "admin-1" } } }) },
      functions: { invoke: vi.fn() },
    },
  };
});
vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: () => ({ enabled: true, loading: false }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-1" }, logout: vi.fn() }) }));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));
vi.mock("@/lib/admin/readError", async (orig) => ({ ...(await orig<Record<string, unknown>>()), reportAdminReadError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

import { TodaySection } from "@/pages/admin/_components/dashboard/PilotageBlocks";

const alma = (id: string, type: string, severity: string) => ({
  id, signal_type: type, severity, entity_type: "profile", entity_id: "p1", detected_at: new Date(Date.now() - 86_400_000).toISOString(),
  metadata: { profile_id: "p1", first_name: "Ludmila", city: "Villentrois", role: "owner", page_path: "/owner-profile",
    messages: [{ text: "Ya pas !!", bug_item: "bouton suppression annonce" }] },
});
const RAW = {
  sources: { signals: true, sits: true, queues: true, relances: true, health: true },
  signals: [alma("s1", "alma_frustration", "critical"), alma("s2", "alma_bug_report", "warning")],
  sits: [], queues: [], relances_failed_7d: 0, health: [],
};

describe("VE-2 : écrire depuis la vue d'ensemble", () => {
  beforeEach(() => { rpcSpy.mockReset(); updateSpy.mockReset(); inSpy.mockReset(); });

  it("une ligne pour Ludmila, un message prêt, envoi par la messagerie, signaux fermés", async () => {
    rpcSpy.mockImplementation((name: string) => Promise.resolve(name === "admin_work_list" ? { data: RAW, error: null } : { data: "conv-1", error: null }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><MemoryRouter><TodaySection /></MemoryRouter></QueryClientProvider>);

    const button = await screen.findByRole("button", { name: "Écrire à Ludmila" });
    expect(screen.getAllByTestId("pilotage-line")).toHaveLength(1);
    expect(screen.getByTestId("pilotage-sentence").textContent).toBe("1 geste aujourd'hui.");
    fireEvent.click(button);

    const body = (await screen.findByLabelText("Votre message, prêt à relire")) as HTMLTextAreaElement;
    expect(body.value.startsWith("Bonjour Ludmila,")).toBe(true);
    expect(body.value).toContain("« Ya pas !! »");
    expect(screen.getByTestId("wtm-context").textContent).toContain("je veux supprimer mon annonce");
    expect(screen.getByRole("button", { name: "Messagerie Guardiens" }).getAttribute("aria-pressed")).toBe("true");
    // Messagerie : pas d'objet ni de lien à remplir.
    expect(screen.queryByLabelText("Objet")).toBeNull();

    const first = body.value;
    fireEvent.click(screen.getByTestId("wtm-next-version"));
    expect(body.value).not.toBe(first);
    expect(screen.getByTestId("wtm-next-version").textContent).toBe("Autre version (2 sur 3)");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(rpcSpy).toHaveBeenCalledWith("admin_send_message_to_user", { p_target_user_id: "p1", p_content: body.value.trim() }));
    await waitFor(() => expect(inSpy).toHaveBeenCalledWith("id", ["s1", "s2"]));
    expect(updateSpy.mock.calls[0][0]).toBe("admin_signals");
    expect((updateSpy.mock.calls[0][1] as { action_taken: string }).action_taken).toBe("member_written");
  });
});
