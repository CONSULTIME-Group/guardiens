/**
 * Lots D6 et D7 (09/11/2026, audit « Tableaux de bord ordinateur », états P2 et
 * G3) : republier la dernière annonce pour de nouvelles dates, et zone
 * d'alerte du gardien loin de toute garde.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ rpc: vi.fn(), upsert: vi.fn(), track: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: unknown[]) => h.rpc(...a),
    from: () => ({ upsert: (...a: unknown[]) => h.upsert(...a) }),
  },
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: unknown[]) => h.track(...a) }));

import { pickRepublishSource, republishStarCopy, REPUBLISH_CTA_LABEL } from "@/lib/ownerRepublish";
import {
  buildAlertZoneChoices, defaultAlertZone, isFarFromSits, alertZoneRpcArgs, alertZonesFull,
  ALERT_ZONE_CTA, type AlertZoneData,
} from "@/lib/alertZoneOptions";
import { RepublishStar } from "@/components/dashboard/owner/OwnerStarSection";
import SitterAlertZoneCard from "@/components/dashboard/sitter/SitterAlertZoneCard";

const NEG = /\b(ne|n'|pas|jamais|aucun|aucune|sans)\b/i;
const DASHES = /[–—]/;

beforeEach(() => { h.rpc.mockReset(); h.upsert.mockReset(); h.track.mockReset(); });
afterEach(() => cleanup());

describe("D6, la dernière annonce à republier", () => {
  const rows = [
    { id: "a", status: "completed", title: "Chats à Lyon", city: "Lyon", end_date: "2026-08-20", created_at: "2026-07-01" },
    { id: "b", status: "expired", title: "Noël avec Rex", city: "Lyon", end_date: "2026-10-03", created_at: "2026-09-01" },
    { id: "c", status: "cancelled", cancellation_reason: "deleted_by_owner", title: "Supprimée", end_date: "2026-11-01" },
    { id: "d", status: "published", title: "En ligne", end_date: "2026-12-30" },
    { id: "e", status: "archived", title: "  ", end_date: "2026-10-30" },
    { id: "f", status: "draft", title: "Brouillon", end_date: "2026-12-01" },
  ];
  it("date de fin la plus récente, jamais supprimée, en ligne, brouillon ou sans titre", () => {
    expect(pickRepublishSource(rows)).toEqual({ id: "b", title: "Noël avec Rex", city: "Lyon" });
    expect(pickRepublishSource(rows.filter((r) => r.id !== "b" && r.id !== "a"))).toBeNull();
    expect(pickRepublishSource([])).toBeNull();
    expect(pickRepublishSource(null)).toBeNull();
  });
  it("textes affirmatifs, sans tiret long", () => {
    const c = republishStarCopy({ id: "b", title: "Noël avec Rex", city: "Lyon" });
    expect(c.title).toBe("Reprenez « Noël avec Rex » avec de nouvelles dates.");
    for (const t of [c.eyebrow, c.subtitle, REPUBLISH_CTA_LABEL]) {
      expect(t).not.toMatch(NEG);
      expect(t).not.toMatch(DASHES);
    }
  });
  it("un bouton plein ouvre la republication existante, « Publier une autre annonce » reste un lien", () => {
    const onCta = vi.fn();
    render(<MemoryRouter><RepublishStar source={{ id: "b", title: "Noël avec Rex", city: "Lyon" }} onCtaClick={onCta} /></MemoryRouter>);
    const cta = screen.getByTestId("owner-star-republish-cta");
    expect(cta.textContent).toBe(REPUBLISH_CTA_LABEL);
    expect(screen.getByRole("link", { name: "Publier une autre annonce" }).getAttribute("href")).toBe("/sits/create");
    fireEvent.click(cta);
    expect(onCta).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Republier votre annonce")).toBeTruthy();
  });
  it("branché sur l'accueil propriétaire : vedette « republish », récit de première annonce écarté", () => {
    const dash = readFileSync("src/components/dashboard/OwnerDashboard.tsx", "utf8");
    expect(dash).toContain("pickRepublishSource(");
    expect(dash).toMatch(/primaryAction\?\.action !== "publish_draft" &&\s*!republishSource/);
    expect(dash).toContain("republishSource={republishSource}");
    const star = readFileSync("src/components/dashboard/owner/OwnerStarSection.tsx", "utf8");
    expect(star).toContain('const eventVariant = showRepublish ? "republish" : variant;');
  });
});

const data = (over: Partial<AlertZoneData> = {}): AlertZoneData => ({
  located: true, city: "Moulins", postal_code: "03000", departement: "03", departement_name: "Allier",
  open_sits: { r100: 2, departement: 1, france: 21 },
  alerts: [{ zone_type: "rayon", radius_km: 30, departement: null, region_code: null }],
  active_alerts: 2,
  ...over,
});

describe("D7, zone d'alerte du gardien loin de tout", () => {
  it("état : sans garde à venir, garde ouverte la plus proche au-delà de 50 km", () => {
    expect(isFarFromSits(78, false)).toBe(true);
    expect(isFarFromSits("51", false)).toBe(true);
    expect(isFarFromSits(50, false)).toBe(false);
    expect(isFarFromSits(78, true)).toBe(false);
    expect(isFarFromSits(null, false)).toBe(false);
  });
  it("zones triées par gardes, la France en dernier, jamais de zéro affiché", () => {
    const c = buildAlertZoneChoices(data({ open_sits: { r100: 2, departement: 0, france: 21 } }));
    expect(c.map((x) => x.kind)).toEqual(["departement", "rayon", "france"]);
    expect(c[0].countLine).toBeNull();
    expect(c[1].countLine).toBe("2 gardes ouvertes aujourd'hui");
    expect(c[2].label).toBe("Partout en France");
    expect(defaultAlertZone(c)).toBe("rayon");
  });
  it("zones déjà suivies écartées : France couvre tout, 100 km et département se vérifient", () => {
    expect(buildAlertZoneChoices(data({ alerts: [{ zone_type: "france", radius_km: null, departement: null, region_code: null }] }))).toEqual([]);
    const c = buildAlertZoneChoices(data({ alerts: [
      { zone_type: "rayon", radius_km: 100, departement: null, region_code: null },
      { zone_type: "departement", radius_km: null, departement: "03", region_code: null },
    ] }));
    expect(c.map((x) => x.kind)).toEqual(["france"]);
    expect(buildAlertZoneChoices(data({ city: null, departement: null, departement_name: null })).map((x) => x.kind)).toEqual(["france"]);
    expect(buildAlertZoneChoices(null)).toEqual([]);
  });
  it("paramètres de create_alert_preference par zone (gardes et nouvelles annonces)", () => {
    const d = data();
    expect(alertZoneRpcArgs("rayon", d)).toMatchObject({ p_zone_type: "rayon", p_city: "Moulins", p_postal_code: "03000", p_radius_km: 100, p_alert_types: ["gardes", "new_sit"] });
    expect(alertZoneRpcArgs("departement", d)).toMatchObject({ p_zone_type: "departement", p_departement: "03", p_label: "Département Allier" });
    expect(alertZoneRpcArgs("france", d)).toMatchObject({ p_zone_type: "france", p_label: "France entière", p_region_code: null });
    expect(alertZonesFull(data({ active_alerts: 5 }))).toBe(true);
  });
  it("carte : un bouton plein, enregistrement, confirmation, mesure", async () => {
    h.rpc.mockResolvedValue({ data: "id", error: null });
    h.upsert.mockResolvedValue({ error: null });
    render(<MemoryRouter><SitterAlertZoneCard userId="u1" data={data()} nearestKm={78} /></MemoryRouter>);
    expect(h.track).toHaveBeenCalledWith("dashboard_alert_zone_seen", expect.objectContaining({ metadata: expect.objectContaining({ nearest_km: 78 }) }));
    const save = screen.getByTestId("sitter-alert-zone-save");
    expect(save.textContent).toBe(ALERT_ZONE_CTA);
    expect((screen.getByDisplayValue("departement") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByDisplayValue("rayon"));
    await act(async () => { fireEvent.click(save); });
    expect(h.rpc).toHaveBeenCalledWith("create_alert_preference", expect.objectContaining({ p_zone_type: "rayon", p_radius_km: 100 }));
    expect(h.upsert).toHaveBeenCalledWith({ user_id: "u1", new_sit_digest: true }, { onConflict: "user_id" });
    expect(screen.getByTestId("sitter-alert-zone-done").textContent).toContain("Les nouvelles gardes à 100 km de chez vous arrivent désormais");
    expect(h.track).toHaveBeenCalledWith("sitter_alert_subscribed", expect.objectContaining({ source: "dashboard_alert_zone" }));
  });
  it("cinq zones déjà actives : lien vers Mon secteur, aucun bouton plein", () => {
    render(<MemoryRouter><SitterAlertZoneCard userId="u1" data={data({ active_alerts: 5 })} nearestKm={78} /></MemoryRouter>);
    expect(screen.queryByTestId("sitter-alert-zone-save")).toBeNull();
    expect(screen.getByRole("link", { name: "Ouvrir Mon secteur" }).getAttribute("href")).toBe("/mon-secteur");
  });
  it("branché sur l'accueil gardien ordinateur : la carte prend la place de la vedette", () => {
    const dash = readFileSync("src/components/dashboard/SitterDashboard.tsx", "utf8");
    expect(dash).toContain("isDesktopRail && isFarFromSits(");
    expect(dash).toContain('<DashboardBlock block="alert_zone"');
    expect(dash).toContain('layout={openingVisible || !isDesktopRail || showAlertZone ? "rows" : "star"}');
    expect(dash).toContain("fallbackTotalPublished={nbaLoading || showAlertZone ? undefined : totalPublished}");
  });
  it("textes de la carte sans tiret long", () => {
    const src = readFileSync("src/lib/alertZoneOptions.ts", "utf8") + readFileSync("src/components/dashboard/sitter/SitterAlertZoneCard.tsx", "utf8");
    expect(src).not.toMatch(DASHES);
  });
});
