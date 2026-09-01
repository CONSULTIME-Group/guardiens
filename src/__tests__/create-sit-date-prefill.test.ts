/**
 * Vérifie le préremplissage des dates de garde depuis l'email saisonnier.
 * Test pur : miroir de parsePrefillDate et des conditions de prefill.
 */
import { describe, it, expect } from "vitest";
import { parsePrefillDate } from "@/pages/CreateSit";

function tomorrow(offsetDays = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

describe("parsePrefillDate", () => {
  it("accepte une date valide au format YYYY-MM-DD", () => {
    expect(parsePrefillDate("2026-10-17")).toBe("2026-10-17");
  });

  it("ignore un paramètre absent", () => {
    expect(parsePrefillDate(null)).toBeNull();
  });

  it("ignore un format non ISO", () => {
    expect(parsePrefillDate("17/10/2026")).toBeNull();
    expect(parsePrefillDate("2026-10")).toBeNull();
    expect(parsePrefillDate("not-a-date")).toBeNull();
  });

  it("ignore une date dans le passé", () => {
    expect(parsePrefillDate(yesterday())).toBeNull();
  });

  it("ignore une date invalide", () => {
    expect(parsePrefillDate("2026-02-30")).toBeNull();
  });

  it("accepte aujourd'hui et demain", () => {
    expect(parsePrefillDate(tomorrow(0))).toBe(tomorrow(0));
    expect(parsePrefillDate(tomorrow())).toBe(tomorrow());
  });
});

interface PrefillCtx {
  loading: boolean;
  datePrefilled: boolean;
  draftIdParam?: string | null;
  fromSitId?: string | null;
  republishMode?: "copy" | "adapt" | null;
  resume?: string | null;
  formEmpty: boolean;
  debut: string | null;
  fin: string | null;
}

function shouldPrefill(c: PrefillCtx): { start: string | null; end: string | null } {
  if (c.datePrefilled || c.loading) return { start: null, end: null };
  if (c.draftIdParam || c.fromSitId || c.republishMode || c.resume) return { start: null, end: null };
  if (!c.formEmpty) return { start: null, end: null };
  const start = parsePrefillDate(c.debut);
  const end = parsePrefillDate(c.fin);
  return {
    start,
    end: end && (!start || end >= start) ? end : null,
  };
}

describe("CreateSit date prefill logic", () => {
  const base: PrefillCtx = {
    loading: false,
    datePrefilled: false,
    formEmpty: true,
    debut: null,
    fin: null,
  };

  it("préremplit debut et fin quand les deux sont valides", () => {
    const start = tomorrow();
    const end = tomorrow(7);
    const result = shouldPrefill({ ...base, debut: start, fin: end });
    expect(result.start).toBe(start);
    expect(result.end).toBe(end);
  });

  it("préremplit seulement debut quand fin est absente", () => {
    const start = tomorrow();
    const result = shouldPrefill({ ...base, debut: start });
    expect(result.start).toBe(start);
    expect(result.end).toBeNull();
  });

  it("ignore fin si elle est avant debut", () => {
    const start = tomorrow(7);
    const end = tomorrow();
    const result = shouldPrefill({ ...base, debut: start, fin: end });
    expect(result.start).toBe(start);
    expect(result.end).toBeNull();
  });

  it("ne préremplit pas quand le formulaire n'est plus vierge", () => {
    const result = shouldPrefill({ ...base, formEmpty: false, debut: tomorrow(), fin: tomorrow(7) });
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });

  it("ne préremplit pas quand un brouillon est repris", () => {
    const result = shouldPrefill({ ...base, draftIdParam: "abc", debut: tomorrow(), fin: tomorrow(7) });
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });

  it("ne préremplit pas quand resume est present", () => {
    const result = shouldPrefill({ ...base, resume: "xyz", debut: tomorrow(), fin: tomorrow(7) });
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });

  it("ne préremplit pas en mode republish", () => {
    const result = shouldPrefill({ ...base, fromSitId: "s1", republishMode: "copy", debut: tomorrow(), fin: tomorrow(7) });
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });

  it("ne préremplit qu'une seule fois", () => {
    const result = shouldPrefill({ ...base, datePrefilled: true, debut: tomorrow(), fin: tomorrow(7) });
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });
});
