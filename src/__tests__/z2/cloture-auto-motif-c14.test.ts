/**
 * Lot Z2, audit C-14 (13/10/2026) : la clôture automatique d'un besoin dit son
 * vrai motif. Un besoin clos parce que sa date est passée ne lit plus
 * « après 0 jours sans activité ».
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  isDateAutoClose,
  missionAutoCloseCause,
  missionAutoClosedNoticeBody,
} from "../../../supabase/functions/_shared/mission-auto-close-copy";

const read = (p: string) => readFileSync(p, "utf8");

describe("C-14, texte selon le motif", () => {
  it("date de fin ou date souhaitée passée", () => {
    expect(isDateAutoClose("end_date_past")).toBe(true);
    expect(isDateAutoClose("date_needed_past")).toBe(true);
    expect(missionAutoClosedNoticeBody("Monter une coiffeuse", "date_needed_past", 0)).toBe(
      "« Monter une coiffeuse » a été clôturée, sa date est passée. Vous pouvez la republier avec une nouvelle date.",
    );
    expect(missionAutoCloseCause("end_date_past", 12)).toBe("sa date est passée");
  });

  it("besoin resté en ligne 45 jours et plus", () => {
    expect(isDateAutoClose("dormant_45d")).toBe(false);
    expect(missionAutoClosedNoticeBody("Tailler la haie", "dormant_45d", 52)).toBe(
      "« Tailler la haie » a été clôturée, elle est restée en ligne 52 jours. Vous pouvez la republier pour relancer les personnes du coin.",
    );
    expect(missionAutoCloseCause("dormant_45d", null)).toBe("elle est restée en ligne plusieurs semaines");
  });

  it("aucun texte ne parle d'inactivité ni ne porte de tiret", () => {
    for (const reason of ["end_date_past", "date_needed_past", "dormant_45d", null]) {
      const body = missionAutoClosedNoticeBody("X", reason, 3);
      expect(body).not.toMatch(/sans activité/);
      expect(body).not.toMatch(/[–—]/);
    }
  });
});

describe("C-14, branchement", () => {
  it("auto-close-small-missions écrit la notification et transmet le motif à l'email", () => {
    const src = read("supabase/functions/auto-close-small-missions/index.ts");
    expect(src).toContain("from '../_shared/mission-auto-close-copy.ts'");
    expect(src).toContain("body: missionAutoClosedNoticeBody(m.title, m.reason, m.ageDays),");
    expect(src).toMatch(/ageDays: m\.ageDays,\s+reason: m\.reason,/);
    expect(src).not.toContain("jours sans activité");
  });

  it("le gabarit mission-auto-closed lit la même cause", () => {
    const tpl = read("supabase/functions/_shared/transactional-email-templates/mission-auto-closed.tsx");
    expect(tpl).toContain("from '../mission-auto-close-copy.ts'");
    expect(tpl).toContain("{missionAutoCloseCause(reason, ageDays)}");
    expect(tpl).not.toContain("jours sans activité");
  });

  it("le module partagé reste pur (aucune lecture de Deno)", () => {
    expect(read("supabase/functions/_shared/mission-auto-close-copy.ts")).not.toMatch(/\bDeno\./);
  });
});
