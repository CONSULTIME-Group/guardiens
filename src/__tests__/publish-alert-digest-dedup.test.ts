import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

/**
 * Verrous du 30/08/2026 : les deux canaux de notification a la publication
 * s'ignoraient, 94 gardiens ont recu deux emails pour la meme annonce.
 */

const DIGEST = readFileSync("supabase/functions/send-sitter-daily-digest/index.ts", "utf8");
const PUBLISH = readFileSync("supabase/functions/notify-sitters-on-publish/index.ts", "utf8");
const PROXIMITY = readFileSync("supabase/functions/send-listing-proximity/index.ts", "utf8");

describe("digest, anti doublon avec l'alerte immediate", () => {
  it("cherche la cle publish-alert dans sit_notification_log", () => {
    expect(DIGEST).toContain("`publish-alert-${r.sit_id}-${sitterId}`");
    expect(DIGEST).toContain("from('sit_notification_log')");
  });

  it("ne retient qu'une reservation reellement servie", () => {
    const block = DIGEST.slice(DIGEST.indexOf("from('sit_notification_log')"));
    expect(block).toContain(".eq('status', 'claimed')");
  });

  it("groupe la recherche en une seule requete par gardien", () => {
    const block = DIGEST.slice(DIGEST.indexOf("from('sit_notification_log')"));
    expect(block).toContain(".in('idempotency_key', [...keyToSit.keys()])");
  });

  it("solde les lignes ecartees avec un motif explicite", () => {
    expect(DIGEST).toContain("'already_alerted_immediate'");
    expect(DIGEST).toContain("const pendingRows = rows.filter(r => !alertedSitIds.has(r.sit_id))");
  });

  it("en cas d'erreur, ne filtre rien et trace", () => {
    expect(DIGEST).toContain("[digest] lecture sit_notification_log impossible");
  });
});

describe("alerte immediate, plafond et priorite", () => {
  it("aligne le plafond sur le declencheur", () => {
    expect(PUBLISH).toMatch(/MAX_RECIPIENTS_PER_RUN = 100/);
  });

  it("dit la verite : plafond par annonce, pas par execution", () => {
    expect(PUBLISH).toContain("par ANNONCE, pas par execution");
    expect(PUBLISH).not.toContain("destinataires par execution.");
  });

  it("distingue les alertes faites main de la migration automatique", () => {
    expect(PUBLISH).toContain("manual: zone.source === null || zone.source === undefined");
    expect(PUBLISH).toContain("migration_email_preferences_2026_07_31");
    expect(PUBLISH).toContain("const rankedTargets = targets.filter((t) => !t.manual)");
    expect(PUBLISH).toContain("rankedTargets.length > MAX_RECIPIENTS_PER_RUN");
  });
});

describe("diffusion manuelle, garde fou de volume", () => {
  it("signale sans plafonner au dela de 150 destinataires", () => {
    expect(PROXIMITY).toMatch(/LARGE_BROADCAST_THRESHOLD = 150/);
    expect(PROXIMITY).toContain('signal_type: "listing_proximity_large_broadcast"');
    expect(PROXIMITY).toContain('severity: "warning"');
    expect(PROXIMITY).toContain("targets.length > LARGE_BROADCAST_THRESHOLD");
  });
});

describe("ponctuation", () => {
  it("n'introduit aucun tiret cadratin dans les blocs ajoutes", () => {
    expect(DIGEST.slice(DIGEST.indexOf("2e bis"), DIGEST.indexOf("2f. Score"))).not.toMatch(/[\u2014\u2013]/);
  });
});
