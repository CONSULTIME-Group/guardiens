/**
 * Lot J2c : le dialogue de suspension demande règle, faits, durée et mode,
 * envoie le bon email selon le mode et verrouille le bouton pendant l'appel.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const calls: Array<{ kind: string; table?: string; payload?: any; body?: any }> = [];
let releaseInvoke: (() => void) | null = null;

vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string): any => {
    const p: any = new Proxy({}, {
      get(_t, prop: string) {
        if (prop === "then") return (res: any) => Promise.resolve({ data: [], error: null }).then(res);
        if (prop === "update") return (payload: any) => { calls.push({ kind: "update", table, payload }); return { eq: () => Promise.resolve({ error: null }) }; };
        if (prop === "upsert" || prop === "insert") return (payload: any) => { calls.push({ kind: prop, table, payload }); return Promise.resolve({ error: null }); };
        return () => p;
      },
    });
    return p;
  };
  return {
    supabase: {
      from: (t: string) => chain(t),
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "admin-1" } } }) },
      functions: {
        invoke: (_name: string, { body }: { body: any }) => {
          calls.push({ kind: "invoke", body });
          return new Promise((resolve) => { releaseInvoke = () => resolve({ data: { success: true }, error: null }); });
        },
      },
    },
  };
});

import { AccountMeasureDialog } from "@/components/admin/moderation/AccountMeasureDialog";

const target = { userId: "11111111-2222-3333-4444-555555555555", userName: "Camille Durand", firstName: "Camille" };

function fill(ruleId: string) {
  fireEvent.change(screen.getByLabelText("Règle appliquée"), { target: { value: ruleId } });
  fireEvent.change(screen.getByLabelText("Faits retenus, en une phrase"), { target: { value: "Une somme a été demandée pour une garde." } });
}

beforeEach(() => { calls.length = 0; releaseInvoke = null; });

describe("J2c, dialogue de suspension", () => {
  it("« Prévenir et demander ses observations » : avertissement, compte inchangé, bouton verrouillé", async () => {
    render(<AccountMeasureDialog target={target} measure="suspend" onClose={() => {}} />);
    expect(screen.getByText("Suspendre le compte")).toBeTruthy();
    fill("cgu-10-commercial");
    fireEvent.change(screen.getByLabelText("Délai en jours"), { target: { value: "10" } });
    const btn = screen.getByRole("button", { name: "Envoyer l'avertissement" });
    fireEvent.click(btn);
    await waitFor(() => expect(calls.some((c) => c.kind === "invoke")).toBe(true));
    expect(screen.getByRole("button", { name: "En cours…" }).hasAttribute("disabled")).toBe(true);
    releaseInvoke?.();
    const inv = calls.find((c) => c.kind === "invoke")!;
    expect(inv.body.templateName).toBe("moderation-decision");
    expect(inv.body.templateData).toMatchObject({ kind: "notice", observationDays: 10, origin: "initiative", automated: "none" });
    expect(calls.find((c) => c.kind === "update")).toBeUndefined();
    await waitFor(() => expect(calls.some((c) => c.table === "admin_action_logs")).toBe(true));
  });

  it("« Effet immédiat » réservé aux cas de l'article 11.4, suspension puis décision", async () => {
    render(<AccountMeasureDialog target={target} measure="suspend" automated="detection" onClose={() => {}} />);
    fill("cgu-10-commercial");
    const immediate = screen.getByLabelText(/Effet immédiat \(cas de l'article 11\.4\)/) as HTMLInputElement;
    expect(immediate.disabled).toBe(true);
    fill("cgu-11-4-remuneration");
    expect(immediate.disabled).toBe(false);
    fireEvent.click(immediate);
    fireEvent.change(screen.getByLabelText("Durée de la suspension"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Suspendre et notifier" }));
    await waitFor(() => expect(calls.some((c) => c.kind === "invoke")).toBe(true));
    releaseInvoke?.();
    const upd = calls.find((c) => c.kind === "update" && c.table === "profiles")!;
    expect(upd.payload.account_status).toBe("suspended");
    const inv = calls.find((c) => c.kind === "invoke")!;
    expect(inv.body.templateData).toMatchObject({ kind: "decision", action: "suspend", durationDays: 30, conservatory: true, automated: "detection" });
    expect(calls.findIndex((c) => c.kind === "update")).toBeLessThan(calls.findIndex((c) => c.kind === "invoke"));
  });

  it("« Décider après le délai d'observations » attend un avertissement enregistré", () => {
    render(<AccountMeasureDialog target={target} measure="terminate" onClose={() => {}} />);
    expect(screen.getByText("Résilier le compte")).toBeTruthy();
    expect((screen.getByLabelText(/Décider après le délai d'observations/) as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByLabelText("Durée de la suspension")).toBeNull();
  });
});
