/**
 * Lot SUPPR1 (29/10/2026) : « Supprimer l'annonce » trouvable et juste.
 * Retour de Laurence : « Quelque chose de simple comme supprimer mon annonce,
 * je n'ai pas pu trouver l'option. » (annonce publiée, 5 candidatures).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

type Call = { table: string; op: string; payload?: unknown; filters: [string, string, unknown][] };
const calls: Call[] = [];
let applications: { id: string; sitter_id: string; status: string; created_at: string }[] = [];

function builder(table: string) {
  const call: Call = { table, op: "select", filters: [] };
  calls.push(call);
  const b: any = {
    select: () => b,
    delete: () => { call.op = "delete"; return b; },
    update: (p: unknown) => { call.op = "update"; call.payload = p; return b; },
    eq: (c: string, v: unknown) => { call.filters.push(["eq", c, v]); return b; },
    in: (c: string, v: unknown) => { call.filters.push(["in", c, v]); return b; },
    then: (resolveFn: (r: unknown) => void) => {
      if (table === "applications" && call.op === "select") return resolveFn({ data: applications, error: null });
      return resolveFn({ data: [{ id: "sit-1" }], error: null });
    },
  };
  return b;
}

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (t: string) => builder(t) } }));
const decline = vi.fn(async (p: { applications: unknown[] }) => ({ declined: p.applications.length, failed: 0, skipped: 0 }));
vi.mock("@/lib/declineOpenApplications", async (orig) => ({
  ...(await orig<typeof import("@/lib/declineOpenApplications")>()),
  declineOpenApplications: (p: { applications: unknown[] }) => decline(p),
}));

import { removalPlan, removeSit, canShowRemoveSit, isDeletedByOwner, DELETED_BY_OWNER_REASON } from "@/lib/removeSit";
import OwnerSitManagement from "@/components/sits/shared/OwnerSitManagement";

const app = (id: string, status: string) => ({ id, sitter_id: `s-${id}`, status, created_at: "2026-10-20T10:00:00Z" });

beforeEach(() => {
  calls.length = 0;
  applications = [];
  decline.mockClear();
});

describe("règle", () => {
  it("aucune candidature : suppression réelle", () => {
    expect(removalPlan({ status: "published", applicationCount: 0, hasAccepted: false })).toBe("delete");
    expect(removalPlan({ status: "draft", applicationCount: 0, hasAccepted: false })).toBe("delete");
  });
  it("des candidatures sans gardien retenu : retrait", () => {
    expect(removalPlan({ status: "published", applicationCount: 5, hasAccepted: false })).toBe("withdraw");
  });
  it("gardien confirmé : annuler la garde d'abord", () => {
    expect(removalPlan({ status: "confirmed", applicationCount: 3, hasAccepted: true })).toBe("cancel_first");
    expect(removalPlan({ status: "published", applicationCount: 3, hasAccepted: true })).toBe("cancel_first");
  });
  it("garde en cours, terminée ou archivée : historique conservé, aucun bouton", () => {
    for (const st of ["in_progress", "completed", "archived"]) {
      expect(canShowRemoveSit(st)).toBe(false);
      expect(removalPlan({ status: st, applicationCount: 0, hasAccepted: false })).toBeNull();
    }
  });
  it("annonce retirée : absente des listes du propriétaire", () => {
    expect(isDeletedByOwner({ status: "cancelled", cancellation_reason: DELETED_BY_OWNER_REASON })).toBe(true);
    expect(isDeletedByOwner({ status: "cancelled", cancellation_reason: "archived" })).toBe(false);
  });
});

describe("exécution", () => {
  it("sans candidature : DELETE restreint au propriétaire, aucun message", async () => {
    const out = await removeSit({ sitId: "sit-1", sitTitle: "Maison", status: "published", ownerId: "me" });
    expect(out.kind).toBe("deleted");
    const del = calls.find((c) => c.table === "sits" && c.op === "delete");
    expect(del?.filters).toEqual(expect.arrayContaining([["eq", "id", "sit-1"], ["eq", "user_id", "me"]]));
    expect(decline).not.toHaveBeenCalled();
  });

  it("cas de Laurence : candidats ouverts prévenus, puis annonce retirée sans cancelled_by", async () => {
    applications = [app("a", "pending"), app("b", "viewed"), app("c", "discussing"), app("d", "rejected"), app("e", "pending")];
    const out = await removeSit({ sitId: "sit-1", sitTitle: "Maison", status: "published", ownerId: "me" });
    expect(out).toEqual({ kind: "withdrawn", notified: 4, failed: 0 });
    expect((decline.mock.calls[0][0] as any).applications.map((a: any) => a.id)).toEqual(["a", "b", "c", "e"]);
    const upd = calls.find((c) => c.table === "sits" && c.op === "update");
    expect(upd?.payload).toMatchObject({ status: "cancelled", cancellation_reason: DELETED_BY_OWNER_REASON });
    expect(upd?.payload).not.toHaveProperty("cancelled_by");
    expect(calls.some((c) => c.table === "sits" && c.op === "delete")).toBe(false);
    // Prévenir d'abord, retirer ensuite.
    expect(calls.indexOf(upd!)).toBeGreaterThan(calls.findIndex((c) => c.table === "applications"));
  });

  it("une candidature acceptée arrivée entre-temps : rien n'est supprimé", async () => {
    applications = [app("a", "accepted")];
    const out = await removeSit({ sitId: "sit-1", sitTitle: "Maison", status: "published", ownerId: "me" });
    expect(out.kind).toBe("cancel_first");
    expect(calls.some((c) => c.table === "sits")).toBe(false);
  });
});

describe("écrans", () => {
  it("« Gérer cette garde » montre « Supprimer l'annonce »", () => {
    render(
      <MemoryRouter>
        <OwnerSitManagement sitId="s" propertyId="p" status="published" canCancel={false} onCancelClick={() => {}} canRemove onRemoveClick={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /Supprimer l'annonce/ })).toBeTruthy();
  });

  const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
  it("Mes annonces : « Supprimer » ne dépend plus du nombre de candidatures", () => {
    const src = read("src/pages/Sits.tsx");
    expect(src).toMatch(/const canDelete = canShowRemoveSit\(sit\.status\)/);
    expect(src).not.toMatch(/sit\.applicationCount === 0;/);
    expect(src).toMatch(/enriched\.filter\(\(s: any\) => !isDeletedByOwner\(s\)\)/);
    expect(src).toMatch(/<RemoveSitDialog/);
  });
  it("fiche propriétaire : bouton branché sur la même fenêtre", () => {
    const src = read("src/components/sits/views/OwnerSitView.tsx");
    expect(src).toMatch(/canRemove=\{canRemove\}/);
    expect(src).toMatch(/<RemoveSitDialog/);
  });
});
