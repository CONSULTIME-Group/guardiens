import { describe, it, expect } from "vitest";
import { normalizeCanonical } from "@/lib/seo";

describe("normalizeCanonical", () => {
  describe("nullish & empty", () => {
    it("returns null for undefined", () => {
      expect(normalizeCanonical(undefined)).toBeNull();
    });
    it("returns null for null", () => {
      expect(normalizeCanonical(null)).toBeNull();
    });
    it("returns null for empty string", () => {
      expect(normalizeCanonical("")).toBeNull();
    });
    it("returns null for whitespace-only", () => {
      expect(normalizeCanonical("   \n\t  ")).toBeNull();
    });
  });

  describe("whitespace handling", () => {
    it("trims leading and trailing spaces", () => {
      expect(normalizeCanonical("  https://guardiens.fr/lyon  ")).toBe(
        "https://guardiens.fr/lyon",
      );
    });
    it("trims newlines and tabs", () => {
      expect(normalizeCanonical("\n\thttps://guardiens.fr/annecy\n")).toBe(
        "https://guardiens.fr/annecy",
      );
    });
  });

  describe("relative URLs", () => {
    it("resolves a root-relative path against SITE_URL", () => {
      expect(normalizeCanonical("/house-sitting/lyon")).toBe(
        "https://guardiens.fr/house-sitting/lyon",
      );
    });
    it("resolves a bare path (no leading slash)", () => {
      expect(normalizeCanonical("house-sitting/grenoble")).toBe(
        "https://guardiens.fr/house-sitting/grenoble",
      );
    });
    it("resolves the root path", () => {
      expect(normalizeCanonical("/")).toBe("https://guardiens.fr/");
    });
  });

  describe("duplicate slashes", () => {
    it("collapses duplicate slashes inside the path", () => {
      expect(normalizeCanonical("https://guardiens.fr//house-sitting///lyon")).toBe(
        "https://guardiens.fr/house-sitting/lyon",
      );
    });
    it("collapses duplicate slashes on relative paths", () => {
      expect(normalizeCanonical("/actualites///foo")).toBe(
        "https://guardiens.fr/actualites/foo",
      );
    });
  });

  describe("trailing slash", () => {
    it("strips trailing slash on non-root paths", () => {
      expect(normalizeCanonical("https://guardiens.fr/house-sitting/lyon/")).toBe(
        "https://guardiens.fr/house-sitting/lyon",
      );
    });
    it("strips multiple trailing slashes", () => {
      expect(normalizeCanonical("https://guardiens.fr/lyon///")).toBe(
        "https://guardiens.fr/lyon",
      );
    });
    it("preserves trailing slash for root", () => {
      expect(normalizeCanonical("https://guardiens.fr/")).toBe(
        "https://guardiens.fr/",
      );
    });
  });

  describe("query string & hash", () => {
    it("drops the query string", () => {
      expect(normalizeCanonical("https://guardiens.fr/lyon?utm_source=google")).toBe(
        "https://guardiens.fr/lyon",
      );
    });
    it("drops the hash fragment", () => {
      expect(normalizeCanonical("https://guardiens.fr/lyon#section")).toBe(
        "https://guardiens.fr/lyon",
      );
    });
    it("drops both query and hash", () => {
      expect(
        normalizeCanonical("https://guardiens.fr/lyon/?ref=foo&x=1#anchor"),
      ).toBe("https://guardiens.fr/lyon");
    });
  });

  describe("invalid input → null (caller falls back to currentUrl)", () => {
    it("returns null for non-http(s) protocols", () => {
      expect(normalizeCanonical("javascript:alert(1)")).toBeNull();
      expect(normalizeCanonical("ftp://guardiens.fr/lyon")).toBeNull();
      expect(normalizeCanonical("mailto:foo@bar.com")).toBeNull();
    });
    it("returns null for malformed URLs", () => {
      // 'http://' alone is not a valid URL
      expect(normalizeCanonical("http://")).toBeNull();
    });
  });

  describe("cross-origin canonicals", () => {
    it("preserves the original origin (does not force SITE_URL)", () => {
      expect(normalizeCanonical("https://other-domain.com/page/")).toBe(
        "https://other-domain.com/page",
      );
    });
  });
});
