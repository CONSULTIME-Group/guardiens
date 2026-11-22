/**
 * Lot REC2 (recette du 22/11/2026) : trois corrections sans effet visuel.
 * 1. Le motif d'annulation part dans la seule conversation des deux parties.
 * 2. Une pièce d'identité se renvoie depuis « en cours de vérification ».
 * 3. Un refus de la base affiché à un membre laisse une trace.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";

vi.mock("@/lib/errorLogger", () => ({ reportError: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(() => Promise.resolve()) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import NetworkErrorMonitor from "@/components/layout/NetworkErrorMonitor";
import { reportError } from "@/lib/errorLogger";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { cleanRefusalMessage, isDatabaseRefusal, isGuardRefusal, refusalTarget } from "@/lib/memberActionRefusal";

const read = (p: string) => readFileSync(p, "utf8");
const flush = () => new Promise((r) => setTimeout(r, 30));
const REST = "https://erhccyqevdyevpyctsjj.supabase.co/rest/v1";

describe("REC2, motif d'annulation", () => {
  const src = read("src/components/sits/CancelSitModal.tsx");
  it("le message système vise la conversation du propriétaire et du gardien retenu", () => {
    expect(src).toContain('.eq("owner_id", convOwnerId)');
    expect(src).toContain('.eq("sitter_id", convSitterId)');
    expect(src).not.toContain("owner_id.eq.${user.id},sitter_id.eq.${user.id}");
  });
});

describe("REC2, renvoi d'une pièce d'identité", () => {
  const sql = read("drizzle/migrations/0181_rec2_identite_renvoi.sql");
  it("needs_review rejoint les statuts de départ, verified reste fermé", () => {
    expect(sql).toContain("rec2_identite_renvoi");
    expect(sql).toContain("IN ('not_submitted', 'pending', 'rejected', 'needs_review')");
    expect(sql).not.toMatch(/IN \([^)]*'verified'[^)]*\)/);
  });
  it("le contrat de production suit la migration", () => {
    const contracts = JSON.parse(read("scripts/db/production-contracts.json"));
    const c = contracts.contracts.find((x: { migration: string }) => x.migration === "0181_rec2_identite_renvoi.sql");
    expect(c?.checks?.length).toBeGreaterThan(0);
  });
});

describe("REC2, lecture d'un refus de la base", () => {
  it("reconnaît les refus P0001 et 42501 de PostgREST", () => {
    expect(isDatabaseRefusal(`${REST}/rpc/create_avis_annulation`, 400, "P0001")).toBe(true);
    expect(isDatabaseRefusal(`${REST}/applications?id=eq.x`, 403, "42501")).toBe(true);
    expect(isDatabaseRefusal(`${REST}/sits`, 400, "23514")).toBe(false);
    expect(isDatabaseRefusal("https://x.supabase.co/functions/v1/f", 400, "P0001")).toBe(false);
  });
  it("nomme la cible sans paramètre", () => {
    expect(refusalTarget(`${REST}/rpc/create_avis_annulation`)).toBe("rpc:create_avis_annulation");
    expect(refusalTarget(`${REST}/profiles?id=eq.4f48d199-7a35-4d4b-9b3e-6aa8e865d21c`)).toBe("table:profiles");
  });
  it("distingue un garde-fou d'une règle expliquée au membre", () => {
    expect(isGuardRefusal("Modification interdite d'un champ sensible du profil")).toBe(true);
    expect(isGuardRefusal("Only the sit owner can change application status")).toBe(true);
    expect(isGuardRefusal("Le gardien ne peut que retirer sa réponse en attente")).toBe(false);
    expect(isGuardRefusal("Vous avez déjà une annonce en ligne avec ce titre.")).toBe(false);
    expect(isGuardRefusal("SIT_CLOSED: cette annonce n'accepte plus de candidatures")).toBe(false);
  });
  it("nettoie identifiants et emails", () => {
    expect(cleanRefusalMessage("refus 4f48d199-7a35-4d4b-9b3e-6aa8e865d21c pour a@b.fr")).toBe("refus [id] pour [email]");
    expect(cleanRefusalMessage("x".repeat(400)).length).toBe(160);
  });
});

describe("REC2, trace d'un refus dans le moniteur réseau", () => {
  const originalFetch = window.fetch;
  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as { __networkMonitorInstalled?: boolean }).__networkMonitorInstalled = false;
  });
  afterEach(() => { window.fetch = originalFetch; });

  const run = async (route: string, url: string, status: number, body: object) => {
    window.fetch = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;
    const view = render(<MemoryRouter initialEntries={[route]}><NetworkErrorMonitor /></MemoryRouter>);
    await window.fetch(url, { method: "POST" });
    await flush();
    view.unmount();
  };

  it("un garde-fou part à l'événement et au journal, sans toast, sur toute route", async () => {
    await run("/settings", `${REST}/profiles?id=eq.4f48d199-7a35-4d4b-9b3e-6aa8e865d21c`, 400, {
      code: "P0001", message: "Modification interdite d'un champ sensible du profil", details: null, hint: null,
    });
    expect(trackEvent).toHaveBeenCalledWith("member_action_refused", expect.objectContaining({
      metadata: expect.objectContaining({ target: "table:profiles", route: "/settings", message: "Modification interdite d'un champ sensible du profil" }),
    }));
    expect(reportError).toHaveBeenCalledTimes(1);
    expect((reportError as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1]).toMatchObject({ source: "MemberActionRefused", target: "table:profiles" });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("une règle expliquée au membre part à l'événement seulement", async () => {
    await run("/petites-missions/creer", `${REST}/small_missions`, 400, {
      code: "P0001", message: "Vous avez déjà une annonce en ligne avec ce titre.", details: null, hint: "duplicate_small_mission",
    });
    expect(trackEvent).toHaveBeenCalledWith("member_action_refused", expect.objectContaining({
      metadata: expect.objectContaining({ target: "table:small_missions", hint: "duplicate_small_mission" }),
    }));
    expect(reportError).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("une réponse 400 sans refus de la base ne crée aucun événement de refus", async () => {
    await run("/annonces", `${REST}/sits?select=nope`, 400, { code: "42703", message: "column does not exist" });
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
