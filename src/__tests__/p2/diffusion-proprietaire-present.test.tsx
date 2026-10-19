/**
 * Lot P2 (arène du 19/10/2026) : diffusion de proximité plafonnée, confirmée
 * au-delà de 200 km, et propriétaire absent signalé au-delà de 14 jours.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent, waitFor, configure } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

configure({ asyncUtilTimeout: 8000 });
vi.setConfig({ testTimeout: 20000 });

const { invokeSpy, lastSeen } = vi.hoisted(() => ({
  invokeSpy: vi.fn(),
  lastSeen: { value: null as string | null },
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: { user_id: "owner-1", owner: { last_seen_at: lastSeen.value } }, error: null }),
  };
  return {
    supabase: {
      from: () => chain,
      functions: { invoke: (...a: unknown[]) => invokeSpy(...a) },
    },
  };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { BroadcastSitDialog } from "@/components/admin/signals/BroadcastSitDialog";
import ListingProximityCard from "@/components/admin/ListingProximityCard";
import { OwnerAbsenceBadge } from "@/components/admin/OwnerAbsenceBadge";
import { ownerAbsentDays } from "@/lib/admin/ownerAbsence";
import {
  MAX_RADIUS_KM,
  clampRadiusInput,
  needsRadiusConfirmation,
  radiusConfirmationTitle,
} from "@/lib/proximityRadius";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-19T10:00:00Z");

const preview = {
  count: 3,
  author_first_name: "Claire",
  sit: { id: "sit-1", title: "Garde de deux chats", city: "Lyon" },
  recipients: [
    { first_name: "A", city: "Lyon", distance_km: 4, email: "a@example.org" },
    { first_name: "B", city: "Lyon", distance_km: 8, email: "b@example.org" },
    { first_name: "C", city: "Lyon", distance_km: 12, email: "c@example.org" },
  ],
  truncated: false,
};

const wrap = (node: ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
};

const signal = (radius: number) => ({
  id: "sig-1",
  signal_type: "no_applications",
  severity: "warning" as const,
  entity_type: "sit",
  entity_id: "sit-1",
  detected_at: "2026-10-17T10:00:00Z",
  metadata: { sit_title: "Garde de deux chats", eligible_radius_km: radius },
});

const sendCalls = () =>
  invokeSpy.mock.calls.filter((c) => (c[1] as { body?: { mode?: string } })?.body?.mode === "send");

beforeEach(() => {
  invokeSpy.mockReset();
  invokeSpy.mockImplementation(async (_fn: string, opts: { body: { mode: string } }) =>
    opts.body.mode === "preview" ? { data: preview, error: null } : { data: { queued: 3 }, error: null },
  );
  lastSeen.value = null;
});

describe("rayon plafonné et confirmé au-delà de 200 km", () => {
  it("plafonne la saisie au seuil national et confirme au-delà de 200 km", () => {
    expect(MAX_RADIUS_KM).toBe(1000);
    expect(clampRadiusInput(20000)).toBe(1000);
    expect(clampRadiusInput(150)).toBe(150);
    expect(needsRadiusConfirmation(200)).toBe(false);
    expect(needsRadiusConfirmation(201)).toBe(true);
    expect(radiusConfirmationTitle(250)).toBe("Diffuser à 250 km ?");
  });

  it("BroadcastSitDialog demande « Diffuser à 250 km ? » avant tout envoi", async () => {
    wrap(<BroadcastSitDialog open onOpenChange={() => {}} signal={signal(250)} onSent={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Prévisualiser/ }));
    const send = await screen.findByRole("button", { name: /Envoyer les 3 emails/ });
    fireEvent.click(send);
    expect(await screen.findByText("Diffuser à 250 km ?")).toBeInTheDocument();
    expect(sendCalls()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Diffuser à 250 km" }));
    await waitFor(() => expect(sendCalls()).toHaveLength(1));
    expect((sendCalls()[0][1] as { body: { radius_km: number } }).body.radius_km).toBe(250);
  });

  it("BroadcastSitDialog envoie sans confirmation de rayon à 150 km", async () => {
    wrap(<BroadcastSitDialog open onOpenChange={() => {}} signal={signal(150)} onSent={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Prévisualiser/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Envoyer les 3 emails/ }));
    await waitFor(() => expect(sendCalls()).toHaveLength(1));
    expect(screen.queryByText(/Diffuser à 150 km/)).not.toBeInTheDocument();
  });

  it("ListingProximityCard exige la case de rayon au-delà de 200 km", async () => {
    wrap(<ListingProximityCard sitId="sit-1" initialRadiusKm={300} autoPreview hideHeader />);
    fireEvent.click(await screen.findByRole("button", { name: /Envoyer les 3 emails/ }));
    expect(await screen.findByText("Diffuser à 300 km ?")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("3"), { target: { value: "3" } });
    const action = screen.getByRole("button", { name: /Envoyer maintenant/ });
    expect(action).toBeDisabled();
    fireEvent.click(screen.getByTestId("radius-confirm-checkbox"));
    expect(action).not.toBeDisabled();
    fireEvent.click(action);
    await waitFor(() => expect(sendCalls()).toHaveLength(1));
  });
});

describe("propriétaire absent depuis plus de 14 jours", () => {
  it("affiche le badge à 15 jours et pas à 13", () => {
    const at15 = new Date(NOW - 15 * DAY).toISOString();
    const at13 = new Date(NOW - 13 * DAY).toISOString();
    expect(ownerAbsentDays(at15, NOW)).toBe(15);
    expect(ownerAbsentDays(at13, NOW)).toBeNull();
    expect(ownerAbsentDays(null, NOW)).toBeNull();

    const { unmount } = render(<OwnerAbsenceBadge lastSeenAt={at15} now={NOW} />);
    expect(screen.getByTestId("owner-absence-badge")).toHaveTextContent("Propriétaire absent depuis 15 jours");
    unmount();
    render(<OwnerAbsenceBadge lastSeenAt={at13} now={NOW} />);
    expect(screen.queryByTestId("owner-absence-badge")).not.toBeInTheDocument();
  });

  it("la carte de diffusion signale l'absence du propriétaire", async () => {
    lastSeen.value = new Date(Date.now() - 20 * DAY).toISOString();
    wrap(<ListingProximityCard sitId="sit-1" hideHeader />);
    expect(await screen.findByTestId("owner-absence-notice")).toHaveTextContent("Propriétaire absent depuis 20 jours");
  });

  it("la ligne /admin/listings lit last_seen_at et affiche le badge", () => {
    const src = readFileSync("src/pages/admin/AdminListings.tsx", "utf8");
    expect(src).toContain("owner:profiles!sits_user_id_fkey(first_name, last_name, city, avatar_url, last_seen_at)");
    expect(src).toContain("<OwnerAbsenceBadge lastSeenAt={listing.owner?.last_seen_at}");
  });
});
