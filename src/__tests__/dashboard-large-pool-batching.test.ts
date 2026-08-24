import { describe, expect, it } from "vitest";
import { chunkArray } from "@/lib/chunkArray";

describe("découpage des grands viviers du dashboard", () => {
  it("conserve tous les identifiants dans des lots bornés", () => {
    const ids = Array.from({ length: 1_037 }, (_, index) => `user-${index}`);
    const batches = chunkArray(ids, 50);

    expect(batches.flat()).toEqual(ids);
    expect(Math.max(...batches.map((batch) => batch.length))).toBe(50);
    expect(batches).toHaveLength(21);
  });

  it("refuse une taille de lot invalide", () => {
    expect(() => chunkArray(["user-1"], 0)).toThrow();
  });
});