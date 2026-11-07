// Panneau « Relances des brouillons : effet mesuré » rendu avec une base simulée.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const now = Date.now();
const ago = (d: number) => new Date(now - d * 86400000).toISOString();
const SIT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const logs = [{ id: "l1", status: "sent", created_at: ago(10), delivered_at: ago(10), first_clicked_at: ago(9), bounced_at: null, metadata: { idempotency_key: `sit-draft-reminder-${SIT}`, sit_id: SIT } }];
const drafts = [{ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", user_id: "o1", status: "draft", created_at: ago(3), start_date: null, published_at: null, unpublished_at: null }];
let failLogs = false;

vi.mock("@/integrations/supabase/client", () => {
  const from = (table: string) => {
    const c: Record<string, any> = {};
    let range = false;
    for (const m of ["select", "eq", "order", "in", "not"]) c[m] = () => c;
    c.range = async () => {
      range = true;
      if (table === "email_send_log") return failLogs ? { data: null, error: new Error("offline") } : { data: logs, error: null };
      return { data: drafts, error: null };
    };
    c.then = (ok: (v: unknown) => unknown) => Promise.resolve(
      table === "sits" && !range ? { data: [{ id: SIT, title: "Chat à Lyon", status: "published", published_at: ago(8), user_id: "x" }], error: null }
        : { data: [{ id: "o1", last_seen_at: ago(1) }], error: null },
    ).then(ok);
    return c;
  };
  return { supabase: { from, rpc: async () => ({ data: [{ user_id: "o1", product_emails: true }], error: null }) } };
});

import DraftReminderConversionPanel from "@/components/admin/DraftReminderConversionPanel";

const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><DraftReminderConversionPanel /></QueryClientProvider>);
afterEach(() => { cleanup(); failLogs = false; });

describe("panneau de suivi des relances", () => {
  it("ouvert, il montre stock, envois et publication sous 7 jours, sans adresse", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Relances des brouillons/ }));
    expect(await screen.findByText("Admissibles à une relance")).toBeTruthy();
    const published = screen.getByText("Publiées sous 7 jours").parentElement!;
    expect(within(published).getByText("1 / 1")).toBeTruthy();
    expect(screen.getByText("100 %")).toBeTruthy();
    expect(screen.getByText(/pas une preuve/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/@/);
  });
  it("lecture en échec : message d'erreur, aucun chiffre", async () => {
    failLogs = true;
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Relances des brouillons/ }));
    expect(await screen.findByText(/lecture impossible, aucun chiffre affiché/)).toBeTruthy();
    expect(screen.queryByText("Admissibles à une relance")).toBeNull();
  });
});
