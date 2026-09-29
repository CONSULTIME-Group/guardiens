import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { renderHook, act, render, screen, fireEvent } from "@testing-library/react";
import { usePagedSearch, Pager, PAGE_SIZE } from "@/components/admin/ui";

const rows = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: i === 24 ? "Élodie Vingt-cinq" : `Ligne ${i + 1}` }));

describe("pagination partagée, 25e élément atteignable", () => {
  it("24 par page, la page 2 contient le 25e", () => {
    const { result } = renderHook(() => usePagedSearch(rows, (r) => r.name));
    expect(PAGE_SIZE).toBe(24);
    expect(result.current.visible).toHaveLength(24);
    expect(result.current.total).toBe(25);
    act(() => result.current.setPage(1));
    expect(result.current.visible.map((r) => r.id)).toEqual([25]);
  });

  it("la recherche couvre toute la liste, sans accents, et ramène à la page 1", () => {
    const { result } = renderHook(() => usePagedSearch(rows, (r) => r.name));
    act(() => result.current.setPage(1));
    act(() => result.current.setQuery("elodie"));
    expect(result.current.page).toBe(0);
    expect(result.current.visible.map((r) => r.id)).toEqual([25]);
  });

  it("le Pager affiche « Page 1 sur 2 » et mène à la dernière page", () => {
    let page = 0;
    const { rerender } = render(<Pager page={page} total={25} onPage={(p) => { page = p; }} />);
    expect(screen.getByText(/Page 1 sur 2/)).toBeTruthy();
    fireEvent.click(screen.getByText("Suivante"));
    rerender(<Pager page={page} total={25} onPage={(p) => { page = p; }} />);
    expect(screen.getByText(/Page 2 sur 2/)).toBeTruthy();
  });

  it.each([
    "src/pages/AdminArticles.tsx",
    "src/pages/admin/AdminCityPages.tsx",
    "src/pages/admin/AdminDepartments.tsx",
    "src/pages/admin/AdminGuides.tsx",
  ])("%s rend le Pager partagé", (file) => {
    expect(readFileSync(file, "utf8")).toMatch(/<Pager\s/);
  });

  it("Articles lit toute la table par pages et cherche sans accents", () => {
    const src = readFileSync("src/pages/AdminArticles.tsx", "utf8");
    expect(src).toMatch(/fetchAllRows/);
    expect(src).toMatch(/normalizeSearch/);
    expect(src).not.toMatch(/hsl\(/);
  });
});

function scan(pattern: string): string[] {
  try {
    return execSync(`rg -n '${pattern}' src/pages/admin src/components/admin src/pages/AdminArticles.tsx`, { encoding: "utf8" })
      .split("\n").filter(Boolean);
  } catch (e: any) {
    if (e.status === 1) return [];
    throw e;
  }
}

describe("admin : ni emoji ni tiret long", () => {
  it("aucun emoji", () => {
    expect(scan("[\\x{1F300}-\\x{1FAFF}\\x{2600}-\\x{26FF}\\x{2705}\\x{274C}\\x{2714}\\x{2716}]")).toEqual([]);
  });
  it("aucun tiret cadratin ni demi-cadratin", () => {
    expect(scan("[\\x{2014}\\x{2013}]")).toEqual([]);
  });
});
