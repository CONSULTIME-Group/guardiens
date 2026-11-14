import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(`supabase/functions/${f}/index.ts`, "utf8");
const senders = ["send-mass-email", "process-mass-email-queue", "send-mass-email-proximity", "send-transactional-email"];

describe("MAIL2, un seul pixel d'ouverture, le nôtre", () => {
  it("aucun envoi ne demande le suivi d'ouverture de Resend", () => {
    for (const f of senders) expect(read(f), f).not.toMatch(/opens:\s*true/);
  });
  it("les trois envois groupés posent le pixel maison", () => {
    for (const f of senders.slice(0, 3)) expect(read(f), f).toContain("massOpenPixelHtml(");
  });
  it("le pixel alimente les colonnes que le webhook Resend tenait", () => {
    const p = read("track-email-pixel");
    expect(p).toContain(".from('email_send_log').update(");
    expect(p).toContain(".from('mass_email_sends').update(");
    expect(p).toContain("first_opened_at");
  });
  it("le réglage du domaine sait couper le suivi d'ouverture", () => {
    expect(read("admin-resend-domain-tracking")).toContain("open_tracking: action === 'enable-open'");
  });
});
