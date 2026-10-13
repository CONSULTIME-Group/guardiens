/**
 * Lot X2 : écran /admin/demandes-suppression.
 * Enregistrer une demande, exécuter une demande en attente avec son requestId,
 * et garder la trace quand l'exécution renvoie 409.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within, cleanup, configure } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

configure({ asyncUtilTimeout: 8000 });
vi.setConfig({ testTimeout: 20000 });

const PENDING_ROW = {
  id: "req-pending",
  user_id: "u-2",
  requester_email: "demandeur@example.fr",
  source: "admin",
  status: "pending",
  requested_at: "2026-10-05T09:00:00Z",
  scheduled_deletion_at: "2026-11-04T09:00:00Z",
  processed_at: null,
  processed_by: null,
  notes: "Message de contact du 05/10",
};
const DONE_ROW = {
  id: "req-done",
  user_id: null,
  requester_email: "ancien@example.fr",
  source: "self",
  status: "completed",
  requested_at: "2026-09-01T09:00:00Z",
  scheduled_deletion_at: "2026-09-01T09:00:00Z",
  processed_at: "2026-09-01T09:00:00Z",
  processed_by: null,
  notes: null,
};

let rows: Record<string, unknown>[] = [];
type Reply = { data: unknown; error: unknown };
let invokeHandler: (body: Record<string, unknown>) => Reply = () => ({ data: null, error: null });
const invoke = vi.fn(async (_name: string, opts: { body: Record<string, unknown> }) => invokeHandler(opts.body));

const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastWarning = vi.fn();
const refreshBadges = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
    warning: (m: string) => toastWarning(m),
  },
}));

vi.mock("@/hooks/useAdminBadges", () => ({ refreshAdminBadges: () => refreshBadges() }));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const result = () =>
      table === "account_deletion_requests" ? { data: rows, error: null } : { data: [], error: null };
    const p: any = new Proxy({}, {
      get(_t, prop: string) {
        if (prop === "then") return (res: any, rej: any) => Promise.resolve(result()).then(res, rej);
        if (prop === "maybeSingle" || prop === "single") return () => Promise.resolve({ data: null, error: null });
        return () => p;
      },
    });
    return p;
  };
  return {
    supabase: {
      from: (t: string) => chain(t),
      rpc: () => Promise.resolve({ data: null, error: null }),
      functions: { invoke: (name: string, opts: { body: Record<string, unknown> }) => invoke(name, opts) },
      auth: {
        getUser: () => Promise.resolve({ data: { user: null } }),
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    },
  };
});

import AdminDeletionRequests from "@/pages/admin/AdminDeletionRequests";

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminDeletionRequests />
    </MemoryRouter>,
  );

const lookupReply = (over: Record<string, unknown> = {}): Reply => ({
  data: {
    found: true,
    userId: "u-3",
    email: "camille@example.fr",
    firstName: "Camille",
    lastName: "Durand",
    confirmedSits: 0,
    pendingApplications: 0,
    blocked: false,
    pendingRequest: null,
    ...over,
  },
  error: null,
});

async function searchFor(address: string) {
  const input = await screen.findByLabelText("Adresse email du demandeur");
  fireEvent.change(input, { target: { value: address } });
  fireEvent.click(screen.getByRole("button", { name: "Rechercher le compte" }));
}

beforeEach(() => {
  rows = [PENDING_ROW, DONE_ROW];
  invoke.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
  toastWarning.mockClear();
  refreshBadges.mockClear();
});

afterEach(() => cleanup());

describe("AdminDeletionRequests (lot X2)", () => {
  it("affiche une demande en attente avec son échéance et l'exécute avec son requestId", async () => {
    invokeHandler = (body) =>
      body.action === "execute"
        ? { data: { success: true, accountFound: true, acknowledged: true, suppressed: true, storageFailures: [] }, error: null }
        : { data: null, error: null };
    renderPage();

    const btn = await screen.findByRole("button", { name: "Exécuter la demande de demandeur@example.fr" });
    expect(screen.getByText("En attente")).toBeTruthy();
    expect(screen.getByText("À traiter avant")).toBeTruthy();
    // Une demande traitée ne propose aucune exécution.
    expect(screen.queryByRole("button", { name: "Exécuter la demande de ancien@example.fr" })).toBeNull();

    fireEvent.click(btn);
    const dlg = await screen.findByRole("alertdialog");
    expect(within(dlg).getByText(/demandeur@example\.fr/)).toBeTruthy();
    fireEvent.click(within(dlg).getByRole("button", { name: "Exécuter l'effacement" }));

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [name, opts] = invoke.mock.calls[0];
    expect(name).toBe("admin-delete-account");
    expect(opts.body).toMatchObject({ action: "execute", email: "demandeur@example.fr", requestId: "req-pending" });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(refreshBadges).toHaveBeenCalled();
  });

  it("compte bloqué : « Enregistrer la demande » crée une demande pending", async () => {
    invokeHandler = (body) => {
      if (body.action === "lookup") return lookupReply({ blocked: true, confirmedSits: 1 });
      if (body.action === "record") {
        return {
          data: {
            success: true,
            recorded: true,
            requestId: "req-new",
            created: true,
            status: "pending",
            requestedAt: "2026-10-13T08:00:00Z",
            scheduledDeletionAt: "2026-11-12T08:00:00Z",
          },
          error: null,
        };
      }
      return { data: null, error: null };
    };
    renderPage();
    await searchFor("camille@example.fr");

    await screen.findByText(/Engagements actifs détectés/);
    const execute = screen.getByRole("button", { name: "Exécuter l'effacement" }) as HTMLButtonElement;
    expect(execute.disabled).toBe(true);
    const record = screen.getByRole("button", { name: "Enregistrer la demande" }) as HTMLButtonElement;
    expect(record.disabled).toBe(false);

    fireEvent.change(screen.getByPlaceholderText(/Notes de conformité/), { target: { value: "Email du 05/10" } });
    fireEvent.click(record);

    await waitFor(() => expect(invoke.mock.calls.some(([, o]) => o.body.action === "record")).toBe(true));
    const recordCall = invoke.mock.calls.find(([, o]) => o.body.action === "record")!;
    expect(recordCall[0]).toBe("admin-delete-account");
    expect(recordCall[1].body).toMatchObject({ action: "record", email: "camille@example.fr", notes: "Email du 05/10" });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/Demande enregistrée/)));
    expect(await screen.findByTestId("pending-request")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Enregistrer la demande" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("un 409 à l'exécution annonce la demande gardée en attente", async () => {
    invokeHandler = (body) => {
      if (body.action === "lookup") return lookupReply();
      if (body.action === "execute") {
        return {
          data: null,
          error: {
            message: "Edge Function returned a non-2xx status code",
            context: {
              status: 409,
              json: async () => ({
                error: "Engagements actifs détectés. La demande est enregistrée en attente.",
                recorded: true,
                requestId: "req-auto",
              }),
            },
          },
        };
      }
      return { data: null, error: null };
    };
    renderPage();
    await searchFor("camille@example.fr");

    const execute = await screen.findByRole("button", { name: "Exécuter l'effacement" });
    fireEvent.click(execute);
    const dlg = await screen.findByRole("alertdialog");
    fireEvent.click(within(dlg).getByRole("button", { name: "Exécuter l'effacement" }));

    await waitFor(() => expect(toastWarning).toHaveBeenCalledWith(expect.stringMatching(/enregistrée en attente/)));
    expect(toastError).not.toHaveBeenCalled();
    const execCall = invoke.mock.calls.find(([, o]) => o.body.action === "execute")!;
    expect(execCall[1].body).not.toHaveProperty("requestId");
    expect(refreshBadges).toHaveBeenCalled();
  });
});
