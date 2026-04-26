import { describe, it, expect } from "vitest";
import { getOgImageForSit, getOgImageAbsoluteUrl, OG_SIT_IMAGES_LIST } from "../ogImages";

describe("getOgImageForSit", () => {
  it("retourne toujours la même image pour un ID donné (stable)", () => {
    const id = "293fab2e-b32d-45a0-9c04-36a4f43c484f";
    const a = getOgImageForSit(id);
    const b = getOgImageForSit(id);
    const c = getOgImageForSit(id);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(OG_SIT_IMAGES_LIST).toContain(a as any);
  });

  it("fallback sur la 1re image si ID null/undefined/vide", () => {
    expect(getOgImageForSit(null)).toBe(OG_SIT_IMAGES_LIST[0]);
    expect(getOgImageForSit(undefined)).toBe(OG_SIT_IMAGES_LIST[0]);
    expect(getOgImageForSit("")).toBe(OG_SIT_IMAGES_LIST[0]);
  });

  it("répartition raisonnablement uniforme sur 1000 UUIDs simulés", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 1000; i++) {
      const fakeId = `00000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`;
      const img = getOgImageForSit(fakeId);
      counts.set(img, (counts.get(img) || 0) + 1);
    }
    // Chaque image devrait apparaître au moins 100x (idéal 200, on tolère ±50%)
    for (const img of OG_SIT_IMAGES_LIST) {
      const c = counts.get(img) || 0;
      expect(c).toBeGreaterThanOrEqual(100);
      expect(c).toBeLessThanOrEqual(300);
    }
    expect(counts.size).toBe(OG_SIT_IMAGES_LIST.length);
  });

  it("getOgImageAbsoluteUrl construit une URL absolue correcte", () => {
    const url = getOgImageAbsoluteUrl("abc-123", "https://guardiens.fr");
    expect(url).toMatch(/^https:\/\/guardiens\.fr\/og\/og-sit-[1-5]\.jpg$/);
  });

  it("URL absolue stable pour un même ID", () => {
    expect(getOgImageAbsoluteUrl("xyz", "https://guardiens.fr")).toBe(
      getOgImageAbsoluteUrl("xyz", "https://guardiens.fr"),
    );
  });
});
