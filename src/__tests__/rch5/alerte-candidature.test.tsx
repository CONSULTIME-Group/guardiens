import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let emailState: string = "immediate";
let zones: Array<{ radius_km: number }> = [];
const rpc = vi.fn(async (name: string) => (name === "my_alert_email_state" ? { data: emailState, error: null } : { data: "id", error: null }));
vi.mock("@/integrations/supabase/client", () => {
  const chain: any = { select: () => chain, eq: () => chain, contains: async () => ({ data: zones, error: null }) };
  return { supabase: { rpc: (...a: any[]) => (rpc as any)(...a), from: () => chain } };
});
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(async () => undefined) }));

import AlertActionLine, { alertLineText, nextAlertRadius } from "@/components/search/listing/AlertActionLine";

const renderLine = (props: Partial<Parameters<typeof AlertActionLine>[0]> = {}) =>
  render(<MemoryRouter><AlertActionLine userId="u1" visitorSignupHref={null} declaredRadiusKm={null} homeCity="Pierrelatte" {...props} /></MemoryRouter>);

describe("RCH5 · ligne d'alerte toujours vraie", () => {
  beforeEach(() => { emailState = "immediate"; zones = []; rpc.mockClear(); });

  it("sans zone : propose 100 km de chez vous, jamais la ville cherchée", async () => {
    renderLine();
    expect(await screen.findByText(alertLineText.offer(100))).toBeTruthy();
    expect(screen.getByRole("button", { name: "Recevoir jusqu'à 100 km" })).toBeTruthy();
  });

  it("zone de 30 km, distance déclarée 45 : dit la zone et propose 50 km", async () => {
    zones = [{ radius_km: 30 }];
    renderLine({ declaredRadiusKm: 45 });
    expect(await screen.findByText(alertLineText.current(30))).toBeTruthy();
    expect(screen.getByRole("button", { name: "Recevoir jusqu'à 50 km" })).toBeTruthy();
  });

  it("rythme espacé : renvoie aux préférences email", async () => {
    emailState = "digest";
    renderLine();
    expect(await screen.findByText(alertLineText.digest)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Préférences email" }).getAttribute("href")).toBe("/email-preferences");
  });

  it("emails coupés : aucune ligne", async () => {
    emailState = "off";
    const { container } = renderLine();
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("my_alert_email_state"));
    expect(container.querySelector('[data-testid="alert-action-line"]')).toBeNull();
  });

  it("visiteur : invitation à créer un compte gardien", () => {
    render(<MemoryRouter><AlertActionLine userId={null} visitorSignupHref="/inscription?role=sitter" declaredRadiusKm={null} homeCity={null} /></MemoryRouter>);
    expect(screen.getByText(alertLineText.visitor)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Créer mon compte gardien" })).toBeTruthy();
  });

  it("palier suivant", () => {
    expect(nextAlertRadius(null, 30)).toBe(30);
    expect(nextAlertRadius(30, 100)).toBe(100);
    expect(nextAlertRadius(30, 30)).toBe(50);
    expect(nextAlertRadius(100, 30)).toBeNull();
  });

  it("migration 0163 et contrat de production", () => {
    const sql = readFileSync("drizzle/migrations/0163_rch5_etat_alerte_email.sql", "utf8");
    expect(sql).toContain("rch5_etat_alerte_email");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.my_alert_email_state() FROM anon;");
    expect(readFileSync("scripts/db/production-contracts.json", "utf8")).toContain("0163_rch5_etat_alerte_email.sql");
  });

  it("aide de candidature : d'où, comment, quand ; rencontre facultative", () => {
    const src = readFileSync("src/components/sits/ApplicationModal.tsx", "utf8");
    expect(src).toContain("Présentez-vous, dites d'où vous venez, comment vous arrivez et à quelle date. Une rencontre avant la garde reste possible, si vous le souhaitez tous les deux.");
  });
});
