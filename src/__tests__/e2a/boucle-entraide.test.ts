/**
 * Lot E2a (11/10/2026) : un coup de main réel n'est plus jamais perdu.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isMeetupSendingHour } from "../../../supabase/functions/_shared/mission-meetup";

const read = (path: string) => readFileSync(path, "utf8");
const sql = read("supabase/prepared-migrations/20261011170000_e2a_boucle_entraide.sql");

describe("E2a, question de rencontre en journée", () => {
  it("jamais la nuit, heure de Paris", () => {
    expect(isMeetupSendingHour(new Date("2026-10-12T00:40:00Z"))).toBe(false); // 2 h 40 à Paris
    expect(isMeetupSendingHour(new Date("2026-10-12T07:40:00Z"))).toBe(true); // 9 h 40
    expect(isMeetupSendingHour(new Date("2026-10-12T17:40:00Z"))).toBe(true); // 19 h 40
    expect(isMeetupSendingHour(new Date("2026-10-12T18:40:00Z"))).toBe(false); // 20 h 40
    expect(isMeetupSendingHour(new Date("2026-12-12T08:40:00Z"))).toBe(true); // 9 h 40 en hiver
  });
  it("la fonction s'arrête hors des heures d'envoi", () => {
    expect(read("supabase/functions/send-mission-meetup-prompt/index.ts")).toContain("if (!isMeetupSendingHour(now))");
  });
  it("clôture automatique 3 jours après la date, pour laisser répondre", () => {
    const src = read("supabase/functions/auto-close-small-missions/index.ts");
    expect(src).toContain("3 * 86400_000");
    expect(src).toContain("m.end_date <= autoCompleteCutoff");
    expect(src).toContain("m.date_needed <= autoCompleteCutoff");
  });
});

describe("E2a, migration", () => {
  it("mark_mission_done : auteur ou personne retenue seulement, rencontre confirmée avec une personne retenue", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.mark_mission_done\(p_mission_id uuid\)/);
    expect(sql).toContain("IF v_uid <> m.user_id AND v_uid IS DISTINCT FROM v_helper_id THEN");
    expect(sql).toContain("CASE WHEN v_helper_id IS NOT NULL THEN 'meetup_confirmed' ELSE 'completed_by_author' END");
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.mark_mission_done\(uuid\) FROM PUBLIC, anon;/);
  });
  it("un oui après clôture automatique devient une rencontre confirmée", () => {
    expect(sql).toContain("AND (status <> 'completed' OR close_reason IS NOT DISTINCT FROM 'auto_completed_after_date')");
  });
  it("avis publics : seulement ceux que la personne accepte de publier", () => {
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.public_mission_feedbacks AS[\s\S]*WHERE public_ok IS TRUE;/);
  });
  it("rattrapage propriétaire borné et sauvegardé", () => {
    expect(sql).toContain("_backup_owner_help_e2a_20261011");
    expect(sql).toContain("IF v_count > 50 THEN RAISE EXCEPTION");
  });
});

describe("E2a, écrans", () => {
  it("messagerie : plus de statut de réponse inexistant, fin par mark_mission_done", () => {
    const src = read("src/components/messages/ConversationHeader.tsx");
    expect(src).not.toContain('update({ status: "completed" as any })');
    expect(src).toContain('rpc("mark_mission_done"');
    expect(src).toContain('responseData.status === "accepted" && missionData.status === "completed"');
  });
  it("fiche du besoin : fin par mark_mission_done", () => {
    const src = read("src/pages/SmallMissionDetail.tsx");
    expect(src).toContain('rpc("mark_mission_done"');
    expect(src).not.toContain("Ce retrait est définitif");
  });
  it("textes alignés sur le comportement réel", () => {
    expect(read("src/pages/MissionQuickCanHelp.tsx")).not.toContain("d'autres personnes du coin le recevront");
    expect(read("src/pages/MissionChooseHelper.tsx")).not.toContain("sont prévenues");
    expect(read("src/components/messages/MissionChooseBanner.tsx")).not.toContain("sont prévenues");
  });
});
