/**
 * Lot X3a (13/10/2026), parcours propriétaire :
 * A-04 l'auteur ouvre ses annonces expirées et annulées,
 * A-06 rappels avant la garde seulement avec un gardien retenu,
 * A-08 avis possible après archivage d'une garde terminée.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";

vi.mock("@/components/ai/alma/RepublishAlmaDialog", () => ({
  RepublishAlmaDialog: ({ open, sitId }: { open: boolean; sitId: string }) =>
    open ? <div data-testid="republish-dialog">{sitId}</div> : null,
}));

import ClosedSitOwnerNotice from "@/components/sits/owner/ClosedSitOwnerNotice";
import { OWN_SIT_COLUMNS, closedSitNotice, ownSitLookupColumn } from "@/lib/ownSitAccess";
import { isSitReviewable } from "@/lib/reviewEligibility";
import { PRE_SIT_REMINDER_STATUSES, shouldSendPreSitReminder } from "../../../supabase/functions/_shared/sit-reminders";

const read = (p: string) => readFileSync(p, "utf8");

describe("X3a, A-04 : l'auteur ouvre ses propres annonces closes", () => {
  afterEach(() => cleanup());

  it("même règle que get_public_sit pour viser id ou slug", () => {
    expect(ownSitLookupColumn("85315487-7c43-4e10-a97e-821aefd10a8c")).toBe("id");
    expect(ownSitLookupColumn("garde-a-lyon-chat")).toBe("slug");
  });

  it("relecture de l'auteur avec les colonnes de la RPC", () => {
    for (const col of ["id", "user_id", "status", "start_date", "end_date", "accepting_applications", "max_applications", "accepts_sitter_pets", "accepts_sitter_children"]) {
      expect(OWN_SIT_COLUMNS.split(", ")).toContain(col);
    }
    const src = read("src/pages/SitDetail.tsx");
    expect(src).toContain('supabase.rpc("get_public_sit", { p_param: id })');
    expect(src).toContain(".select(OWN_SIT_COLUMNS)");
    expect(src).toContain('.eq("user_id", user.id)');
    expect(src).toContain("dates_hidden: false");
    // Le repli ne vaut que si la RPC n'a rien rendu, et avant le renvoi « retirée ou annulée ».
    expect(src.indexOf("if (!sitData && user?.id)")).toBeLessThan(src.indexOf("if (!sitData) {"));
  });

  it("encart de l'annonce expirée : candidatures lisibles et republication", () => {
    render(<ClosedSitOwnerNotice sitId="s1" sitTitle="Garde à Lyon" status="expired" />);
    const box = screen.getByTestId("closed-sit-owner-notice");
    expect(box.textContent).toContain("Cette annonce est arrivée à échéance");
    expect(box.textContent).toContain("candidatures reçues restent lisibles");
    fireEvent.click(screen.getByRole("button", { name: /Republier/ }));
    expect(screen.getByTestId("republish-dialog").textContent).toBe("s1");
  });

  it("encart de la garde annulée, rien pour une annonce ouverte", () => {
    render(<ClosedSitOwnerNotice sitId="s2" status="cancelled" />);
    expect(screen.getByTestId("closed-sit-owner-notice").textContent).toContain("Cette garde est annulée");
    cleanup();
    render(<ClosedSitOwnerNotice sitId="s3" status="published" />);
    expect(screen.queryByTestId("closed-sit-owner-notice")).toBeNull();
    expect(closedSitNotice("draft")).toBeNull();
  });

  it("textes sans tiret long ni mention d'abonnement", () => {
    const all = ["expired", "cancelled"].map((s) => JSON.stringify(closedSitNotice(s))).join(" ");
    expect(all).not.toMatch(/[–—]/);
    expect(all.toLowerCase()).not.toMatch(/abonnement|payant/);
  });

  it("monté sur la fiche propriétaire, et Mes annonces ouvre la fiche annulée à son auteur", () => {
    expect(read("src/components/sits/views/OwnerSitView.tsx")).toContain("<ClosedSitOwnerNotice sitId={sit.id}");
    const sits = read("src/pages/Sits.tsx");
    expect(sits).toContain('(isOwner || sit.status !== "cancelled")');
    expect(sits).not.toContain("canOpenSitPage(sit)");
  });
});

describe("X3a, A-06 : rappels avant la garde seulement avec un gardien retenu", () => {
  it("garde confirmée et gardien retenu", () => {
    expect(shouldSendPreSitReminder("confirmed", ["sitter-1"])).toBe(true);
    expect(shouldSendPreSitReminder("confirmed", [])).toBe(false);
    expect(shouldSendPreSitReminder("confirmed", [null, ""])).toBe(false);
    expect(shouldSendPreSitReminder("published", ["sitter-1"])).toBe(false);
    expect(shouldSendPreSitReminder("published", [])).toBe(false);
    expect(PRE_SIT_REMINDER_STATUSES).toEqual(["confirmed"]);
  });

  it("send-sit-reminders ne lit plus les annonces publiées et vérifie le gardien retenu", () => {
    const src = read("supabase/functions/send-sit-reminders/index.ts");
    expect(src).not.toContain('.in("status", ["confirmed", "published"])');
    expect(src).toContain('.in("status", [...PRE_SIT_REMINDER_STATUSES])');
    expect(src).toContain("if (!shouldSendPreSitReminder(sit.status, acceptedSitterIds)) continue;");
    // Vérification avant toute notification du propriétaire.
    expect(src.indexOf("shouldSendPreSitReminder(sit.status")).toBeLessThan(src.indexOf("// Notify owner"));
  });

  it("le module partagé reste pur (aucune variable Deno)", () => {
    expect(read("supabase/functions/_shared/sit-reminders.ts")).not.toMatch(/Deno\./);
  });
});

describe("X3a, A-08 : avis après archivage d'une garde terminée", () => {
  const now = new Date("2026-10-13T10:00:00");
  it("terminée, ou archivée avec une date de fin passée", () => {
    expect(isSitReviewable({ status: "completed", end_date: "2026-10-20" }, now)).toBe(true);
    expect(isSitReviewable({ status: "archived", end_date: "2026-08-16" }, now)).toBe(true);
    expect(isSitReviewable({ status: "archived", end_date: "2026-10-13" }, now)).toBe(false);
    expect(isSitReviewable({ status: "archived", end_date: null }, now)).toBe(false);
    expect(isSitReviewable({ status: "confirmed", end_date: "2026-08-16" }, now)).toBe(false);
    expect(isSitReviewable(null, now)).toBe(false);
  });

  it("LeaveReview teste le statut avant la personne évaluée", () => {
    const src = read("src/pages/LeaveReview.tsx");
    expect(src).toContain('.select("id, status, title, user_id, end_date")');
    expect(src).not.toContain('sitData.status !== "completed"');
    const statusGate = src.indexOf("if (sit && !isSitReviewable(sit))");
    const notFound = src.indexOf("if (!sit || !reviewee) return");
    expect(statusGate).toBeGreaterThan(0);
    expect(notFound).toBeGreaterThan(statusGate);
  });
});
