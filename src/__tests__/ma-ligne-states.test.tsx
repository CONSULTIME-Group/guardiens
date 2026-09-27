import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));
import MaLigne from "@/pages/MaLigne";

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={[`/ma-ligne/${"a".repeat(64)}`]}>
      <Routes><Route path="/ma-ligne/:token" element={<MaLigne />} /></Routes>
    </MemoryRouter>,
  );

describe("MaLigne, états d'erreur du lien", () => {
  it("état invalid : « Ce lien mène ailleurs. »", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: false, state: "invalid" }, error: null });
    renderAt();
    expect(await screen.findByText("Ce lien mène ailleurs.")).toBeTruthy();
    expect(screen.queryByText("Ce lien a fait son temps.")).toBeNull();
  });
  it("état expired : « Ce lien a fait son temps. »", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: false, state: "expired" }, error: null });
    renderAt();
    expect(await screen.findByText("Ce lien a fait son temps.")).toBeTruthy();
    expect(screen.queryByText("Ce lien mène ailleurs.")).toBeNull();
  });
  it("used_at renseigné au premier enregistrement, sans invalider le jeton", () => {
    const src = readFileSync("supabase/functions/ma-ligne/index.ts", "utf8");
    expect(src).toMatch(/update\(\{ used_at: [^}]+\}\)\s*\.eq\("token", rawToken\)\s*\.is\("used_at", null\)/);
    expect(src).not.toMatch(/revoked_at:\s*new Date/);
  });
});
