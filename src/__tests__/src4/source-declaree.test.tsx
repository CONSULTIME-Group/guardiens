/**
 * Verrou du lot SRC4 (16/11/2026) : « Comment avez-vous connu Guardiens ? ».
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import DeclaredSourceQuestion from "@/components/onboarding/DeclaredSourceQuestion";
import {
  DECLARED_SOURCE_LABELS,
  DECLARED_SOURCE_VALUES,
  declaredSourceLabel,
  normalizeDeclaredSourceRows,
  recordDeclaredSource,
  type DeclaredSource,
} from "@/lib/declaredSource";

const root = resolve(__dirname, "../../..");
const migration = readFileSync(resolve(root, "drizzle/migrations/0176_src4_source_declaree.sql"), "utf8");

describe("valeurs de la réponse", () => {
  it("la migration contrôle exactement les valeurs du site, dans la table et dans la fonction", () => {
    const lists = [...migration.matchAll(/answer IN \(([^)]*)\)|p_answer NOT IN \(([^)]*)\)/g)].map((m) =>
      (m[1] ?? m[2]).match(/'([a-z_]+)'/g)!.map((v) => v.replace(/'/g, "")),
    );
    expect(lists).toHaveLength(2);
    for (const list of lists) expect(list).toEqual([...DECLARED_SOURCE_VALUES]);
  });

  it("chaque valeur a un libellé, sans tiret long", () => {
    for (const v of DECLARED_SOURCE_VALUES) {
      expect(DECLARED_SOURCE_LABELS[v]).toBeTruthy();
      expect(DECLARED_SOURCE_LABELS[v]).not.toMatch(/[—–]/);
    }
    expect(declaredSourceLabel(null)).toBe("Sans réponse");
  });

  it("table fermée aux membres, écriture par le membre connecté, lecture réservée à l'équipe", () => {
    expect(migration).toMatch(/REVOKE ALL ON TABLE public\.profile_declared_sources FROM PUBLIC, anon, authenticated/);
    expect(migration).toMatch(/ON CONFLICT \(user_id\) DO NOTHING/);
    expect(migration).toMatch(/v_uid uuid := auth\.uid\(\)/);
    expect(migration).toMatch(/has_role\(auth\.uid\(\), 'admin'::public\.app_role\)/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.record_declared_source\(text, text\) TO authenticated, service_role/);
  });

  it("contrat de production présent", () => {
    const contracts = readFileSync(resolve(root, "scripts/db/production-contracts.json"), "utf8");
    expect(contracts).toContain("0176_src4_source_declaree.sql");
  });
});

describe("enregistrement", () => {
  it("n'appelle rien sans réponse ou hors liste, et ne lève jamais", async () => {
    const rpc = vi.fn();
    expect(await recordDeclaredSource({ rpc }, null, "accueil")).toBe(false);
    expect(await recordDeclaredSource({ rpc }, "inconnu" as DeclaredSource, "accueil")).toBe(false);
    expect(rpc).not.toHaveBeenCalled();

    const failing = { rpc: vi.fn().mockRejectedValue(new Error("réseau")) };
    expect(await recordDeclaredSource(failing, "tiktok", "accueil")).toBe(false);

    const ok = { rpc: vi.fn().mockResolvedValue({ data: true, error: null }) };
    expect(await recordDeclaredSource(ok, "tiktok", "accueil")).toBe(true);
    expect(ok.rpc).toHaveBeenCalledWith("record_declared_source", { p_answer: "tiktok", p_context: "accueil" });
  });

  it("lecture admin normalisée et triée", () => {
    expect(normalizeDeclaredSourceRows([{ answer: "tiktok", members: 2, with_published_sit: 1 }, { answer: "google", members: "5" }])).toEqual([
      { answer: "google", members: 5, with_published_sit: 0 },
      { answer: "tiktok", members: 2, with_published_sit: 1 },
    ]);
    expect(normalizeDeclaredSourceRows(null)).toEqual([]);
  });
});

describe("question à l'écran", () => {
  function Harness() {
    const [v, setV] = useState<DeclaredSource | null>(null);
    return (
      <>
        <DeclaredSourceQuestion value={v} onChange={setV} />
        <output data-testid="value">{v ?? "aucune"}</output>
      </>
    );
  }

  it("une seule réponse, retirable d'un second toucher", () => {
    render(<Harness />);
    expect(screen.getByRole("heading", { name: "Comment avez-vous connu Guardiens ?" })).toBeTruthy();
    const tiktok = screen.getByRole("radio", { name: "TikTok" });
    fireEvent.click(tiktok);
    expect(screen.getByTestId("value").textContent).toBe("tiktok");
    fireEvent.click(screen.getByRole("radio", { name: "Instagram" }));
    expect(screen.getByTestId("value").textContent).toBe("instagram");
    expect(screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-checked") === "true")).toHaveLength(1);
    fireEvent.click(screen.getByRole("radio", { name: "Instagram" }));
    expect(screen.getByTestId("value").textContent).toBe("aucune");
  });

  it("l'accueil pose la question et l'enregistre sans bloquer", () => {
    const page = readFileSync(resolve(root, "src/pages/OnboardingAffinity.tsx"), "utf8");
    expect(page).toContain("<DeclaredSourceQuestion");
    expect(page).toMatch(/recordDeclaredSource\(supabase as any, declaredSource, "accueil"\)/);
    expect(page.indexOf("recordDeclaredSource(")).toBeLessThan(page.indexOf("completedRef.current = true"));
  });
});
