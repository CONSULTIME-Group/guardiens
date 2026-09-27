import { describe, it, expect } from "vitest";
import { entraideCardData } from "../../supabase/functions/_shared/entraide-card-data";
const AV = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/avatars/u/a.jpg";
describe("entraideCardData", () => {
  it("ville en capitale et avatar 112 x 112", () => {
    const d = entraideCardData({ city: "  lyon ", avatar_url: AV });
    expect(d.city).toBe("Lyon");
    expect(d.avatarUrl).toContain("/storage/v1/render/image/public/avatars/u/a.jpg");
    expect(d.avatarUrl).toContain("width=112");
    expect(d.avatarUrl).toContain("height=112");
  });
  it("champs absents quand le profil est vide", () => {
    expect(entraideCardData({ city: " ", avatar_url: null })).toEqual({});
  });
});
