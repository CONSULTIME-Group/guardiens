// Observabilité des digests : journal métier cron_run_log, corrélation
// trace_id entre la commande pg_cron, la réponse HTTP et le journal, et
// migration des quatre jobs sans exposition de secret.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CRON_TRACE_HEADER, digestRunStatus, readCronTraceId } from "../../supabase/functions/_shared/cron-trace.ts";

const ALERT = readFileSync("supabase/functions/send-alert-digest/index.ts", "utf8");
const NEARBY = readFileSync("supabase/functions/send-nearby-daily-digest/index.ts", "utf8");
const MIGRATION = readFileSync(
  "supabase/sql/pending/20260919113000_digest_cron_trace_correlation.sql",
  "utf8",
);

function metricsBlocks(src: string): string[] {
  return src.match(/nominalRun\?\.(finish|fail)\([\s\S]*?\n\s*\}?\)/g) ?? [];
}

describe("trace_id, corrélation des trois couches", () => {
  it("lit l'en-tête posé par la commande cron", () => {
    const headers = new Headers({ [CRON_TRACE_HEADER]: "0d1f2e3a-4b5c-6d7e-8f90-112233445566" });
    expect(readCronTraceId(headers, {})).toBe("0d1f2e3a-4b5c-6d7e-8f90-112233445566");
  });

  it("retombe sur le corps JSON quand l'en-tête manque", () => {
    expect(readCronTraceId(new Headers(), { trace_id: "abc12345" })).toBe("abc12345");
  });

  it("refuse une valeur absente, trop courte ou non conforme, sans bloquer", () => {
    expect(readCronTraceId(new Headers(), {})).toBeNull();
    expect(readCronTraceId(new Headers(), { trace_id: "court" })).toBeNull();
    expect(readCronTraceId(new Headers(), { trace_id: "jean@example.com" })).toBeNull();
    expect(readCronTraceId(new Headers(), null)).toBeNull();
  });

  it("qualifie le passage : partiel dès une erreur destinataire", () => {
    expect(digestRunStatus(0)).toBe("success");
    expect(digestRunStatus(3)).toBe("partial");
  });
});

describe.each([
  ["send-alert-digest", ALERT, "sent"],
  ["send-nearby-daily-digest", NEARBY, "users_sent"],
])("%s, journal métier", (name, SRC, sentKey) => {
  it("ouvre un passage cron_run_log pour les seuls passages nominaux", () => {
    expect(SRC).toContain(`startCronRun('${name}')`.replace(/'/g, SRC.includes(`startCronRun("${name}")`) ? '"' : "'"));
    expect(SRC).toMatch(/isNominal\s*=\s*!/);
    expect(SRC).toMatch(/isNominal\s*\?\s*await startCronRun|if \(isNominal\) nominalRun = await startCronRun/);
  });

  it("clôt le passage hors fenêtre Paris en succès, avec le motif", () => {
    expect(SRC).toMatch(/finish\(['"]success['"],\s*\{\s*\n?\s*reason: verdict\.reason/);
  });

  it("clôt un passage sans destinataire ni contenu en succès", () => {
    if (name === "send-alert-digest") {
      expect(SRC).toContain('reason: "no_prefs"');
    } else {
      expect(SRC).toContain("reason: 'no_new_listings'");
      expect(SRC).toContain("reason: 'no_recipients'");
    }
  });

  it("clôt en success ou partial selon les erreurs destinataires", () => {
    expect(SRC).toContain("digestRunStatus(errors.length)");
  });

  it("marque une erreur fatale en échec", () => {
    expect(SRC).toContain("nominalRun?.fail(err, { trace_id: traceId })");
  });

  it("propage le trace_id dans la réponse HTTP et dans les métriques", () => {
    expect(SRC).toContain("readCronTraceId(req.headers");
    expect(SRC).toContain("trace_id: traceId");
    for (const block of metricsBlocks(SRC)) {
      expect(block).toContain("trace_id: traceId");
    }
    expect(metricsBlocks(SRC).length).toBeGreaterThanOrEqual(3);
  });

  it("n'écrit aucune donnée personnelle dans cron_run_log", () => {
    const blocks = metricsBlocks(SRC);
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).not.toMatch(/email|recipient|first_name|user_id|profile|token|Bearer/i);
      expect(block).not.toContain("errors:");
    }
    expect(SRC).toContain(`${sentKey}`);
    expect(SRC).toContain("errors_count: errors.length");
  });

  it("ne change ni ciblage, ni consentement, ni logique d'envoi", () => {
    expect(SRC).toContain("send-transactional-email");
    expect(SRC).toContain("claimSitNotification");
    expect(SRC).toContain("reportClaimOutcome");
  });
});

describe("migration des quatre jobs cron", () => {
  it("ne cible que les jobs 12, 13, 14 et 109, par leur nom", () => {
    for (const jobName of ["alert-digest-8h", "alert-digest-12h", "alert-digest-18h", "nearby-daily-digest"]) {
      expect(MIGRATION).toContain(`'${jobName}'`);
    }
    expect(MIGRATION).not.toContain("send-weekly-nearby-digest");
    expect(MIGRATION).not.toContain("send-sitter-daily-digest");
  });

  it("ne réécrit que la commande, jamais le nom, l'horaire ni l'activation", () => {
    expect(MIGRATION).toContain("cron.alter_job(");
    expect(MIGRATION).not.toMatch(/alter_job[\s\S]*?schedule\s*:=/);
    expect(MIGRATION).not.toMatch(/alter_job[\s\S]*?active\s*:=/);
    expect(MIGRATION).toContain("Nom, horaire ou activation modifié");
  });

  it("lit le bearer dans Vault et n'expose aucun secret", () => {
    expect(MIGRATION).toContain("vault.decrypted_secrets");
    expect(MIGRATION).toContain("name = 'supabase_service_role_key'");
    expect(MIGRATION).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{20,}/);
    expect(MIGRATION).not.toContain("eyJ");
  });

  it("est atomique, assertive et sauvegarde les commandes d'origine", () => {
    expect(MIGRATION).toContain("DO $migration$");
    expect(MIGRATION).toContain("CREATE TABLE IF NOT EXISTS public._backup_digest_cron_20260919");
    expect(MIGRATION).toContain("ENABLE ROW LEVEL SECURITY");
    expect(MIGRATION).toContain("REVOKE ALL ON TABLE public._backup_digest_cron_20260919 FROM PUBLIC, anon, authenticated");
    expect(MIGRATION).toContain("Vault indisponible");
    expect(MIGRATION).toMatch(/attendu une seule fois, trouvé/);
    expect(MIGRATION).toContain("Sauvegarde incomplète");
  });

  it("transmet un identifiant unique par invocation, en en-tête et dans le corps", () => {
    expect(MIGRATION).toContain("WITH trace AS (SELECT gen_random_uuid()::text AS trace_id)");
    expect(MIGRATION).toContain("'x-guardiens-trace-id', trace.trace_id");
    expect(MIGRATION).toContain("jsonb_build_object('trace_id', trace.trace_id, 'time', now())");
    expect((MIGRATION.match(/gen_random_uuid\(\)/g) ?? []).length).toBe(1);
  });
});
