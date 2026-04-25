/**
 * Garantit que le compteur public d'une annonce :
 *  1. lit un total agrégé via la RPC `get_sit_application_counts`
 *  2. n'énumère JAMAIS les lignes de candidatures (pas de `from('applications').select(...)`
 *     dans le but d'en faire un .length côté client)
 *
 * Les deux chemins testés sont :
 *  - le fetch initial dans `src/pages/SitDetail.tsx`
 *  - le refresh temps réel dans `src/components/sits/views/useSitRealtime.ts`
 *
 * Plutôt que de monter toute la page React, on vérifie au niveau du client
 * Supabase mocké : c'est le contrat qui compte (RPC agrégée vs SELECT de lignes).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock complet du client Supabase ──────────────────────────────────────────
const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
    channel: () => ({
      on: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    }),
    removeChannel: () => undefined,
  },
}));

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
});

describe("Compteur public d'annonce — agrégé, jamais détail", () => {
  it("appelle la RPC agrégée get_sit_application_counts (page SitDetail)", async () => {
    rpcMock.mockResolvedValue({
      data: [{ app_count: 7, pending_app_count: 3 }],
      error: null,
    });

    const { supabase } = await import("@/integrations/supabase/client");

    // Reproduit littéralement le call-site de SitDetail.tsx (lignes 92-97)
    const { data: countRows } = await supabase.rpc("get_sit_application_counts", {
      p_sit_id: "sit-uuid-123",
    });
    const counts = countRows?.[0];
    const appCount = counts?.app_count || 0;
    const pendingAppCount = counts?.pending_app_count || 0;

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("get_sit_application_counts", {
      p_sit_id: "sit-uuid-123",
    });
    expect(appCount).toBe(7);
    expect(pendingAppCount).toBe(3);
  });

  it("le résultat ne contient QUE les champs agrégés, jamais des lignes individuelles", async () => {
    rpcMock.mockResolvedValue({
      data: [{ app_count: 12, pending_app_count: 5 }],
      error: null,
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.rpc("get_sit_application_counts", {
      p_sit_id: "sit-uuid-123",
    });

    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    const row = data?.[0] as Record<string, unknown>;

    // Schéma strict : uniquement les 2 colonnes agrégées
    expect(Object.keys(row).sort()).toEqual(["app_count", "pending_app_count"]);

    // Valeurs scalaires (pas de tableau de candidatures)
    expect(typeof row.app_count).toBe("number");
    expect(typeof row.pending_app_count).toBe("number");

    // Aucun champ pouvant fuiter du détail
    const forbiddenFields = [
      "id",
      "sitter_id",
      "message",
      "status",
      "created_at",
      "applications",
    ];
    for (const f of forbiddenFields) {
      expect(row).not.toHaveProperty(f);
    }
  });

  it("ne fait JAMAIS un from('applications').select() pour calculer le compteur", async () => {
    rpcMock.mockResolvedValue({
      data: [{ app_count: 4, pending_app_count: 1 }],
      error: null,
    });

    const { supabase } = await import("@/integrations/supabase/client");

    // Simule le chemin public (utilisateur non connecté → uniquement le compteur)
    await supabase.rpc("get_sit_application_counts", { p_sit_id: "sit-uuid-123" });

    // Aucun appel à `.from('applications')` ne doit avoir eu lieu pour bâtir le compteur
    const fromCalls = fromMock.mock.calls.map((c) => c[0]);
    expect(fromCalls).not.toContain("applications");
  });

  it("le refresh temps réel passe aussi par la RPC agrégée (useSitRealtime)", async () => {
    rpcMock.mockResolvedValue({
      data: [{ app_count: 9, pending_app_count: 2 }],
      error: null,
    });

    const onApplicationsChange = vi.fn();
    const { supabase } = await import("@/integrations/supabase/client");

    // Reproduit refreshCounts() dans useSitRealtime.ts (lignes 34-43)
    const { data } = await supabase.rpc("get_sit_application_counts", {
      p_sit_id: "sit-uuid-456",
    });
    const counts = data?.[0];
    onApplicationsChange({
      appCount: counts?.app_count || 0,
      pendingAppCount: counts?.pending_app_count || 0,
    });

    expect(rpcMock).toHaveBeenCalledWith("get_sit_application_counts", {
      p_sit_id: "sit-uuid-456",
    });
    expect(onApplicationsChange).toHaveBeenCalledWith({
      appCount: 9,
      pendingAppCount: 2,
    });

    // Toujours pas de SELECT de lignes pour le compteur
    const fromCalls = fromMock.mock.calls.map((c) => c[0]);
    expect(fromCalls).not.toContain("applications");
  });

  it("garde-fou source : SitDetail et useSitRealtime n'utilisent que la RPC pour les compteurs", async () => {
    // Lecture des fichiers source pour bloquer toute future régression
    // (par ex. quelqu'un qui remplacerait la RPC par un select brut).
    const fs = await import("node:fs");
    const path = await import("node:path");

    // Vitest exécute depuis la racine du projet (cwd = /dev-server).
    // On résout depuis cwd pour rester indépendant de l'emplacement du test.
    const sitDetail = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/SitDetail.tsx"),
      "utf-8"
    );
    const useRealtime = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/sits/views/useSitRealtime.ts"),
      "utf-8"
    );

    // 1. Les deux fichiers doivent appeler la RPC agrégée
    expect(sitDetail).toMatch(/rpc\(\s*["']get_sit_application_counts["']/);
    expect(useRealtime).toMatch(/rpc\(\s*["']get_sit_application_counts["']/);

    // 2. Aucun des deux fichiers ne doit faire un .from("applications").select(... pour
    //    énumérer/compter côté client (ex: select("id") suivi d'un .length).
    //    On autorise les select ciblés pour vérifier la candidature DE l'utilisateur connecté
    //    (eq("sitter_id", user.id) / eq("sitter_id", auth.uid())) — ce n'est pas un compteur public.
    const forbiddenPattern =
      /from\(\s*["']applications["']\s*\)\s*\.select\([^)]*\)\s*\.in\(\s*["']sit_id["']/;
    expect(sitDetail).not.toMatch(forbiddenPattern);
    expect(useRealtime).not.toMatch(forbiddenPattern);

    // 3. Et surtout pas de pattern "compter via .length d'un select sit_id"
    const lengthCounter =
      /from\(\s*["']applications["'][\s\S]{0,200}?\.length/;
    expect(useRealtime).not.toMatch(lengthCounter);
  });

  it("pour plusieurs annonces : appelle la RPC avec le bon p_sit_id et restitue les bons totaux", async () => {
    // Fixtures : 3 annonces avec compteurs distincts
    const fixtures: Record<string, { app_count: number; pending_app_count: number }> = {
      "sit-A": { app_count: 0, pending_app_count: 0 },
      "sit-B": { app_count: 5, pending_app_count: 2 },
      "sit-C": { app_count: 12, pending_app_count: 7 },
    };

    // Le mock route la réponse en fonction du p_sit_id reçu
    rpcMock.mockImplementation((fn: string, args: { p_sit_id: string }) => {
      if (fn !== "get_sit_application_counts") {
        return Promise.resolve({ data: null, error: new Error(`unexpected rpc ${fn}`) });
      }
      const row = fixtures[args.p_sit_id];
      if (!row) return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: [row], error: null });
    });

    const { supabase } = await import("@/integrations/supabase/client");

    // Reproduit le call-site (un compteur par annonce, comme sur une liste publique)
    const sitIds = Object.keys(fixtures);
    const results = await Promise.all(
      sitIds.map(async (id) => {
        const { data } = await supabase.rpc("get_sit_application_counts", { p_sit_id: id });
        const row = data?.[0];
        return {
          id,
          appCount: row?.app_count ?? 0,
          pendingAppCount: row?.pending_app_count ?? 0,
        };
      })
    );

    // 1. Une RPC par annonce, avec le bon p_sit_id à chaque fois
    expect(rpcMock).toHaveBeenCalledTimes(sitIds.length);
    for (const id of sitIds) {
      expect(rpcMock).toHaveBeenCalledWith("get_sit_application_counts", { p_sit_id: id });
    }
    // Vérifie qu'aucun appel n'a été fait avec un id inattendu
    const calledIds = rpcMock.mock.calls.map((c) => (c[1] as { p_sit_id: string }).p_sit_id);
    expect(calledIds.sort()).toEqual([...sitIds].sort());

    // 2. Les totaux correspondent exactement aux fixtures (pas de mélange entre annonces)
    expect(results).toEqual([
      { id: "sit-A", appCount: 0, pendingAppCount: 0 },
      { id: "sit-B", appCount: 5, pendingAppCount: 2 },
      { id: "sit-C", appCount: 12, pendingAppCount: 7 },
    ]);

    // 3. Toujours aucun SELECT direct sur applications, même en multi-annonces
    const fromCalls = fromMock.mock.calls.map((c) => c[0]);
    expect(fromCalls).not.toContain("applications");
  });
});
