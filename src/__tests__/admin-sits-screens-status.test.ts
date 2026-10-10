import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf-8");

const sitsManagement = read("src/pages/admin/AdminSitsManagement.tsx");
const listings = read("src/pages/admin/AdminListings.tsx");
const draftPanel = read("src/components/admin/DraftStatsPanel.tsx");

describe("AdminSitsManagement, statuts visibles", () => {
  it("propose le filtre des gardes en cours", () => {
    expect(sitsManagement).toContain('<SelectItem value="in_progress">En cours</SelectItem>');
  });

  // Lot A9 : la page Gardes ne montre que les statuts d'après acceptation.
  it("ne propose plus les statuts d'avant acceptation", () => {
    expect(sitsManagement).not.toContain('<SelectItem value="archived"');
    expect(sitsManagement).not.toContain('<SelectItem value="expired"');
  });

  it("distingue le déroulé dans le temps et l'état du dossier", () => {
    expect(sitsManagement).toContain("<TableHead>Déroulé dans le temps</TableHead>");
    expect(sitsManagement).toContain("<TableHead>État du dossier</TableHead>");
    expect(sitsManagement).not.toContain("<TableHead>Statut</TableHead>");
  });

  it("affiche le statut réel du sit avec le résolveur partagé", () => {
    expect(sitsManagement).toContain("resolveSitStatusBadge(sit.status)");
  });

  it("conserve le statut temporel", () => {
    expect(sitsManagement).toContain("getTimingStatus(sit)");
  });
});

describe("AdminListings, KPI", () => {
  it("compte les gardes en cours", () => {
    // Audit du 10/10/2026 : répartition complète, une case par situation.
    expect(listings).toContain("sitDistribution(rows)");
    expect(read("src/lib/admin/listingSituation.ts")).toContain('{ key: "in_progress", label: "Gardes en cours" }');
  });
});

describe("DraftStatsPanel, total complet", () => {
  it("s'appuie sur la liste canonique et non sur une liste recopiée", () => {
    expect(draftPanel).toContain("canonicalSitStatuses()");
    expect(draftPanel).not.toContain("draft: 0, published: 0");
  });
});
