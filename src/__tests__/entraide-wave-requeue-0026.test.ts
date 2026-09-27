import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { template } from "../../supabase/functions/_shared/transactional-email-templates/mission-wave-status";

const read = (p: string) => readFileSync(p, "utf8");
const NEG = /\b(ne|pas)\b|n'|n’|personne n/i;
const FNS = [
  "enqueue_mission_wave",
  "mission_wave_audience",
  "emit_mission_meetup_tokens",
  "confirm_mission_meetup",
  "peek_mission_meetup_token",
  "peek_mission_action_token",
  "consume_mission_action_token",
];

describe("relance au chiffre réel dans notify-mission-wave", () => {
  const src = read("supabase/functions/notify-mission-wave/index.ts");
  it("n'envoie la relance que si sent > 0 et utilise sent", () => {
    expect(src).toContain("if (wave >= 2 && sent > 0 && owner?.email) {");
    expect(src).toContain("message: waveRelaunchMessage(sent)");
    expect(src).toContain("title: waveRelaunchTitle(sent)");
    expect(src).toContain("body: waveRelaunchMessage(sent)");
    expect(src).toContain("idempotencyKey: `mission-wave-relaunch-${missionId}-${wave}`");
    expect(src).not.toContain("dix autres personnes");
  });
});

describe("gabarit mission-wave-status", () => {
  it("previewData sans construction négative ni tiret", () => {
    const m = String((template.previewData as { message: string }).message);
    expect(m).toBe("On prévient 3 autres personnes du coin.");
    expect(m).not.toMatch(NEG);
    expect(m).not.toMatch(/[—–]/);
  });
});

describe("migration 0026", () => {
  const sql = read(".lovable/0026_enqueue_mission_wave_requeue_skipped.sql");
  it("seules queued et sent restent exclues", () => {
    expect(sql).toContain("q.status IN ('queued', 'sent')");
    expect(sql).toMatch(/ON CONFLICT \(helper_id, mission_id\) DO UPDATE[\s\S]*?WHERE public\.mission_notification_queue\.status NOT IN \('queued', 'sent'\)/);
    expect(sql).toContain("DELETE FROM _wave_pick WHERE true;");
  });
  it("révoque les sept fonctions", () => {
    for (const f of FNS) {
      expect(sql).toMatch(new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${f}\\([^)]*\\) FROM PUBLIC, anon, authenticated;`));
    }
  });
});

describe("garde : aucune réouverture après 0026", () => {
  it("aucune migration postérieure ne rend ces fonctions à anon, authenticated ou PUBLIC", () => {
    const later = readdirSync("drizzle/migrations").filter(
      (f) => /^\d{4}_.*\.sql$/.test(f) && Number(f.slice(0, 4)) > 26,
    );
    for (const f of later) {
      const sql = read(`drizzle/migrations/${f}`);
      for (const fn of FNS) {
        const re = new RegExp(`GRANT\\s+(EXECUTE|ALL)[^;]*public\\.${fn}\\b[^;]*TO[^;]*\\b(anon|authenticated|PUBLIC)\\b`, "i");
        expect(re.test(sql), `${f} : ${fn}`).toBe(false);
      }
    }
  });
});
