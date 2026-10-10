import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let failHistory = true;
const ok = (data: unknown) => Promise.resolve({ data, error: null });
const chain = (table: string) => {
  const q: any = {};
  for (const k of ["select", "eq", "order", "in"]) q[k] = () => q;
  q.limit = () => {
    if (table === "admin_action_logs") return failHistory ? Promise.resolve({ data: null, error: { message: "refus" } }) : ok([]);
    return ok([{ old_status: "published", new_status: "cancelled", changed_at: "2026-10-06T09:00:00Z", changed_by: null, reason: null }]);
  };
  return q;
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => chain(t),
    rpc: () => ok([{ status: "pending" }, { status: "cancelled" }]),
  },
}));

import DossierDetailSheet from "@/components/admin/DossierDetailSheet";

describe("fiche détail admin", () => {
  it("échec : Indisponible et relance, puis historique réel sans invention", async () => {
    render(
      <DossierDetailSheet
        kind="sit"
        open
        onOpenChange={() => {}}
        item={{ id: "s1", title: "Garder Spoon à Domicile", status: "cancelled", user_id: "o1", created_at: "2026-09-01T10:00:00Z" }}
      />,
    );
    expect(await screen.findByText("Annulée, motif non renseigné")).toBeTruthy();
    expect(await screen.findByText(/Annulée : 1/)).toBeTruthy();
    expect(await screen.findByText(/Historique : refus/)).toBeTruthy();
    expect(screen.queryByText(/0 événement/)).toBeNull();
    failHistory = false;
    fireEvent.click(screen.getByRole("button", { name: /Relancer la lecture/ }));
    expect(await screen.findByText("En ligne vers Annulées".replace("Annulées", "Annulées"))).toBeTruthy();
    expect(screen.getByText(/Auteur non enregistré/)).toBeTruthy();
  });
});
