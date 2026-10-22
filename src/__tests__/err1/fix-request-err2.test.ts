/**
 * Lot ERR2 : une erreur se confie à Claude depuis l'admin ; l'état de la
 * demande se lit sur les colonnes fix_* d'error_logs.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fixRequestState, canRequestFix, safePrUrl } from "@/lib/admin/errorPresentation";

const src = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf8");

describe("état d'une demande de correction", () => {
  it("suit demande, passage et PR", () => {
    expect(fixRequestState({ fix_requested_at: null })).toBe("none");
    expect(fixRequestState({ fix_requested_at: "2026-10-22T08:00:00Z" })).toBe("requested");
    expect(fixRequestState({ fix_requested_at: "2026-10-22T08:00:00Z", fix_attempted_at: "2026-10-23T05:30:00Z", fix_pr_url: "https://github.com/CONSULTIME-Group/guardiens/pull/180" })).toBe("pr_opened");
    expect(fixRequestState({ fix_requested_at: "2026-10-22T08:00:00Z", fix_attempted_at: "2026-10-23T05:30:00Z" })).toBe("attempted");
    // Nouvelle demande après un passage : de nouveau en attente.
    expect(fixRequestState({ fix_requested_at: "2026-10-24T08:00:00Z", fix_attempted_at: "2026-10-23T05:30:00Z" })).toBe("requested");
  });

  it("ne confie ni un refus attendu, ni un dossier hors du site, ni une demande en attente", () => {
    const open = { resolved_at: null, refusalReason: null, hostingReason: null };
    expect(canRequestFix(open)).toBe(true);
    expect(canRequestFix({ ...open, refusalReason: "doublon" })).toBe(false);
    expect(canRequestFix({ ...open, hostingReason: "hébergeur" })).toBe(false);
    expect(canRequestFix({ ...open, resolved_at: "2026-10-22T08:00:00Z" })).toBe(false);
    expect(canRequestFix({ ...open, fix_requested_at: "2026-10-22T08:00:00Z" })).toBe(false);
  });

  it("n'affiche que les PR du dépôt Guardiens", () => {
    expect(safePrUrl("https://github.com/CONSULTIME-Group/guardiens/pull/176")).toBeTruthy();
    expect(safePrUrl("https://evil.example/pull/1")).toBeNull();
    expect(safePrUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("migration 0096", () => {
  it("ajoute les colonnes de demande et figure au journal", () => {
    const sql = src("drizzle/migrations/0096_err2_correction_confiee.sql");
    for (const col of ["fix_requested_at", "fix_requested_by", "fix_attempted_at", "fix_pr_url"]) {
      expect(sql).toContain(`ADD COLUMN IF NOT EXISTS ${col}`);
    }
    // Lovable a rejoué la même migration en 0097 (idempotente) en l'appliquant le 22/10.
    const journal = JSON.parse(src("drizzle/migrations/meta/_journal.json"));
    const tags = journal.entries.map((e: { tag: string }) => e.tag);
    expect(tags).toContain("0096_err2_correction_confiee");
  });
});
