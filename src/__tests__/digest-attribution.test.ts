import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  captureDigestAttribution,
  readDigestAttribution,
  clearDigestAttribution,
} from "@/lib/digestAttribution";

const SIT = "11111111-1111-1111-1111-111111111111";

const setUrl = (search: string) => {
  Object.defineProperty(window, "location", {
    value: new URL(`https://x/annonces/${SIT}${search}`),
    writable: true,
  });
};

describe("digestAttribution", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("capture stores attribution when utm_campaign matches", () => {
    setUrl("?utm_campaign=sitter_daily_digest&utm_source=email&email_id=abc");
    const attr = captureDigestAttribution(SIT);
    expect(attr?.sit_id).toBe(SIT);
    expect(attr?.email_id).toBe("abc");
    expect(readDigestAttribution(SIT)).not.toBeNull();
  });

  it("does nothing when utm_campaign is missing", () => {
    setUrl("?other=1");
    expect(captureDigestAttribution(SIT)).toBeNull();
    expect(readDigestAttribution(SIT)).toBeNull();
  });

  it("readDigestAttribution returns null for a different sit", () => {
    setUrl("?utm_campaign=sitter_daily_digest");
    captureDigestAttribution(SIT);
    expect(readDigestAttribution("other-uuid")).toBeNull();
  });

  it("expires attribution after 24h", () => {
    setUrl("?utm_campaign=sitter_daily_digest");
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    captureDigestAttribution(SIT);
    vi.setSystemTime(now + 25 * 60 * 60 * 1000);
    expect(readDigestAttribution(SIT)).toBeNull();
  });

  it("clearDigestAttribution removes stored data", () => {
    setUrl("?utm_campaign=sitter_daily_digest");
    captureDigestAttribution(SIT);
    clearDigestAttribution();
    expect(readDigestAttribution(SIT)).toBeNull();
  });
});
