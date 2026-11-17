/**
 * Lot ANN-6 (17/11/2026) : fenêtre de diffusion d'une garde lointaine
 * (cas de Papeete, 06/11/2026). Le premier aperçu à 30 km ne cible personne,
 * la fenêtre passe seule en diffusion nationale, propose l'audience et des
 * textes, et envoie ce que l'administrateur a choisi.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const { calls } = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }));

const preview = (count: number, ownerFar: boolean) => ({
  count,
  excluded_recent: 0,
  author_first_name: "Virginie",
  owner_far: ownerFar,
  nationwide: count > 0,
  sit: { id: "s1", title: "Maison à Papeete", city: "Papeete", date_range: "du 20 décembre au 3 janvier", start_date: "2026-12-20", end_date: "2027-01-03" },
  subject: "Virginie cherche un gardien à Papeete",
  recipients: count ? [{ first_name: "Léa", city: "Lyon", distance_km: null, email: "lea@example.com" }] : [],
  truncated: false,
});

vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = new Proxy({}, {
    get: (_t, k: string) => (k === "then" ? (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(ok) : () => chain),
  });
  return {
    supabase: {
      from: () => chain,
      rpc: () => Promise.resolve({ data: [], error: null }),
      functions: {
        invoke: (_name: string, opts: { body: Record<string, unknown> }) => {
          calls.push(opts.body);
          const national = Number(opts.body.radius_km) >= 1000;
          const count = national ? (opts.body.audience === "all" ? 8 : 5) : 0;
          return Promise.resolve({ data: preview(count, true), error: null });
        },
      },
    },
  };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/components/admin/OwnerAbsenceBadge", () => ({ SitOwnerAbsenceNotice: () => null }));

import ListingProximityCard from "@/components/admin/ListingProximityCard";

beforeEach(() => { calls.length = 0; });

describe("ANN-6, fenêtre de diffusion d'une garde lointaine", () => {
  it("bascule seule en diffusion nationale, propose audience, objet et accroche, et les envoie", async () => {
    render(<ListingProximityCard sitId="s1" initialRadiusKm={30} autoPreview hideHeader />);

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0]).toMatchObject({ mode: "preview", radius_km: 30 });
    expect(calls[0].audience).toBeUndefined();
    expect(calls[1]).toMatchObject({ mode: "preview", radius_km: 1000, audience: "recent_90d" });

    expect(screen.getByTestId("scope-national").getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByTestId("audience-recent") as HTMLInputElement).checked).toBe(true);
    await waitFor(() => expect((screen.getByTestId("custom-subject") as HTMLInputElement).value).toBe("Et si votre Noël avait lieu à Papeete ?"));
    expect((screen.getByTestId("custom-hook") as HTMLTextAreaElement).value).toContain("Virginie cherche quelqu'un pour garder son logement à Papeete");
    expect(await screen.findByText(/5 gardiens ciblés/)).toBeTruthy();

    // Tous les gardiens : nouvel aperçu, plus de monde.
    fireEvent.click(screen.getByTestId("audience-all"));
    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[2]).toMatchObject({ radius_km: 1000, audience: "all", custom_subject: "Et si votre Noël avait lieu à Papeete ?" });
    expect(await screen.findByText(/8 gardiens ciblés/)).toBeTruthy();
  });

  it("une accroche de plus de 220 signes est refusée et bloque l'envoi", async () => {
    render(<ListingProximityCard sitId="s1" initialRadiusKm={30} autoPreview hideHeader />);
    await waitFor(() => expect(calls).toHaveLength(2));
    await screen.findByText(/5 gardiens ciblés/);
    fireEvent.change(screen.getByTestId("custom-hook"), { target: { value: "x".repeat(300) } });
    expect(screen.getAllByRole("alert").some((a) => (a.textContent ?? "").includes("220 caractères au plus"))).toBe(true);
    const send = screen.getByRole("button", { name: /Envoyer les 5 emails/ }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("custom-hook"), { target: { value: "Un mot court." } });
    await waitFor(() => expect((screen.getByRole("button", { name: /Envoyer les 5 emails/ }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("le choix explicite « Autour de l'annonce » n'est plus écrasé", async () => {
    render(<ListingProximityCard sitId="s1" initialRadiusKm={30} autoPreview hideHeader />);
    await waitFor(() => expect(calls).toHaveLength(2));
    fireEvent.click(screen.getByTestId("scope-radius"));
    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[2]).toMatchObject({ radius_km: 30 });
    expect(calls[2].audience).toBeUndefined();
    await new Promise((r) => setTimeout(r, 50));
    expect(calls).toHaveLength(3);
    expect(screen.getByTestId("scope-radius").getAttribute("aria-pressed")).toBe("true");
  });
});
