import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  validateAdminPersonalInput,
  splitParagraphs,
  adminPersonalLogMetadata,
} from "../../supabase/functions/_shared/admin-personal-message";

const fn = readFileSync("supabase/functions/admin-personal-message/index.ts", "utf8");
const categories = readFileSync("supabase/functions/_shared/email-categories.ts", "utf8");

describe("lot M1, contrôle admin côté serveur", () => {
  it("refuse sans jeton (401) et sans rôle admin (403)", () => {
    expect(fn).toMatch(/if \(!token\) return json\(401/);
    expect(fn).toMatch(/has_role", \{\s*_user_id: userData\.user\.id,\s*_role: "admin"/);
    expect(fn).toMatch(/isAdmin !== true\) return json\(403/);
  });
  it("le contrôle admin précède la lecture du corps et tout envoi", () => {
    expect(fn.indexOf("isAdmin !== true")).toBeLessThan(fn.indexOf("await req.json()"));
    expect(fn.indexOf("isAdmin !== true")).toBeLessThan(fn.indexOf("send-transactional-email"));
  });
  it("n'utilise jamais __urgent et journalise kind admin_personal", () => {
    expect(fn).not.toContain("__urgent");
    expect(fn).toContain("adminPersonalLogMetadata(input.sitId, adminId)");
    expect(adminPersonalLogMetadata("s1", "a1")).toEqual({ kind: "admin_personal", sit_id: "s1", sent_by_admin: "a1" });
  });
  it("catégorie transactionnelle, donc hors plafond de fréquence produit", () => {
    const tx = categories.slice(categories.indexOf("const TRANSACTIONAL"), categories.indexOf("const PRODUCT"));
    expect(tx).toContain("'admin-personal-message'");
  });
});

describe("lot M1, validation", () => {
  const base = { mode: "send", recipientEmail: "a@b.fr", subject: "Objet", body: "Bonjour" };
  it("accepte un envoi minimal", () => {
    expect(validateAdminPersonalInput(base).ok).toBe(true);
  });
  it("exige un destinataire pour l'envoi, pas pour l'aperçu", () => {
    expect(validateAdminPersonalInput({ ...base, recipientEmail: undefined }).ok).toBe(false);
    expect(validateAdminPersonalInput({ ...base, mode: "preview", recipientEmail: undefined }).ok).toBe(true);
  });
  it("lien : libellé et adresse ensemble, https seulement", () => {
    expect(validateAdminPersonalInput({ ...base, linkLabel: "Voir" }).ok).toBe(false);
    expect(validateAdminPersonalInput({ ...base, linkLabel: "Voir", linkUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(validateAdminPersonalInput({ ...base, linkLabel: "Voir", linkUrl: "http://guardiens.fr" }).ok).toBe(false);
    expect(validateAdminPersonalInput({ ...base, linkLabel: "Voir", linkUrl: "https://guardiens.fr/messages" }).ok).toBe(true);
  });
  it("limites de longueur et identifiants", () => {
    expect(validateAdminPersonalInput({ ...base, body: "x".repeat(5001) }).ok).toBe(false);
    expect(validateAdminPersonalInput({ ...base, subject: "x".repeat(201) }).ok).toBe(false);
    expect(validateAdminPersonalInput({ ...base, sitId: "pas-un-uuid" }).ok).toBe(false);
  });
  it("découpe les paragraphes", () => {
    expect(splitParagraphs("A\nB\n\n\nC")).toEqual([["A", "B"], ["C"]]);
  });
});
