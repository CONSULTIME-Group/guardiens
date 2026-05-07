import { describe, it, expect } from "vitest";
import { isOwner, isAuthorOf } from "@/lib/ownership";

describe("isOwner", () => {
  it("retourne true pour deux ids non vides strictement égaux", () => {
    expect(isOwner("abc", "abc")).toBe(true);
  });

  it("retourne false si l'un des deux est null/undefined", () => {
    expect(isOwner(null, "abc")).toBe(false);
    expect(isOwner("abc", null)).toBe(false);
    expect(isOwner(undefined, undefined)).toBe(false);
  });

  it("retourne false pour des chaînes vides", () => {
    expect(isOwner("", "")).toBe(false);
    expect(isOwner("abc", "")).toBe(false);
  });

  it("retourne false pour des ids différents", () => {
    expect(isOwner("abc", "xyz")).toBe(false);
  });
});

describe("isAuthorOf", () => {
  it("retourne false si la ressource est null/undefined", () => {
    expect(isAuthorOf("abc", null)).toBe(false);
    expect(isAuthorOf("abc", undefined)).toBe(false);
  });

  it("compare user_id par défaut", () => {
    expect(isAuthorOf("abc", { user_id: "abc" })).toBe(true);
    expect(isAuthorOf("abc", { user_id: "xyz" })).toBe(false);
  });

  it("supporte une clé d'owner personnalisée", () => {
    expect(isAuthorOf("abc", { author_id: "abc" }, "author_id")).toBe(true);
    expect(isAuthorOf("abc", { author_id: "xyz" }, "author_id")).toBe(false);
  });

  it("retourne false si la valeur n'est pas une string", () => {
    expect(isAuthorOf("abc", { user_id: 123 as unknown as string })).toBe(false);
    expect(isAuthorOf("abc", { user_id: null })).toBe(false);
  });
});
