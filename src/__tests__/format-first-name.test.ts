import { describe, it, expect } from "vitest";
import { formatFirstName } from "@/lib/formatFirstName";
import { formatFirstName as edge } from "../../supabase/functions/_shared/format-first-name";
const cases: [string | null, string][] = [
  ["jeremie","Jeremie"],["JEREMIE","Jeremie"],["jean-pierre","Jean-Pierre"],["JEAN-PIERRE","Jean-Pierre"],
  ["marie claire","Marie Claire"],["d'artagnan","D'Artagnan"],["élisa","Élisa"],["ÉLISA","Élisa"],
  ["McArthur","McArthur"],["LeBlanc","LeBlanc"],["",""],[null,""],
];
describe("formatFirstName", () => {
  it.each(cases)("%s -> %s", (i, o) => { expect(formatFirstName(i)).toBe(o); expect(edge(i)).toBe(o); });
});
