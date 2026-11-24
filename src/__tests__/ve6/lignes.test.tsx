// Lot VE-6 (24/11/2026) : la vue d'ensemble rendue. Recette 4, 6, 7 et 8 du
// prompt claude/prompt-ve6-vue-ensemble-gestes-faisables-24-novembre-2026.md.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { rpcSpy, updateSpy, inSpy, invokeSpy, sitsSpy, state } = vi.hoisted(() => ({
  rpcSpy: vi.fn(), updateSpy: vi.fn(), inSpy: vi.fn(), invokeSpy: vi.fn(), sitsSpy: vi.fn(),
  state: { lastSeen: {} as Record<string, string | null>, sitsError: false },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpcSpy(...a),
    from: (t: string) => {
      if (t === "sits") {
        const single = { eq: () => single, maybeSingle: () => Promise.resolve({ data: null, error: null }) };
        return {
          select: () => ({
            ...single,
            in: (_col: string, ids: string[]) => {
              sitsSpy(ids);
              return Promise.resolve(state.sitsError
                ? { data: null, error: { message: "boom" } }
                : { data: ids.map((id) => ({ id, owner: { last_seen_at: state.lastSeen[id] ?? null } })), error: null });
            },
          }),
        };
      }
      return { update: (v: unknown) => { updateSpy(t, v); return { in: (...a: unknown[]) => { inSpy(...a); const done = Promise.resolve({ error: null }); return Object.assign(done, { is: () => done, eq: () => done }); } }; } };
    },
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "admin-1" } } }) },
    functions: { invoke: (...a: unknown[]) => invokeSpy(...a) },
  },
}));
vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: () => ({ enabled: true, loading: false }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-1" }, logout: vi.fn() }) }));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));
vi.mock("@/lib/admin/readError", async (orig) => ({ ...(await orig<Record<string, unknown>>()), reportAdminReadError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

import { TodaySection } from "@/pages/admin/_components/dashboard/PilotageBlocks";
import { BroadcastSitDialog } from "@/components/admin/signals/BroadcastSitDialog";
import type { AdminSignal } from "@/components/admin/signals/NoApplicationsCard";

const DAY = 86_400_000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
const ago = (n: number) => new Date(Date.now() - n * DAY).toISOString();

const unconfirmed = {
  id: "u1", signal_type: "owner_sit_unconfirmed", severity: "critical", entity_type: "sit", entity_id: "aiko", detected_at: ago(1),
  metadata: { sit_title: "Aïko", owner_id: "o-aiko", owner_first_name: "Eliane", start_date: inDays(4) },
};
const stalled = {
  id: "d1", signal_type: "stalled_discussion", severity: "warning", entity_type: "sit", entity_id: "aiko", detected_at: ago(2),
  metadata: { sit_title: "Aïko", owner_id: "o-aiko" },
};
const noApp = {
  id: "n1", signal_type: "no_applications", severity: "warning", entity_type: "sit", entity_id: "longvic", detected_at: ago(3),
  metadata: { sit_title: "Garde à Longvic", sit_city: "Longvic", days_since_published: 12, eligible_sitters_count: 6, eligible_radius_km: 30, owner_id: "o-longvic", start_date: inDays(8) },
};
const raw = (signals: unknown[]) => ({
  sources: { signals: true, sits: true, queues: true, relances: true, health: true },
  signals,
  sits: [
    { id: "aiko", start_date: inDays(4), title: "Aïko", city: "Licq Atherey" },
    { id: "longvic", start_date: inDays(8), title: "Garde à Longvic", city: "Longvic" },
  ],
  queues: [{ key: "errorsOld", count: 1, oldest: ago(2) }], relances_failed_7d: 0, health: [],
});

const PREVIEW = { count: 0, excluded_recent: 4, recipients: [], truncated: false };
const mount = (signals: unknown[]) => {
  rpcSpy.mockImplementation((name: string) => Promise.resolve(name === "admin_work_list" ? { data: raw(signals), error: null } : { data: null, error: null }));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><TodaySection /></MemoryRouter></QueryClientProvider>);
};
const lineOf = (text: string) => screen.getAllByTestId("pilotage-line").find((l) => l.textContent?.includes(text))!;

beforeEach(() => {
  rpcSpy.mockReset(); updateSpy.mockReset(); inSpy.mockReset(); invokeSpy.mockReset(); sitsSpy.mockReset();
  state.lastSeen = {}; state.sitsError = false;
  invokeSpy.mockResolvedValue({ data: PREVIEW, error: null });
});

describe("VE-6 B : écrire au propriétaire depuis la ligne", () => {
  it("recette 4 : une ligne pour l'annonce, « Écrire à Eliane » ouvre le message prêt, annuler n'envoie rien", async () => {
    mount([unconfirmed, stalled]);
    const button = await screen.findByRole("button", { name: "Écrire à Eliane" });
    const line = lineOf("Aider le propriétaire à confirmer son gardien");
    expect(screen.getAllByTestId("pilotage-line").filter((l) => l.textContent?.includes("Aïko"))).toHaveLength(1);
    expect(line.textContent).toContain("Aussi : 1 discussion à l'arrêt.");
    expect(within(line).getByRole("button", { name: "Autres gestes" })).toBeTruthy();

    fireEvent.click(button);
    const subject = (await screen.findByLabelText("Objet")) as HTMLInputElement;
    expect(subject.value).toBe("Où en est votre garde à Licq Atherey ?");
    expect(screen.getByRole("dialog").textContent).toContain("Bonjour Eliane,");

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    await waitFor(() => expect(screen.queryByLabelText("Objet")).toBeNull());
    // Rien n'est parti : ni message, ni email (admin-personal-message écrit email_send_log), ni signal fermé.
    expect(invokeSpy).not.toHaveBeenCalled();
    expect(rpcSpy.mock.calls.filter((c) => c[0] !== "admin_work_list")).toEqual([]);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("à l'envoi, tous les signaux de la ligne se ferment en « owner_written »", async () => {
    invokeSpy.mockImplementation((_fn: string, opts: { body: { mode: string } }) =>
      Promise.resolve({ data: opts.body.mode === "preview" ? { html: "<p>Bonjour Eliane,</p>" } : { sent: true }, error: null }));
    mount([unconfirmed, stalled]);
    fireEvent.click(await screen.findByRole("button", { name: "Écrire à Eliane" }));
    await screen.findByLabelText("Objet");
    fireEvent.click(screen.getByRole("button", { name: "Aperçu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(inSpy).toHaveBeenCalledWith("id", ["u1", "d1"]));
    expect(invokeSpy.mock.calls.map((c) => [c[0], (c[1] as { body: { mode: string; recipientUserId: string; sitId: string } }).body.mode])).toEqual([
      ["admin-personal-message", "preview"], ["admin-personal-message", "send"],
    ]);
    expect((invokeSpy.mock.calls[1][1] as { body: { recipientUserId: string; sitId: string } }).body).toMatchObject({ recipientUserId: "o-aiko", sitId: "aiko" });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0][0]).toBe("admin_signals");
    expect((updateSpy.mock.calls[0][1] as { action_taken: string }).action_taken).toBe("owner_written");
  });

  it("« Autres gestes » déplie la carte de l'annonce avec tous ses signaux", async () => {
    mount([unconfirmed, stalled]);
    const line = lineOf((await screen.findByRole("button", { name: "Écrire à Eliane" })) && "Aider le propriétaire");
    fireEvent.click(within(line).getByRole("button", { name: "Autres gestes" }));
    const card = within(line).getByTestId("sit-signal-group");
    expect(card.textContent).toContain("1 discussion à l'arrêt, garde à confirmer");
    expect(within(line).getAllByTestId("sit-signal-group")).toHaveLength(1);
  });
});

describe("VE-6 C : « Marquer comme traité » sur la ligne", () => {
  it("recette 6 : chaque ligne à signaux le porte sans dépliage, les files restent telles quelles", async () => {
    mount([unconfirmed, stalled, noApp]);
    await screen.findByRole("button", { name: "Écrire à Eliane" });
    const lines = screen.getAllByTestId("pilotage-line");
    const withSignals = lines.filter((l) => l.getAttribute("data-kind") !== "link");
    const queues = lines.filter((l) => l.getAttribute("data-kind") === "link");
    expect(withSignals).toHaveLength(2);
    expect(queues).toHaveLength(1);
    for (const l of withSignals) expect(within(l).getByRole("button", { name: "Marquer comme traité" })).toBeTruthy();
    for (const l of queues) expect(within(l).queryByRole("button", { name: "Marquer comme traité" })).toBeNull();
    expect(screen.queryByText("Classer sans agir")).toBeNull();
    expect(screen.getByTestId("pilotage-count").textContent).toBe("3 choses à faire");
  });

  it("le clic ferme tous les signaux de la ligne après confirmation", async () => {
    mount([unconfirmed, stalled]);
    await screen.findByRole("button", { name: "Écrire à Eliane" });
    fireEvent.click(within(lineOf("Aider le propriétaire")).getByRole("button", { name: "Marquer comme traité" }));
    expect(updateSpy).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    // Lot VE-7 : la fenêtre parle de la ligne, avec le même mot que le lien.
    expect(dialog.textContent).toContain("Marquer cette ligne comme traitée ?");
    expect(dialog.textContent).toContain("Ses 2 signaux sortent de la liste");
    expect(dialog.textContent).not.toContain("Ignorer");
    fireEvent.click(within(dialog).getByRole("button", { name: "Marquer comme traité" }));
    await waitFor(() => expect(inSpy).toHaveBeenCalledWith("id", ["u1", "d1"]));
    expect((updateSpy.mock.calls[0][1] as { action_taken: string }).action_taken).toBe("dismissed");
  });
});

describe("VE-6 D : diffuser seulement quand le propriétaire est là", () => {
  it("recette 7 : absent depuis 20 jours, bouton « Écrire au propriétaire » et lien « Diffuser l'annonce »", async () => {
    state.lastSeen = { longvic: ago(20) };
    mount([noApp]);
    const line = await waitFor(() => {
      const l = lineOf("aucune candidature");
      expect(l.textContent).toContain("Propriétaire absent depuis 20 jours.");
      return l;
    });
    expect(sitsSpy).toHaveBeenCalledTimes(1);
    expect(sitsSpy).toHaveBeenCalledWith(["longvic"]);
    expect(line.textContent).toContain("6 gardiens à proximité, déjà prévenus compris.");
    const write = within(line).getAllByRole("button", { name: "Écrire au propriétaire" });
    expect(write).toHaveLength(1);
    expect(write[0].className).toContain("rounded-full");
    const link = within(line).getByTestId("pilotage-broadcast-link");
    expect(link.textContent).toBe("Diffuser l'annonce");

    // Le lien ouvre la même fenêtre de diffusion.
    fireEvent.click(link);
    expect((await screen.findByRole("dialog")).textContent).toContain("Diffuser l'annonce aux gardiens du coin");
  });

  it("recette 7 : vu il y a 5 jours ou sans date, le bouton reste « Diffuser l'annonce »", async () => {
    for (const lastSeen of [{ longvic: ago(5) }, {}]) {
      state.lastSeen = lastSeen;
      const view = mount([noApp]);
      await waitFor(() => expect(sitsSpy).toHaveBeenCalled());
      const line = await waitFor(() => lineOf("aucune candidature"));
      expect(within(line).getByRole("button", { name: "Diffuser l'annonce" }).className).toContain("rounded-full");
      expect(within(line).queryByTestId("pilotage-broadcast-link")).toBeNull();
      expect(line.textContent).not.toContain("absent");
      view.unmount(); sitsSpy.mockReset();
    }
  });

  it("lecture de la dernière visite en échec : comportement d'avant", async () => {
    state.sitsError = true;
    mount([noApp]);
    await waitFor(() => expect(sitsSpy).toHaveBeenCalled());
    const line = lineOf("aucune candidature");
    expect(within(line).getByRole("button", { name: "Diffuser l'annonce" })).toBeTruthy();
    expect(within(line).getByRole("button", { name: "Écrire au propriétaire" }).className).not.toContain("rounded-full");
  });
});

describe("VE-6 D4 : l'aperçu de la fenêtre de diffusion part seul", () => {
  const signal = noApp as unknown as AdminSignal;
  const previews = () => invokeSpy.mock.calls.filter((c) => (c[1] as { body?: { mode?: string } })?.body?.mode === "preview");
  const wrap = (open: boolean) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BroadcastSitDialog open={open} onOpenChange={() => {}} signal={signal} onSent={() => {}} />
    </QueryClientProvider>
  );

  it("recette 8 : à l'ouverture, un seul appel en mode preview, sans clic", async () => {
    render(wrap(true));
    await waitFor(() => expect(previews()).toHaveLength(1));
    expect(invokeSpy.mock.calls[0][0]).toBe("send-listing-proximity");
    expect((invokeSpy.mock.calls[0][1] as { body: Record<string, unknown> }).body).toMatchObject({ mode: "preview", sit_id: "longvic", radius_km: 30, signal_id: null });
    await screen.findByTestId("proximity-empty");
    expect(previews()).toHaveLength(1);
    expect(invokeSpy.mock.calls.every((c) => (c[1] as { body: { mode: string } }).body.mode === "preview")).toBe(true);
  });

  it("« Prévisualiser » relance, une fenêtre fermée ne lit rien, une réouverture relit une fois", async () => {
    const view = render(wrap(false));
    expect(invokeSpy).not.toHaveBeenCalled();
    view.rerender(wrap(true));
    await waitFor(() => expect(previews()).toHaveLength(1));
    await screen.findByTestId("proximity-empty");
    fireEvent.click(screen.getByRole("button", { name: /Prévisualiser/ }));
    await waitFor(() => expect(previews()).toHaveLength(2));
    view.rerender(wrap(false));
    view.rerender(wrap(true));
    await waitFor(() => expect(previews()).toHaveLength(3));
  });
});
