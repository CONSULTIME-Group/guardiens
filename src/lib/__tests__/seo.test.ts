import { describe, it, expect } from "vitest";
import { normalizePathname, buildAbsoluteUrl } from "../seo";

describe("normalizePathname", () => {
  it("returns / for empty or root", () => {
    expect(normalizePathname("")).toBe("/");
    expect(normalizePathname("/")).toBe("/");
  });

  it("strips trailing slashes", () => {
    expect(normalizePathname("/about/")).toBe("/about");
    expect(normalizePathname("/a/b/c///")).toBe("/a/b/c");
  });

  it("strips query and hash", () => {
    expect(normalizePathname("/page?foo=1")).toBe("/page");
    expect(normalizePathname("/page#section")).toBe("/page");
  });

  it("deduplicates slashes", () => {
    expect(normalizePathname("//about///us")).toBe("/about/us");
  });
});

describe("buildAbsoluteUrl", () => {
  it("builds full URL from path", () => {
    expect(buildAbsoluteUrl("/contact")).toBe("https://guardiens.fr/contact");
  });

  it("handles root", () => {
    expect(buildAbsoluteUrl("/")).toBe("https://guardiens.fr/");
  });
});
