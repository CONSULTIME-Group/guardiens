/** Lot STOP1 : un « stop » en réponse à l'équipe coupe les relances. Le comportement se prouve en base (npm run test:sql:stop1). */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("drizzle/migrations/0180_stop1_stop_activation.sql", "utf8");
const bubble = readFileSync("src/components/messages/MessageBubble.tsx", "utf8");

describe("STOP1, stop en réponse à un message de l'équipe", () => {
  it("l'accusé de réception est un message système, au texte validé", () => {
    expect(sql).toContain("'C''est noté. Les relances s''arrêtent, vous avancez à votre rythme.'");
    expect(sql).toContain("jsonb_build_object('kind', 'activation_stop'");
    expect(sql).not.toMatch(/[—–]/);
  });

  it("seuls les emails produit sont coupés", () => {
    expect(sql).toContain("SET product_emails = false");
    expect(sql).not.toMatch(/digest_emails\s*=|alert_emails\s*=|suppressed_emails/);
  });

  it("une erreur laisse le message du membre s'écrire, et la fonction reste fermée aux membres", () => {
    expect(sql).toContain("EXCEPTION WHEN OTHERS THEN");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.handle_activation_stop() FROM PUBLIC, anon, authenticated");
  });

  it("un message système sans action connue affiche son texte", () => {
    expect(bubble).toContain("if (!action) return fallback;");
    expect(bubble).toContain("return map[action]?.[readerRole] || fallback;");
  });
});
