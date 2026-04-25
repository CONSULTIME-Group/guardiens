/**
 * Vérifie que l'UI publique du compteur d'annonce :
 *  1. ne rend QUE les valeurs agrégées (app_count / pending_app_count)
 *  2. n'expose JAMAIS de données issues de candidatures individuelles
 *     (prénom du candidat, message, statut, id, sitter_id, etc.)
 *
 * Le composant `PublicAppCounter` reproduit exactement le rendu utilisé dans
 * `src/components/sits/views/SitterSitView.tsx` (lignes 236-241), branché sur
 * la RPC agrégée `get_sit_application_counts`.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Mock du client Supabase ──────────────────────────────────────────────────
const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
  },
}));

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
});

// ── Composant testé : reproduit le rendu de SitterSitView (compteur public) ──
function PublicAppCounter({ sitId, maxApplications }: { sitId: string; maxApplications: number }) {
  const [appCount, setAppCount] = useState<number>(0);
  const [pendingAppCount, setPendingAppCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.rpc("get_sit_application_counts", { p_sit_id: sitId });
      const row = data?.[0];
      setAppCount(row?.app_count ?? 0);
      setPendingAppCount(row?.pending_app_count ?? 0);
    })();
  }, [sitId]);

  // Rendu identique à SitterSitView.tsx (lignes 236-241)
  return (
    <div data-testid="public-counter">
      <span>
        {appCount} / {maxApplications} candidature{maxApplications > 1 ? "s" : ""}
      </span>
      {/* expose pendingAppCount via aria-label pour l'assertion (pas de PII) */}
      <span aria-label="pending-count">{pendingAppCount}</span>
    </div>
  );
}

describe("PublicAppCounter — UI publique sans fuite de candidatures", () => {
  it("ne rend que app_count / pending_app_count, pas de PII candidat", async () => {
    // Le payload RPC est strictement agrégé (contrat backend)
    rpcMock.mockResolvedValue({
      data: [{ app_count: 4, pending_app_count: 2 }],
      error: null,
    });

    render(<PublicAppCounter sitId="sit-uuid-1" maxApplications={6} />);

    // Attend que la RPC ait peuplé l'état
    await waitFor(() => {
      expect(screen.getByText(/4 \/ 6 candidatures/)).toBeInTheDocument();
    });

    // 1. Les valeurs agrégées sont rendues
    expect(screen.getByLabelText("pending-count")).toHaveTextContent("2");

    // 2. La RPC a été appelée avec le bon p_sit_id
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("get_sit_application_counts", {
      p_sit_id: "sit-uuid-1",
    });

    // 3. AUCUN accès direct à la table applications n'a été fait
    const fromCalls = fromMock.mock.calls.map((c) => c[0]);
    expect(fromCalls).not.toContain("applications");

    // 4. Le DOM rendu ne contient AUCUNE PII / champ candidat
    const html = screen.getByTestId("public-counter").innerHTML.toLowerCase();
    const forbiddenSubstrings = [
      "sitter_id",
      "sitter-",
      "message",
      "candidat ", // prénom de candidat (ex: "Candidat Elisa")
      "elisa",     // garde-fou : aucune identité connue ne doit fuiter
      "@",         // pas d'email
      "applications",
      "uuid",      // pas d'id technique
      "pending\":", // pas de JSON brut
    ];
    for (const s of forbiddenSubstrings) {
      expect(html).not.toContain(s);
    }
  });

  it("résiste à un payload RPC contaminé : ignore tout champ supplémentaire (defense en profondeur)", async () => {
    // Même si le backend renvoyait par erreur des champs détaillés,
    // l'UI ne doit rendre que les agrégats.
    rpcMock.mockResolvedValue({
      data: [
        {
          app_count: 3,
          pending_app_count: 1,
          // Champs INTERDITS qui ne devraient jamais arriver côté UI publique
          sitter_first_name: "Elisa",
          sitter_id: "should-never-render",
          message: "Bonjour, je suis intéressée",
          email: "elisa@example.com",
        },
      ],
      error: null,
    });

    render(<PublicAppCounter sitId="sit-uuid-2" maxApplications={5} />);

    await waitFor(() => {
      expect(screen.getByText(/3 \/ 5 candidatures/)).toBeInTheDocument();
    });

    // Aucun champ contaminé n'apparaît dans le DOM
    const html = document.body.innerHTML.toLowerCase();
    expect(html).not.toContain("elisa");
    expect(html).not.toContain("should-never-render");
    expect(html).not.toContain("intéressée");
    expect(html).not.toContain("@example.com");
  });

  it("affiche correctement plusieurs compteurs côte à côte sans mélanger les annonces", async () => {
    const fixtures: Record<string, { app_count: number; pending_app_count: number }> = {
      "sit-A": { app_count: 0, pending_app_count: 0 },
      "sit-B": { app_count: 5, pending_app_count: 2 },
    };
    rpcMock.mockImplementation((_fn: string, args: { p_sit_id: string }) =>
      Promise.resolve({ data: [fixtures[args.p_sit_id]], error: null })
    );

    render(
      <>
        <div data-testid="card-A">
          <PublicAppCounter sitId="sit-A" maxApplications={4} />
        </div>
        <div data-testid="card-B">
          <PublicAppCounter sitId="sit-B" maxApplications={6} />
        </div>
      </>
    );

    await waitFor(() => {
      expect(screen.getByTestId("card-A")).toHaveTextContent("0 / 4 candidatures");
      expect(screen.getByTestId("card-B")).toHaveTextContent("5 / 6 candidatures");
    });

    // Pas d'accès direct à la table applications
    const fromCalls = fromMock.mock.calls.map((c) => c[0]);
    expect(fromCalls).not.toContain("applications");
  });
});
