import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isFreeAccessForAll, isPaywallInForce } from "@/lib/pricing";
import { PRICING_IS_ACTIVE, PRICING_ACTIVATION_DATE } from "@/config/pricing";

const now = new Date("2026-10-02T12:00:00Z");

describe("règle de gratuité, sans date codée en dur", () => {
  it("flag false : accès pour tous, même avec une date passée", () => {
    expect(isFreeAccessForAll(false, null, now)).toBe(true);
    expect(isFreeAccessForAll(false, "2026-01-01T00:00:00Z", now)).toBe(true);
  });
  it("flag true + date null : accès pour tous", () => {
    expect(isPaywallInForce(null, now)).toBe(false);
    expect(isFreeAccessForAll(true, null, now)).toBe(true);
  });
  it("flag true + date future : accès pour tous ; date atteinte : payant", () => {
    expect(isFreeAccessForAll(true, "2027-01-01T00:00:00Z", now)).toBe(true);
    expect(isFreeAccessForAll(true, "2026-10-01T00:00:00Z", now)).toBe(false);
  });
  it("date invalide : jamais de payant", () => {
    expect(isFreeAccessForAll(true, "pas une date", now)).toBe(true);
  });
  it("configuration actuelle : gratuité pour tous", () => {
    expect(PRICING_IS_ACTIVE).toBe(false);
    expect(PRICING_ACTIVATION_DATE).toBeNull();
    expect(isFreeAccessForAll()).toBe(true);
  });
  it("les accès ne lisent plus GRACE_END ni de date 2026", () => {
    for (const f of ["src/hooks/useSubscriptionAccess.ts", "src/components/premium/ActivateRoleDialog.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/GRACE_END|FOUNDER_START|isInGracePeriod|isBeforeLaunch|2026-/);
    }
  });
});
