import { beforeEach, describe, expect, it, vi } from "vitest";

const report = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cookieConsent", () => ({ reportSignupConversion: report }));
import { reportConfirmedOwnerSignup } from "@/lib/ownerSignupConversion";

const now = Date.parse("2026-10-31T09:16:00Z");
const user = {
  id: "new-owner",
  email_confirmed_at: new Date(now - 1000).toISOString(),
  last_sign_in_at: new Date(now - 1000).toISOString(),
};

describe("Google Ads successful owner signup", () => {
  beforeEach(() => report.mockClear());

  it("counts a confirmed owner after role resolution", () => {
    reportConfirmedOwnerSignup(user, "owner", now);
    expect(report).toHaveBeenCalledExactlyOnceWith("new-owner");
  });
  it("counts a confirmed dual role including owner", () => {
    reportConfirmedOwnerSignup(user, "both", now);
    expect(report).toHaveBeenCalledExactlyOnceWith("new-owner");
  });
  it("does not count a successful form awaiting email confirmation", () => {
    reportConfirmedOwnerSignup({ id: user.id }, "owner", now);
    expect(report).not.toHaveBeenCalled();
  });
  it("does not count a sitter choice", () => {
    reportConfirmedOwnerSignup(user, "sitter", now);
    expect(report).not.toHaveBeenCalled();
  });
  it("does not count before the role is resolved", () => {
    reportConfirmedOwnerSignup(user, "", now);
    expect(report).not.toHaveBeenCalled();
  });
  it("does not count later sign-ins or recovery of an existing account", () => {
    reportConfirmedOwnerSignup({ ...user, email_confirmed_at: "2026-10-30T09:16:00Z" }, "owner", now);
    expect(report).not.toHaveBeenCalled();
  });
  it("counts email confirmation independently of the account creation date", () => {
    reportConfirmedOwnerSignup({ ...user, created_at: "2026-10-20T09:16:00Z" } as typeof user, "owner", now);
    expect(report).toHaveBeenCalledExactlyOnceWith("new-owner");
  });
  it("does not count invalid or future confirmation", () => {
    reportConfirmedOwnerSignup({ ...user, email_confirmed_at: "invalid" }, "owner", now);
    reportConfirmedOwnerSignup({ ...user, email_confirmed_at: new Date(now + 1000).toISOString() }, "owner", now);
    expect(report).not.toHaveBeenCalled();
  });
});