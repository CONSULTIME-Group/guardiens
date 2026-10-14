/**
 * Lot perf 2 : la fiche publique lit tout en une salve après l'annonce
 * (propriétaire, logement, avis, écussons, galerie, animaux, profil
 * propriétaire, guide), au lieu de six salves en série. Un visiteur ne lit
 * que la vue publique du profil propriétaire.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, activeRole: null, hasSession: false, authChecked: true }) }));
vi.mock("@/hooks/useSubscriptionAccess", () => ({ useSubscriptionAccess: () => ({ hasAccess: false }) }));
vi.mock("@/components/layout/PublicHeader", () => ({ default: () => null }));
vi.mock("@/components/layout/PublicFooter", () => ({ default: () => null }));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));
vi.mock("@/components/sits/NearbySitsModule", () => ({ default: () => null }));
vi.mock("@/components/sits/ApplicationModal", () => ({ default: () => null }));
vi.mock("@/components/seo/LegacyProjetRedirect", () => ({ default: () => null }));
vi.mock("@/components/sits/PublicSitView", () => ({ default: (p: any) => <h1 data-testid="fiche">{p?.sit?.title ?? "fiche"}</h1> }));

const requested: string[] = [];
let gate: Promise<void> = Promise.resolve();
let open: () => void = () => {};
const sit = { id: "s1", slug: "garde-lyon", title: "Garde à Lyon", user_id: "o1", property_id: "p1", status: "published", city: "Lyon", country: "FR", departement_code: "69" };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    rpc: (fn: string) => {
      requested.push(`rpc:${fn}`);
      if (fn === "get_public_sit") return Promise.resolve({ data: [sit], error: null });
      return gate.then(() => ({ data: [], error: null }));
    },
    from: (table: string) => {
      requested.push(table);
      const result = () => {
        if (table === "public_profiles") return { data: [{ id: "o1", first_name: "Anne", city: "Lyon" }], error: null };
        if (table === "properties") return { data: [{ id: "p1", type: "house", photos: [] }], error: null };
        return { data: [], error: null };
      };
      const builder: any = new Proxy({}, {
        get: (_t, key: string) => {
          if (["insert", "update", "delete", "upsert"].includes(key)) return () => { throw new Error("Écriture interdite"); };
          if (key === "then") return (ok: any, fail: any) => gate.then(result).then(ok, fail);
          if (key === "maybeSingle") return () => gate.then(() => ({ data: null, error: null }));
          return () => builder;
        },
      });
      return builder;
    },
  },
}));

import PublicSitDetail from "@/pages/PublicSitDetail";

beforeEach(() => {
  requested.length = 0;
  gate = new Promise<void>((r) => { open = r; });
});
afterEach(() => cleanup());

describe("fiche publique en une salve (lot perf 2)", () => {
  it("toutes les lectures partent avant la première réponse, vue publique seule pour un visiteur", async () => {
    render(<MemoryRouter initialEntries={["/annonces/garde-lyon"]}><Routes><Route path="/annonces/:id" element={<PublicSitDetail />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(requested).toContain("house_guides"));
    for (const t of ["public_profiles", "properties", "rpc:public_profile_reviews", "public_badge_attributions", "owner_gallery", "public_pets", "public_owner_profiles", "house_guides"]) {
      expect(requested, t).toContain(t);
    }
    expect(requested).not.toContain("owner_profiles");
    expect(requested).not.toContain("member_owner_profiles");
    open();
    await waitFor(() => expect(document.querySelector('[data-testid="fiche"]')).not.toBeNull());
  });
});
