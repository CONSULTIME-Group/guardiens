/** Lot DIFF1 : la diffusion dit combien de gardiens du rayon sont déjà prévenus. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { proximityReachLine } from "@/lib/admin/proximityReach";

describe("DIFF1, phrase de portée", () => {
  it("rien quand personne n'est déjà prévenu", () => {
    expect(proximityReachLine(4, 0)).toBeNull();
    expect(proximityReachLine(0, undefined)).toBeNull();
  });
  it("cas Montcaret : 0 ciblé, 2 déjà prévenus", () => {
    expect(proximityReachLine(0, 2)).toBe("2 gardiens dans le rayon, tous déjà prévenus de cette annonce. Élargissez le rayon pour en toucher d'autres.");
    expect(proximityReachLine(0, 1)).toBe("1 gardien dans le rayon, déjà prévenu de cette annonce. Élargissez le rayon pour en toucher d'autres.");
  });
  it("cas mixte", () => {
    expect(proximityReachLine(3, 1)).toBe("4 gardiens dans le rayon, dont 1 déjà prévenu de cette annonce.");
  });
  it("les deux fenêtres de diffusion affichent la phrase, sans tiret long", () => {
    for (const f of ["src/components/admin/signals/BroadcastSitDialog.tsx", "src/components/admin/ListingProximityCard.tsx"]) {
      expect(readFileSync(f, "utf8"), f).toContain("proximityReachLine(preview.count, preview.excluded_recent)");
    }
    expect(readFileSync("src/lib/admin/proximityReach.ts", "utf8")).not.toMatch(/[—–]/);
  });
});
