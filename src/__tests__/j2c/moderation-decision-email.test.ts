/**
 * Lot J2c : l'email moderation-decision donne les éléments de CGU 14.5
 * (mesure, durée et étendue, faits et origine, outil automatisé, règle,
 * voies de recours) et l'avertissement de CGU 11.3 le délai d'observations.
 * Aucune donnée inventée : un élément absent reste absent.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildModerationDecisionCopy,
  type ModerationDecisionData,
} from "../../../supabase/functions/_shared/moderation-decision-copy";
import {
  MODERATION_RULES,
  AUTOMATED_RULE_STATEMENTS,
  AUTOMATED_RULE_FALLBACK,
  RECOURSE_LINES,
  findModerationRule,
} from "../../../supabase/functions/_shared/moderation-rules";
import { buildModerationEmailData } from "../../../supabase/functions/admin-moderate-report/moderation";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const rule = findModerationRule("cgu-11-4-remuneration")!;
const full: ModerationDecisionData = {
  firstName: "Camille",
  kind: "decision",
  action: "suspend",
  targetType: "profile",
  facts: "Une somme a été demandée à un gardien pour la garde du 12/10/2026.",
  origin: "report",
  automated: "none",
  ruleStatement: rule.statement,
  durationDays: 30,
  untilDate: "2026-11-13",
  conservatory: true,
};

function allText(d: ModerationDecisionData): string {
  const c = buildModerationDecisionCopy(d);
  return [c.subject, c.preview, c.heading, c.greeting, c.closing, c.memberMessage ?? "",
    ...c.sections.flatMap((s) => [s.label, ...s.lines])].join("\n");
}

describe("J2c, gabarit moderation-decision : les six éléments de CGU 14.5", () => {
  it("une suspension donne mesure, durée, étendue, faits, origine, outil, règle et recours", () => {
    const c = buildModerationDecisionCopy(full);
    const keys = c.sections.map((s) => s.key);
    for (const k of ["measure", "duration", "scope", "facts", "origin", "automation", "rule", "recourse"]) {
      expect(keys, k).toContain(k);
    }
    const text = allText(full);
    expect(text).toContain("Votre compte est suspendu");
    expect(text).toContain("30 jours, jusqu'au 13/11/2026");
    expect(text).toContain("Votre compte entier");
    expect(text).toContain(full.facts!);
    expect(text).toContain("Un signalement reçu par Guardiens.");
    expect(text).toContain("prise entièrement par une personne de l'équipe");
    expect(text).toContain("Article 11.4 des CGU");
    expect(text).toContain("titre conservatoire");
  });

  it("les voies de recours : réexamen gratuit sous 6 mois à contact@guardiens.fr, juge, Arcom", () => {
    const recourse = buildModerationDecisionCopy(full).sections.find((s) => s.key === "recourse")!;
    const t = recourse.lines.join(" ");
    expect(t).toContain("contact@guardiens.fr");
    expect(t).toContain("6 mois");
    expect(t).toMatch(/gratuit/);
    expect(t).toMatch(/juge/);
    expect(t).toContain("Arcom");
    expect(recourse.lines).toEqual([...RECOURSE_LINES]);
  });

  it("un outil automatisé est nommé quand il a servi", () => {
    expect(allText({ ...full, automated: "detection" })).toContain("Un outil automatisé a repéré la situation");
    expect(allText({ ...full, automated: "decision" })).toContain("prise par un outil automatisé");
    expect(allText({ ...full, origin: "initiative" })).toContain("à l'initiative de Guardiens");
  });

  it("aucune invention : faits, règle, origine et outil absents restent absents", () => {
    const c = buildModerationDecisionCopy({ action: "hide", targetType: "listing" });
    const keys = c.sections.map((s) => s.key);
    expect(keys).not.toContain("facts");
    expect(keys).not.toContain("rule");
    expect(keys).not.toContain("origin");
    expect(keys).not.toContain("automation");
    expect(keys).toContain("recourse");
  });

  it("résiliation : définitive, compte entier, article 11.5", () => {
    const t = allText({ ...full, action: "terminate", durationDays: undefined, untilDate: undefined, conservatory: false });
    expect(t).toContain("résilié");
    expect(t).toContain("11.5");
    expect(t).toContain("Définitive");
    expect(t).toContain("qui est fermé");
  });

  it("avertissement (CGU 11.3) : faits, règle, mesure envisagée et délai d'observations", () => {
    const notice: ModerationDecisionData = {
      kind: "notice", action: "suspend", facts: full.facts, ruleStatement: findModerationRule("cgu-10-commercial")!.statement,
      origin: "initiative", automated: "none", observationDays: 10, observationUntil: "2026-10-24",
    };
    const c = buildModerationDecisionCopy(notice);
    const t = allText(notice);
    expect(c.subject).toBe("Guardiens : vos observations sont attendues");
    expect(t).toContain("Guardiens envisage la suspension de votre compte");
    expect(t).toContain("Votre compte reste actif");
    expect(t).toContain("10 jours, soit jusqu'au 24/10/2026 inclus");
    expect(t).toContain("Article 10 des CGU");
    expect(c.sections.map((s) => s.key)).not.toContain("recourse");
  });

  it("le gabarit rend le texte du module pur et calcule l'objet", () => {
    const tpl = read("supabase/functions/_shared/transactional-email-templates/moderation-decision.tsx");
    expect(tpl).toContain("buildModerationDecisionCopy(props)");
    expect(tpl).toMatch(/subject: \(data: Record<string, any>\) => buildModerationDecisionCopy/);
  });

  it("une décision sur signalement porte origine, main humaine, règle et faits", () => {
    const d = buildModerationEmailData("hide", "listing", "Retirez le tarif.", { ruleStatement: rule.statement, facts: "Tarif affiché." });
    expect(d).toMatchObject({ origin: "report", automated: "none", ruleStatement: rule.statement, facts: "Tarif affiché." });
    expect(JSON.stringify(d)).not.toContain("note");
    const fn = read("supabase/functions/admin-moderate-report/index.ts");
    expect(fn).toContain("findModerationRule(body.rule_id)");
    expect(fn).toContain("{ ruleStatement: rule?.statement ?? null, facts }");
  });
});

describe("J2c, règles de rédaction des textes de modération", () => {
  const texts = [
    ...MODERATION_RULES.flatMap((r) => [r.label, r.statement]),
    ...Object.values(AUTOMATED_RULE_STATEMENTS),
    AUTOMATED_RULE_FALLBACK,
    ...RECOURSE_LINES,
    allText(full),
    allText({ ...full, kind: "notice", observationDays: 7, observationUntil: "2026-10-21" }),
  ];
  it("aucun tiret cadratin ni demi-cadratin", () => {
    for (const t of texts) expect(t, t).not.toMatch(/[–—]/);
  });
  it("vocabulaire proscrit absent (voisin, à vie, offert, sans engagement)", () => {
    for (const t of texts) {
      expect(t, t).not.toMatch(/\bvoisin/i);
      expect(t, t).not.toMatch(/à vie/i);
      expect(t, t).not.toMatch(/\boffert/i);
      expect(t, t).not.toMatch(/sans engagement/i);
    }
  });
  it("vouvoiement", () => {
    for (const t of texts) expect(t, t).not.toMatch(/\b(tu|toi|ton|ta|tes)\b/i);
  });
  it("la liste couvre les articles 7, 10 et 11.4, identifiants uniques", () => {
    const groups = new Set(MODERATION_RULES.map((r) => r.group));
    expect([...groups].sort()).toEqual(["10", "11.4", "7"]);
    expect(MODERATION_RULES.filter((r) => r.group === "11.4")).toHaveLength(13);
    expect(new Set(MODERATION_RULES.map((r) => r.id)).size).toBe(MODERATION_RULES.length);
    for (const r of MODERATION_RULES) expect(r.statement).toMatch(/^Articles? [\d.]+ des CGU : /);
  });
});
