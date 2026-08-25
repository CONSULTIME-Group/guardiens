import { describe, it, expect, vi, afterEach } from "vitest";
import { Constants } from "@/integrations/supabase/types";
import {
  SIT_STATUSES,
  SIT_STATUS_FALLBACK,
  SIT_STATUS_LABELS,
  SIT_STATUS_SHORT_LABELS,
  adminSitsFilterStatuses,
  canonicalSitStatuses,
  resolveSitStatusBadge,
} from "@/lib/sitStatus";

const EXPECTED = [
  "draft",
  "published",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "archived",
  "expired",
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("source de vérité des statuts de garde", () => {
  it("expose l'enum de la base au runtime, non vide", () => {
    expect(Constants?.public?.Enums?.sit_status).toBeDefined();
    expect(Array.isArray(Constants.public.Enums.sit_status)).toBe(true);
    expect(SIT_STATUSES.length).toBeGreaterThan(0);
  });

  it("contient les huit statuts attendus", () => {
    for (const status of EXPECTED) {
      expect(SIT_STATUSES).toContain(status);
    }
    expect(SIT_STATUSES.length).toBe(EXPECTED.length);
  });

  it("garde une liste de repli alignée sur l'enum", () => {
    expect([...SIT_STATUS_FALLBACK].sort()).toEqual([...SIT_STATUSES].sort());
  });

  it("porte un libellé pour chaque statut", () => {
    for (const status of SIT_STATUSES) {
      expect(SIT_STATUS_LABELS[status]?.label?.length ?? 0).toBeGreaterThan(0);
      expect(SIT_STATUS_SHORT_LABELS[status]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("filtres admin des gardes", () => {
  it("le filtre Tous statuts couvre l'intégralité de l'enum", () => {
    expect([...adminSitsFilterStatuses("all")].sort()).toEqual([...SIT_STATUSES].sort());
  });

  it("ne renvoie jamais un tableau vide", () => {
    for (const filter of ["all", "operational", "no_draft", "published", "valeur_inconnue"]) {
      expect(adminSitsFilterStatuses(filter).length).toBeGreaterThan(0);
    }
  });

  it("inclut in_progress dans le périmètre opérationnel", () => {
    expect(adminSitsFilterStatuses("operational")).toContain("in_progress");
  });

  it("cible un statut unique quand il est demandé", () => {
    expect(adminSitsFilterStatuses("in_progress")).toEqual(["in_progress"]);
  });
});

describe("repli quand l'enum est illisible", () => {
  it("retombe sur la liste de secours et signale l'anomalie", async () => {
    vi.resetModules();
    vi.doMock("@/integrations/supabase/types", () => ({ Constants: { public: { Enums: {} } } }));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mod = await import("@/lib/sitStatus");
    expect(mod.SIT_STATUSES.length).toBe(0);
    expect(mod.canonicalSitStatuses().length).toBe(EXPECTED.length);
    expect(mod.adminSitsFilterStatuses("all").length).toBe(EXPECTED.length);
    expect(spy).toHaveBeenCalled();
    vi.doUnmock("@/integrations/supabase/types");
    vi.resetModules();
  });
});

describe("badge de statut", () => {
  it("distingue in_progress et expired du brouillon", () => {
    expect(resolveSitStatusBadge("in_progress").label).toBe("En cours");
    expect(resolveSitStatusBadge("expired").label).toBe("Expirée");
    expect(resolveSitStatusBadge("draft").label).toBe("Brouillon");
  });

  it("n'emprunte jamais l'identité d'un autre statut", () => {
    const badge = resolveSitStatusBadge("statut_bidon");
    expect(badge.label).toContain("statut_bidon");
    expect(badge.variant).toBe("destructive");
  });

  it("canonicalSitStatuses renvoie une copie modifiable sans effet de bord", () => {
    const list = canonicalSitStatuses();
    list.pop();
    expect(canonicalSitStatuses().length).toBe(EXPECTED.length);
  });
});
