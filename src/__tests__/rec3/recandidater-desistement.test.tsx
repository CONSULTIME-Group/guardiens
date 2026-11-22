/**
 * Lot REC3, parties 2 et 3 : recandidater après une candidature annulée,
 * libérer sa place quand on a été retenu pour un coup de main.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import ClosedApplicationCard, { closedApplicationLine, closedApplicationTitle } from "@/components/sits/ClosedApplicationCard";

const read = (p: string) => readFileSync(p, "utf8");

describe("REC3, candidature close", () => {
  it("le titre porte le jour de Paris de la candidature", () => {
    expect(closedApplicationTitle("2026-11-12T09:30:00Z")).toBe("Votre candidature du 12 novembre est close");
    expect(closedApplicationTitle("2026-11-12T23:30:00Z")).toBe("Votre candidature du 13 novembre est close");
    expect(closedApplicationTitle(null)).toBe("Votre candidature est close");
  });

  it("la phrase suit le statut et l'état de l'annonce", () => {
    expect(closedApplicationLine("cancelled", true, "Claire")).toBe("L'annonce de Claire est toujours ouverte.");
    expect(closedApplicationLine("cancelled", false, "Claire")).toBe("Cette annonce a refermé ses candidatures.");
    expect(closedApplicationLine("rejected", true, "Claire")).toBe("Claire peut la rouvrir depuis son annonce.");
  });

  it("candidature annulée sur annonce ouverte : « Candidater de nouveau »", () => {
    const onReapply = vi.fn();
    render(<MemoryRouter><ClosedApplicationCard status="cancelled" createdAt="2026-11-12T09:30:00Z" ownerFirstName="Claire" canReapply onReapply={onReapply} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Candidater de nouveau" }));
    expect(onReapply).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Candidature envoyée/)).toBeNull();
  });

  it("candidature déclinée : la réouverture reste au propriétaire", () => {
    render(<MemoryRouter><ClosedApplicationCard status="rejected" createdAt="2026-11-12T09:30:00Z" ownerFirstName="Claire" canReapply onReapply={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Candidater de nouveau" })).toBeNull();
    expect(screen.getByRole("link", { name: /Voir d'autres gardes/ }).getAttribute("href")).toBe("/search");
  });

  it("la fiche et la fenêtre de candidature sont branchées", () => {
    const view = read("src/components/sits/views/SitterSitView.tsx");
    expect(view).toContain('const canReapply = hasApplied && myApplicationStatus === "cancelled" && sit.status === "published" && canStillApply;');
    expect(view).toContain(") : applicationClosed ? (");
    expect(view.indexOf(") : applicationClosed ? (")).toBeLessThan(view.indexOf(") : hasApplied ? ("));
    expect(view).toContain("reapply={canReapply}");
    const modal = read("src/components/sits/ApplicationModal.tsx");
    expect(modal).toContain('"reapply_to_sit", { p_sit_id: sitId, p_message: message.trim() }');
  });
});

describe("REC3, désistement d'un membre retenu", () => {
  it("la fiche du besoin propose de libérer sa place et passe par la fonction", () => {
    const page = read("src/pages/SmallMissionDetail.tsx");
    expect(page).toContain("Un empêchement ? Je libère ma place");
    expect(page).toContain('"withdraw_my_accepted_response", { p_mission_id: mission.id }');
  });
});

describe("REC3, migration 0182", () => {
  const sql = read("drizzle/migrations/0182_rec3_trois_impasses.sql");
  it("recandidater remplace la candidature annulée du membre connecté, jamais une autre", () => {
    expect(sql).toContain("a.sitter_id = v_uid");
    expect(sql).toContain("a.status = 'cancelled'::application_status");
    expect(sql).toMatch(/DELETE FROM public\.applications WHERE id = v_old;\s+INSERT INTO public\.applications \(sit_id, sitter_id, message, status\)\s+VALUES \(p_sit_id, v_uid, v_msg, 'pending'/);
  });
  it("le désistement n'ouvre que le passage accepted vers withdrawn, par son auteur", () => {
    const flags = sql.match(/current_setting\('guardiens\.accepted_withdrawal', true\) = 'on'[\s\S]{0,460}?RETURN NEW;/g) ?? [];
    expect(flags.length).toBe(2);
    for (const f of flags) {
      expect(f).toMatch(/OLD\.status = 'accepted'/);
      expect(f).toMatch(/NEW\.status = 'withdrawn'/);
      expect(f).toContain("auth.uid() = OLD.responder_id");
    }
    expect(sql).toContain("PERFORM set_config('guardiens.accepted_withdrawal', 'off', true);");
  });
  it("les deux fonctions sont fermées aux visiteurs", () => {
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.reapply_to_sit(uuid, text) FROM PUBLIC, anon;");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.withdraw_my_accepted_response(uuid) FROM PUBLIC, anon;");
  });
  it("le contrat de production suit la migration", () => {
    const contracts = JSON.parse(read("scripts/db/production-contracts.json"));
    const c = contracts.contracts.find((x: { migration: string }) => x.migration === "0182_rec3_trois_impasses.sql");
    expect(c?.checks?.length).toBe(3);
  });
});
