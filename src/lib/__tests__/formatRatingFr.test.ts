import { describe, it, expect } from "vitest";
import { formatRatingFr } from "@/lib/formatRatingFr";
describe("formatRatingFr", () => {
  it("virgule française", () => {
    expect(formatRatingFr(5)).toBe("5,0");
    expect(formatRatingFr(4.75)).toBe("4,8");
  });
});
