/**
 * Régression production (16/08/2026) : /admin plantait avec React error #31
 * « Objects are not valid as a React child » (objet aux clés analysis,
 * actions, generated_at, snapshot, snapshot_at).
 *
 * Cause : l'edge function admin-activity-analysis renvoie une enveloppe
 * `{ analysis: { analysis, actions, generated_at, snapshot, snapshot_at } }`
 * dans les deux modes (latest et refresh). Le hook useActivityAnalysis
 * stockait l'enveloppe entière au lieu de la charge utile, et
 * ActivityAnalysisCard rendait `{analysis.analysis}`, c'est-à-dire l'objet
 * interne, comme enfant React.
 *
 * Ces tests verrouillent :
 *   1. le déballage de l'enveloppe côté hook (modes latest et refresh) ;
 *   2. le repli à null quand la fonction n'a aucune analyse stockée ;
 *   3. la garde défensive de la carte : une charge malformée ne doit JAMAIS
 *      planter le rendu, elle affiche l'état vide ;
 *   4. le rendu nominal du texte et de l'horodatage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
  },
}));

import { useActivityAnalysis } from "@/pages/admin/_components/dashboard/useActivityAnalysis";
import { ActivityAnalysisCard } from "@/pages/admin/_components/dashboard/ActivityAnalysisCard";
import type { ActivityAnalysis } from "@/pages/admin/_components/dashboard/useActivityAnalysis";

/** Forme exacte renvoyée par l'edge function : l'enveloppe { analysis: {...} }. */
const EDGE_PAYLOAD = {
  analysis: "Plateforme stable, trois points à suivre.",
  actions: [
    { title: "Relancer les brouillons", why: "8 brouillons dormants", priority: "haute", link: "/admin/listings" },
  ],
  generated_at: new Date().toISOString(),
  snapshot: { kpis: { totalUsers: 100 } },
  snapshot_at: new Date().toISOString(),
};

describe("useActivityAnalysis : déballage de l'enveloppe edge function", () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  it("stocke la charge utile et non l'enveloppe (mode latest)", async () => {
    mocks.invoke.mockResolvedValue({ data: { analysis: EDGE_PAYLOAD }, error: null });

    const { result } = renderHook(() => useActivityAnalysis());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Avant le correctif, analysis.analysis était l'objet interne (crash #31).
    expect(typeof result.current.analysis?.analysis).toBe("string");
    expect(result.current.analysis?.analysis).toBe(EDGE_PAYLOAD.analysis);
    expect(result.current.analysis?.actions).toHaveLength(1);
    expect(result.current.analysis?.generated_at).toBe(EDGE_PAYLOAD.generated_at);
  });

  it("stocke la charge utile et non l'enveloppe (mode refresh)", async () => {
    mocks.invoke.mockResolvedValue({ data: { analysis: EDGE_PAYLOAD }, error: null });

    const { result } = renderHook(() => useActivityAnalysis());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mocks.invoke.mockResolvedValue({
      data: { analysis: { ...EDGE_PAYLOAD, analysis: "Analyse régénérée." } },
      error: null,
    });
    await result.current.refresh();

    expect(result.current.analysis?.analysis).toBe("Analyse régénérée.");
  });

  it("retombe à null quand aucune analyse n'est stockée", async () => {
    mocks.invoke.mockResolvedValue({ data: { analysis: null }, error: null });

    const { result } = renderHook(() => useActivityAnalysis());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.analysis).toBeNull();
  });

  it("ne stocke pas une charge malformée (analysis non textuel)", async () => {
    mocks.invoke.mockResolvedValue({
      data: { analysis: { analysis: { nested: true }, actions: [] } },
      error: null,
    });

    const { result } = renderHook(() => useActivityAnalysis());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.analysis).toBeNull();
  });
});

describe("ActivityAnalysisCard : garde anti-crash", () => {
  const noop = () => {};

  it("ne plante pas si analysis.analysis est un objet (forme ayant cassé la prod)", () => {
    const malformed = {
      analysis: {
        analysis: "texte",
        actions: [],
        generated_at: "2026-08-16T08:00:00Z",
        snapshot: null,
        snapshot_at: null,
      },
      actions: [],
      generated_at: "2026-08-16T08:00:00Z",
    } as unknown as ActivityAnalysis;

    // Sans la garde, React jette l'erreur #31 (objet rendu comme enfant).
    expect(() =>
      render(
        <ActivityAnalysisCard analysis={malformed} loading={false} refreshing={false} onRefresh={noop} />,
      ),
    ).not.toThrow();
    expect(screen.getByText(/Aucune analyse disponible/)).toBeInTheDocument();
  });

  it("rend le texte et l'horodatage pour une analyse valide", () => {
    render(
      <ActivityAnalysisCard
        analysis={{ analysis: "Tout est stable.", actions: [], generated_at: new Date().toISOString() }}
        loading={false}
        refreshing={false}
        onRefresh={noop}
      />,
    );

    expect(screen.getByText("Tout est stable.")).toBeInTheDocument();
    expect(screen.getByText(/Chiffres arrêtés au/)).toBeInTheDocument();
  });
});
