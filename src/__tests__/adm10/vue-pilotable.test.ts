/**
 * Lot ADM10 (22/10/2026, maquette validée par Jérémie) : la vue d'ensemble
 * range chaque signal selon une règle unique, partagée avec l'email du matin.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildPilotage, autoBreakdown, departureLabel, type PilotageSignal } from "@/lib/admin/pilotage";
import { summarizeRelances } from "@/pages/admin/_components/dashboard/PilotageBlocks";
import { signalNature, SIGNAL_TYPES } from "../../../supabase/functions/_shared/admin-signal-config.ts";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

// Jeudi 22/10/2026, 8 h à Paris.
const NOW = Date.parse("2026-10-22T06:00:00Z");
let seq = 0;
const sig = (signal_type: string, opts: Partial<PilotageSignal> & { sit?: string } = {}): PilotageSignal => ({
  id: `s${++seq}`,
  signal_type,
  severity: opts.severity ?? "warning",
  entity_type: opts.sit ? "sit" : opts.entity_type ?? "profile",
  entity_id: opts.sit ?? opts.entity_id ?? `e${seq}`,
  detected_at: opts.detected_at ?? "2026-10-20T08:00:00Z",
  metadata: opts.metadata ?? {},
});
const sits = new Map([
  ["proche", { id: "proche", start_date: "2026-10-24" }],
  ["proche2", { id: "proche2", start_date: "2026-10-25" }],
  ["loin", { id: "loin", start_date: "2026-11-30" }],
  ["passe", { id: "passe", start_date: "2026-10-20" }],
]);

describe("Nature de pilotage", () => {
  it("chaque type de la configuration a une nature, les relancés sont « auto »", () => {
    for (const t of Object.keys(SIGNAL_TYPES)) expect(["vous", "auto", "technique", "hebdo"]).toContain(signalNature(t));
    for (const t of ["pending_application", "stalled_discussion", "owner_sit_unconfirmed", "stale_draft"]) expect(signalNature(t)).toBe("auto");
    for (const t of ["suspicious_account", "no_applications", "alma_contact_request", "animal_rehoming_listing", "sit_like_mission"]) expect(signalNature(t)).toBe("vous");
    for (const t of ["dormant_sitter", "affinity_onboarding_stale", "city_coverage_gap"]) expect(signalNature(t)).toBe("hebdo");
    for (const t of ["prerender_monthly_budget_reached", "email_destroyed", "content_quality_drift"]) expect(signalNature(t)).toBe("technique");
    // Un type inconnu revient aux fondateurs : jamais perdu.
    expect(signalNature("type_inconnu")).toBe("vous");
  });
});

describe("Rangement des signaux", () => {
  const model = buildPilotage([
    sig("stale_draft", { sit: "proche", severity: "critical" }),
    sig("stale_draft", { sit: "proche2" }),
    sig("stale_draft", { sit: "loin" }),
    sig("pending_application", { sit: "loin" }),
    sig("pending_application", { sit: "loin" }),
    sig("pending_application", { sit: "passe" }),
    sig("no_applications", { sit: "proche" }),
    sig("no_applications", { sit: "loin" }),
    sig("suspicious_account", { detected_at: "2026-10-02T08:00:00Z" }),
    sig("suspicious_account"),
    sig("alma_contact_request", { severity: "critical", detected_at: "2026-10-12T08:00:00Z" }),
    sig("prerender_monthly_budget_reached", { severity: "critical", entity_type: "system" }),
    sig("dormant_sitter"),
    sig("dormant_sitter"),
  ], sits, NOW);

  it("départ sous 7 jours en tête, quelle que soit la nature", () => {
    expect(model.urgent.map((l) => l.type)).toEqual(["stale_draft", "no_applications"]);
    const draft = model.urgent[0];
    expect(draft.signals).toHaveLength(2);
    expect(draft.title).toBe("Écrire aux 2 propriétaires dont le brouillon part dans 2 jours");
    expect(draft.deadline).toBe("Avant ce soir");
  });

  it("une garde commencée sort de la vue (règle ADM1)", () => {
    const all = [...model.urgent, ...model.vous].flatMap((l) => l.signals).map((s) => s.entity_id);
    expect(all).not.toContain("passe");
  });

  it("« seul vous pouvez trancher » : le message Alma en retard passe d'abord", () => {
    expect(model.vous.map((l) => l.type)).toEqual(["alma_contact_request", "suspicious_account", "no_applications"]);
    expect(model.vous[0].deadline).toBe("En retard de 9 jours");
    expect(model.vous[1].title).toBe("Examiner 2 comptes suspects");
    expect(model.vous[1].detail).toBe("Le plus ancien attend depuis le 02/10.");
  });

  it("les relances automatiques loin du départ restent dans « le système s'en charge »", () => {
    expect(model.auto).toEqual([{ type: "pending_application", count: 2 }, { type: "stale_draft", count: 1 }]);
    expect(model.autoTotal).toBe(3);
    expect(autoBreakdown(model.auto)).toBe("2 candidatures sans réponse, 1 brouillon");
  });

  it("technique avec l'état du site, animation au lundi", () => {
    expect(model.technique.map((s) => s.signal_type)).toEqual(["prerender_monthly_budget_reached"]);
    expect(model.hebdo).toEqual([{ type: "dormant_sitter", count: 2 }]);
  });

  it("aucun tiret cadratin ni demi-cadratin dans les textes produits", () => {
    const text = [...model.urgent, ...model.vous].map((l) => `${l.title} ${l.detail} ${l.deadline}`).join(" ");
    expect(text).not.toMatch(/[–—]/);
  });
});

describe("Libellés", () => {
  it("départ", () => {
    expect(departureLabel(0)).toBe("aujourd'hui");
    expect(departureLabel(1)).toBe("demain");
    expect(departureLabel(5)).toBe("dans 5 jours");
  });
});

describe("Relances automatiques", () => {
  it("compte les envois de 24 h et les échecs de 7 jours", () => {
    const rows = [
      { status: "sent", created_at: "2026-10-22T05:00:00Z" },
      { status: "sent", created_at: "2026-10-21T09:00:00Z" },
      { status: "deferred", created_at: "2026-10-22T04:00:00Z" },
      { status: "failed", created_at: "2026-10-18T04:00:00Z" },
    ];
    expect(summarizeRelances(rows, 22, NOW)).toEqual({ sent24h: 2, waiting24h: 1, failed24h: 0, failed7d: 1, closed24h: 22 });
  });
});

describe("Page et email suivent la même règle", () => {
  it("l'accueil monte les trois questions, plus l'ancienne file", () => {
    const page = read("src/pages/admin/AdminOverview.tsx");
    expect(page).toMatch(/TodaySection/);
    expect(page).not.toMatch(/<SignalsSection/);
  });
  it("l'email du matin écarte une situation relancée seule loin du départ", () => {
    const digest = read("supabase/functions/alert-admin-signals/digest.ts");
    expect(digest).toMatch(/signalNature\(t\) === 'auto'\) && !isSitImminent\(startDate, now\)/);
  });
});
