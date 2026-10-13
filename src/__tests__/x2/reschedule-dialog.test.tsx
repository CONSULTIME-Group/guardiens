/**
 * Lot X2 : la boîte « Reporter » (RescheduleMissionDialog), rendu avec
 * Supabase simulé. Aucune base réelle.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDaysIso, localIsoDay } from "@/lib/missionReschedule";

const { updates, eqs, toastMock, trackMock, nextRow } = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; patch: unknown }>,
  eqs: [] as Array<[string, unknown]>,
  toastMock: vi.fn(),
  trackMock: vi.fn(),
  nextRow: { value: { data: { id: "m1" } as unknown, error: null as unknown } },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      Object.assign(chain, {
        update: (patch: unknown) => { updates.push({ table, patch }); return chain; },
        eq: (col: string, val: unknown) => { eqs.push([col, val]); return chain; },
        select: () => chain,
        maybeSingle: () => Promise.resolve(nextRow.value),
      });
      return chain;
    },
  },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: trackMock }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import RescheduleMissionDialog from "@/components/missions/RescheduleMissionDialog";

const today = localIsoDay();
const yesterday = addDaysIso(today, -1);
const inTenDays = addDaysIso(today, 10);

const renderDialog = (mission: Record<string, unknown>, onSaved = vi.fn(), onOpenChange = vi.fn()) => {
  render(
    <RescheduleMissionDialog
      open
      onOpenChange={onOpenChange}
      mission={{ id: "m1", user_id: "author", ...mission } as any}
      onSaved={onSaved}
    />,
  );
  return { onSaved, onOpenChange };
};

beforeEach(() => {
  updates.length = 0;
  eqs.length = 0;
  toastMock.mockClear();
  trackMock.mockClear();
  nextRow.value = { data: { id: "m1" }, error: null };
});
afterEach(cleanup);

describe("Reporter un besoin", () => {
  it("ouvre une boîte avec un champ date limité à aujourd'hui et après", () => {
    renderDialog({ date_needed: "2026-01-01", end_date: null });
    expect(screen.getByText("Choisir une nouvelle date")).toBeTruthy();
    const input = screen.getByLabelText("Nouvelle date") as HTMLInputElement;
    expect(input.type).toBe("date");
    expect(input.min).toBe(today);
    // Sans période, pas de champ de fin.
    expect(screen.queryByLabelText("Fin de période")).toBeNull();
  });

  it("refuse une date vide ou passée, sans écrire en base", () => {
    renderDialog({ date_needed: "2026-01-01", end_date: null });
    fireEvent.click(screen.getByText("Enregistrer la date"));
    expect(screen.getByRole("alert").textContent).toBe("Choisissez la nouvelle date.");
    fireEvent.change(screen.getByLabelText("Nouvelle date"), { target: { value: yesterday } });
    fireEvent.click(screen.getByText("Enregistrer la date"));
    expect(screen.getByRole("alert").textContent).toBe("Choisissez une date à partir d'aujourd'hui.");
    expect(updates).toHaveLength(0);
  });

  it("enregistre la nouvelle date sur la ligne de l'auteur et confirme", async () => {
    const { onSaved, onOpenChange } = renderDialog({ date_needed: "2026-01-01", end_date: null });
    fireEvent.change(screen.getByLabelText("Nouvelle date"), { target: { value: inTenDays } });
    fireEvent.click(screen.getByText("Enregistrer la date"));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ date_needed: inTenDays, end_date: null }));
    expect(updates).toEqual([{ table: "small_missions", patch: { date_needed: inTenDays, end_date: null } }]);
    expect(eqs).toEqual(expect.arrayContaining([["id", "m1"], ["user_id", "author"]]));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Nouvelle date enregistrée" }));
    expect(trackMock).toHaveBeenCalledWith("mission_rescheduled", expect.anything());
  });

  it("un besoin avec période propose la même durée et l'écrit", async () => {
    const { onSaved } = renderDialog({ date_needed: "2026-01-01", end_date: "2026-01-04" });
    fireEvent.change(screen.getByLabelText("Nouvelle date de début"), { target: { value: inTenDays } });
    const end = screen.getByLabelText("Fin de période") as HTMLInputElement;
    expect(end.value).toBe(addDaysIso(inTenDays, 3));
    fireEvent.click(screen.getByText("Enregistrer la date"));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ date_needed: inTenDays, end_date: addDaysIso(inTenDays, 3) }));
  });

  it("une écriture refusée garde la boîte ouverte et le dit", async () => {
    nextRow.value = { data: null, error: { message: "refus" } };
    const { onSaved, onOpenChange } = renderDialog({ date_needed: "2026-01-01", end_date: null });
    fireEvent.change(screen.getByLabelText("Nouvelle date"), { target: { value: inTenDays } });
    fireEvent.click(screen.getByText("Enregistrer la date"));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Date non enregistrée" })));
    expect(onSaved).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
