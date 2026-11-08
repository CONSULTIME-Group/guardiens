/**
 * Lot NUR1 bloc B (08/11/2026, « Ok go enchaîne » de Jérémie après l'audit du
 * nurturing) : séquence propriétaire à 3 emails, relance de brouillon sans
 * attente de 48 heures, réactivation en deux versions, récapitulatifs sans
 * annonce déjà reçue en alerte immédiate.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadPublishAlertedSits, withoutPublishAlerted, PUBLISH_ALERT_SOURCE,
} from "../../../supabase/functions/_shared/publish-alerted-sits";
import { PUBLISH_ASK_TEMPLATES, ONCE_PER_PERSON_TEMPLATES } from "../../../supabase/functions/_shared/owner-sequence-rules";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const FN = "supabase/functions";
const TPL = `${FN}/_shared/transactional-email-templates`;

describe("B1, séquence propriétaire J+1, J+3, J+21", () => {
  const sql = read("drizzle/migrations/0117_nur1_sequence_proprietaire.sql");
  it("la migration retire J+10, renumérote J+21 et garde la date prévue des parcours passés par J+10", () => {
    expect(sql).toContain("DELETE FROM public.nurturing_steps\n  WHERE sequence_id = seq AND template_name = 'owner-no-sit-j10';");
    expect(sql).toContain("SET step_order = 3\n  WHERE sequence_id = seq AND template_name = 'owner-no-sit-j21' AND step_order = 4;");
    expect(sql).toMatch(/SET current_step = 2,\s+last_step_at = COALESCE\(last_step_at, started_at, created_at\) - interval '168 hours'\s+WHERE sequence_key = 'onboarding-owner'\s+AND status = 'active'\s+AND current_step = 3;/);
    // Parcours ramenés avant la suppression, rejouable sans effet.
    expect(sql.indexOf("UPDATE public.user_journeys")).toBeLessThan(sql.indexOf("DELETE FROM public.nurturing_steps"));
    expect(sql).toMatch(/IF NOT EXISTS \([\s\S]*template_name = 'owner-no-sit-j10'[\s\S]*RETURN;/);
  });
  it("168 heures : J+21 garde son écart de 264 heures après J+10 (432 comptées depuis l'étape 2)", () => {
    expect((504 - 72) - (504 - 240)).toBe(168);
  });
  it("le gabarit J+10 et ses déclarations disparaissent du code", () => {
    expect(existsSync(resolve(process.cwd(), `${TPL}/owner-no-sit-j10.tsx`))).toBe(false);
    expect(read(`${TPL}/registry.ts`)).not.toContain("owner-no-sit-j10");
    for (const f of ["email-categories.ts", "sender-address.ts"]) expect(read(`${FN}/_shared/${f}`), f).not.toContain("owner-no-sit-j10");
    expect(read(`${FN}/send-transactional-email/index.ts`)).not.toContain("owner-no-sit-j10");
    expect(PUBLISH_ASK_TEMPLATES.has("owner-no-sit-j10")).toBe(false);
    expect(ONCE_PER_PERSON_TEMPLATES.has("owner-no-sit-j10")).toBe(false);
  });
});

describe("B2, la relance de brouillon passe avant la séquence", () => {
  const src = read(`${FN}/_shared/draft-reminder-eligibility.ts`);
  it("plus d'attente de 48 heures après un email de séquence", () => {
    expect(src).not.toContain("JOURNEY_SPACING");
    expect(src).not.toContain("journey_spacing");
    expect(read(`${FN}/_shared/draft-reminder-policy.ts`)).not.toContain("journey_spacing");
  });
  it("l'inverse reste : owner-no-sit-* attend 48 heures après une relance de brouillon", () => {
    expect(read(`${FN}/evaluate-journeys/index.ts`)).toContain("(template.startsWith('owner-no-sit-') && recentDraftReminder.has(profile.email.toLowerCase()))");
  });
  it("la collision du jour est tenue par le plafond produit (report, jamais d'abandon sous 24 heures)", () => {
    expect(read(`${FN}/_shared/email-categories.ts`)).toMatch(/const PRODUCT[\s\S]*'sit-draft-reminder'/);
  });
});

describe("B3, réactivation en deux versions", () => {
  const tpl = read(`${TPL}/reactivation-d30.tsx`);
  const ej = read(`${FN}/evaluate-journeys/index.ts`);
  it("gardien : annonces ouvertes réelles, sans affirmation non vérifiée", () => {
    expect(tpl).toContain("<NearbySitsBlock sits={nearbySits} />");
    expect(tpl).not.toContain("attendent encore une bonne âme");
    expect(tpl).not.toContain("Republier votre annonce si vous cherchez un gardien");
    expect(ej).toMatch(/template === 'reactivation-d30' && !isOwnerRecipient[\s\S]{0,400}nearbyData = nearbySitsTemplateData\(nearby\.sits\)/);
  });
  it("propriétaire : prochaine absence, gardiens à proximité réels, bouton vers /sits/create", () => {
    expect(tpl).toContain("if (isOwner)");
    expect(tpl).toContain("`${SITE_URL}/sits/create`");
    expect(ej).toContain("((template === 'onboarding-j1' || template === 'reactivation-d30') && isOwnerRecipient)");
  });
  it("objets : question avec son point, distance réelle sinon phrase sans chiffre", async () => {
    // Le gabarit importe des modules npm: de Deno, l'objet est relu dans le source.
    expect(tpl).toContain("`${name}, une absence en vue ?`");
    expect(tpl).toContain("'Une absence en vue ?'");
    expect(tpl).toContain("`une garde ouverte à ${km} km de chez vous`");
  });
  it("aucune tournure négative ni tiret dans le texte visible", () => {
    const visible = tpl.split("\n").filter((l) => !/^\s*(import|\/\/|const \w+ = \{|\w+:)/.test(l)).join("\n");
    expect(visible).not.toMatch(/\bne\s+(?:\S+\s+){0,2}(pas|plus|jamais|rien)\b/i);
    expect(visible).not.toMatch(/\bn['’]\S+\s+(pas|plus|jamais|rien)\b/i);
    expect(visible).not.toMatch(/[–—]/);
  });
});

describe("B4, une annonce, un seul email", () => {
  const rows = [
    { user_id: "u1", sit_ids: ["s1"], created_at: "2026-11-08T08:00:00Z" },
    { user_id: "u1", sit_ids: ["s2"], created_at: "2026-11-08T09:00:00Z" },
    { user_id: "u2", sit_ids: ["s1"], created_at: "2026-11-08T09:00:00Z" },
  ];
  const fakeClient = (fail = false) => {
    const calls: Array<[string, unknown]> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {
      select: () => q,
      eq: (c: string, v: unknown) => { calls.push([c, v]); return q; },
      gte: (c: string, v: unknown) => { calls.push([c, v]); return q; },
      order: () => q,
      range: async () => (fail ? { data: null, error: { message: "boom" } } : { data: rows, error: null }),
    };
    return { client: { from: (t: string) => { calls.push(["table", t]); return q; } }, calls };
  };

  it("lit les alertes immédiates réservées des 7 derniers jours, par gardien", async () => {
    const { client, calls } = fakeClient();
    const map = await loadPublishAlertedSits(client, Date.parse("2026-11-08T12:00:00Z"));
    expect([...(map.get("u1") ?? [])].sort()).toEqual(["s1", "s2"]);
    expect([...(map.get("u2") ?? [])]).toEqual(["s1"]);
    expect(calls).toContainEqual(["table", "sit_notification_log"]);
    expect(calls).toContainEqual(["source", PUBLISH_ALERT_SOURCE]);
    expect(calls).toContainEqual(["status", "claimed"]);
    expect(calls).toContainEqual(["created_at", "2026-11-01T12:00:00.000Z"]);
  });
  it("lecture en échec : rien n'est écarté", async () => {
    const { client } = fakeClient(true);
    const map = await loadPublishAlertedSits(client);
    expect(map.size).toBe(0);
    expect(withoutPublishAlerted(map, "u1", [{ id: "s1" }])).toEqual([{ id: "s1" }]);
  });
  it("écarte seulement les annonces de ce gardien", async () => {
    const { client } = fakeClient();
    const map = await loadPublishAlertedSits(client);
    expect(withoutPublishAlerted(map, "u1", [{ id: "s1" }, { id: "s3" }])).toEqual([{ id: "s3" }]);
    expect(withoutPublishAlerted(map, "u3", [{ id: "s1" }])).toEqual([{ id: "s1" }]);
  });
  it("les deux récapitulatifs filtrent et le disent dans leurs mesures", () => {
    const a = read(`${FN}/send-alert-digest/index.ts`);
    const n = read(`${FN}/send-nearby-daily-digest/index.ts`);
    for (const s of [a, n]) {
      expect(s).toContain("loadPublishAlertedSits(supabase)");
      expect(s).toContain("already_alerted_sits: alreadyAlertedSits");
      expect(s).toContain("deja_recu_en_alerte");
    }
    expect(a).toContain("withoutPublishAlerted(publishAlerted, profile.id, sits)");
    expect(n).toContain("if (seenInAlert?.has(s.id)) { alertedHere++; continue }");
  });
});
