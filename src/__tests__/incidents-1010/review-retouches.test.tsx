import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { computeNextAction } from "../../../supabase/functions/_shared/alma-next-action";
import { isTransientError } from "../../../supabase/functions/send-mass-email/lineTokens";
import EmailClickRedirect from "@/pages/EmailClickRedirect";

vi.mock("@/integrations/supabase/client", () => {
  const fail = { data: null, error: { message: "boom" } };
  const chain: any = new Proxy({}, { get: (_t, k) => (k === "then" ? (r: any) => r(fail) : () => chain) });
  return { supabase: { from: () => chain, rpc: async () => fail } };
});
vi.mock("@/lib/admin/readError", () => ({ reportAdminReadError: () => {}, UNAVAILABLE_LABEL: "Indisponible" }));

describe("ConversationsTab en échec de lecture", () => {
  it("aucun faux zéro ni constat d'absence", async () => {
    const { ConversationsTab } = await import("@/pages/admin/_components/alma/ConversationsTab");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><ConversationsTab since="2026-10-01T00:00:00Z" /></QueryClientProvider>);
    await waitFor(() => expect(screen.getAllByText("Indisponible").length).toBeGreaterThan(1));
    expect(screen.queryByText(/trouvé/)).toBeNull();
    expect(screen.queryByText(/Aucune réponse de la période/)).toBeNull();
    expect(screen.queryByText(/Non mesurable/)).toBeNull();
    expect(screen.queryByText(/Aucun échange sur la période/)).toBeNull();
    expect(screen.getAllByRole("button", { name: "Réessayer" }).length).toBe(2);
  });
});

describe("Alma, changement d'espace", () => {
  const base = { facts: {} as any, inventory: {} as any, accountRole: "both" as const, register: "dossier" as const, completion: null };
  const go = (question: string, activeRole: "owner" | "sitter") => computeNextAction({ ...base, question, activeRole }).action?.path;
  it("destination propriétaire explicite depuis l'espace propriétaire", () =>
    expect(go("Je veux passer en espace propriétaire", "owner")).toBe("/dashboard?espace=proprietaire"));
  it("destination gardien explicite depuis l'espace gardien", () =>
    expect(go("Comment basculer côté gardien ?", "sitter")).toBe("/dashboard?espace=gardien"));
  it("inversion sans cible : l'autre espace", () => {
    expect(go("comment inverser mon compte", "owner")).toBe("/dashboard?espace=gardien");
    expect(go("comment inverser mon compte", "sitter")).toBe("/dashboard?espace=proprietaire");
  });
});

describe("lineTokens, permanence avant statut", () => {
  it("500 avec permission refusée ne retente pas", () => {
    expect(isTransientError({ status: 500, code: "42501", message: "permission denied" })).toBe(false);
    expect(isTransientError({ status: 503, message: "upstream" })).toBe(true);
  });
});

describe("/go, protocole", () => {
  it.each(["javascript://guardiens.fr/%0aalert(1)", "ftp://guardiens.fr/x"])("%s renvoie vers l'accueil", (raw) => {
    const replace = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, replace }, writable: true });
    const u = btoa(raw);
    render(<MemoryRouter initialEntries={[`/go?u=${encodeURIComponent(u)}`]}><Routes><Route path="/go" element={<EmailClickRedirect />} /></Routes></MemoryRouter>);
    expect(replace).toHaveBeenCalledWith("https://guardiens.fr");
  });
});
