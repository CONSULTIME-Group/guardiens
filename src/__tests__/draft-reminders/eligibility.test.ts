// Politique unique des relances de brouillon (chemin automatique et chemin admin).
import { describe, expect, it } from "vitest";
import { evaluateDraftReminder, classifyTransactionalResponse } from "../../../supabase/functions/_shared/draft-reminder-eligibility";
import { draftReminderSendTimeBlock, draftReminderHistoryFilter, draftReminderKey } from "../../../supabase/functions/_shared/draft-reminder-policy";
import { fakeDb, baseData, draftRow, sentLog, NOW, ago, SIT, OWNER, EMAIL } from "./fakeDb";

const run = (data = baseData(), draft = draftRow()) => evaluateDraftReminder(fakeDb(data).client, draft as any, { now: NOW });

describe("admissibilité d'une relance de brouillon", () => {
  it("première relance : clé déterministe par annonce, adresse normalisée", async () => {
    const d = await run();
    expect(d).toMatchObject({ send: true, stage: 1, idempotencyKey: `sit-draft-reminder-${SIT}` });
    if (d.send) expect(d.owner.email).toBe(EMAIL);
  });
  it("seconde relance après 7 jours et une visite récente, clé -2", async () => {
    const d = await run(baseData({ logs: [sentLog(8, `sit-draft-reminder-${SIT}`)] }));
    expect(d).toMatchObject({ send: true, stage: 2, idempotencyKey: `sit-draft-reminder-${SIT}-2` });
  });
  it.each([
    ["date de début passée", { start_date: "2026-11-06" }],
    ["annonce publiée entre-temps", { status: "published", published_at: ago(1) }],
    ["annonce retirée", { unpublished_at: ago(1) }],
  ])("%s : aucune relance", async (_label, over) => {
    expect(await run(baseData(), draftRow(over))).toEqual({ send: false, reason: "draft_no_longer_relevant" });
  });
  it("annonce supprimée : aucune relance", async () => {
    expect(await evaluateDraftReminder(fakeDb(baseData()).client, null, { now: NOW })).toEqual({ send: false, reason: "draft_no_longer_relevant" });
  });
  it("brouillon de moins de 24 heures : attente", async () => {
    expect(await run(baseData(), draftRow({ created_at: new Date(NOW - 3600_000).toISOString() }))).toEqual({ send: false, reason: "too_recent" });
  });
  it("propriétaire ayant déjà publié une autre annonce", async () => {
    const data = baseData({ sits: [draftRow(), { id: "other", user_id: OWNER, published_at: ago(40) }] });
    expect(await run(data)).toEqual({ send: false, reason: "owner_already_published" });
  });
  it("adresse en liste de suppression", async () => {
    expect(await run(baseData({ suppressed: [EMAIL] }))).toEqual({ send: false, reason: "suppressed" });
  });
  it("relances désactivées (product_emails)", async () => {
    expect(await run(baseData({ preferences: [{ user_id: OWNER, product_emails: false }] }))).toEqual({ send: false, reason: "product_emails_off" });
  });
  it("aucune préférence enregistrée : la valeur par défaut autorise", async () => {
    expect((await run(baseData({ preferences: [] }))).send).toBe(true);
  });
  it("réponse de départ lointaine de moins de 30 jours : attente", async () => {
    const data = baseData({ departures: [{ user_id: OWNER, period: "printemps", answered_at: ago(5), source: "email" }] });
    expect(await run(data)).toEqual({ send: false, reason: "departure_hold" });
  });
  it("email de la séquence propriétaire de moins de 48 heures : la relance de brouillon n'attend plus (NUR1 bloc B)", async () => {
    const journey = { template_name: "owner-no-sit-j3", status: "sent", recipient_email: EMAIL, created_at: ago(1), metadata: { source: "journey:onboarding-owner" } };
    expect((await run(baseData({ logs: [journey] }))).send).toBe(true);
    const noel = { ...journey, template_name: "owner-noel-v3-pret", metadata: {} };
    expect((await run(baseData({ logs: [noel] }))).send).toBe(true);
  });
  it("deux relances déjà parties, anciennes clés admin comprises : plus rien", async () => {
    const logs = [sentLog(20, `sit-draft-reminder-${SIT}`), sentLog(10, `stale-draft-manual-${SIT}-1793969626462`)];
    expect(await run(baseData({ logs }))).toEqual({ send: false, reason: "reminder_cap" });
  });
  it("relance de moins de 7 jours : attente", async () => {
    expect(await run(baseData({ logs: [sentLog(3, `sit-draft-reminder-${SIT}`)] }))).toEqual({ send: false, reason: "reminder_spacing" });
  });
  it("propriétaire sans visite depuis 30 jours : pas de seconde relance", async () => {
    const data = baseData({ logs: [sentLog(10, `sit-draft-reminder-${SIT}`)] });
    data.profiles![0].last_seen_at = ago(45);
    expect(await run(data)).toEqual({ send: false, reason: "owner_inactive" });
  });
  it("relance reportée encore en file : aucun doublon", async () => {
    const deferred = { ...sentLog(0.5, `sit-draft-reminder-${SIT}`), status: "deferred", metadata: { idempotency_key: `sit-draft-reminder-${SIT}` } };
    expect(await run(baseData({ logs: [deferred] }))).toEqual({ send: false, reason: "send_in_progress" });
  });
  it("une relance de brouillon déjà partie aujourd'hui pour cette personne", async () => {
    const other = { template_name: "sit-draft-reminder", status: "sent", recipient_email: EMAIL, created_at: new Date(NOW - 3600_000).toISOString(), metadata: { idempotency_key: "sit-draft-reminder-other", sit_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" } };
    expect(await run(baseData({ logs: [other] }))).toEqual({ send: false, reason: "already_sent_today" });
  });
  it.each(["published", "profiles", "suppressed_emails", "email_preferences", "departures", "history", "daily"])(
    "lecture %s en échec : erreur, jamais un envoi (fail closed)", async (failing) => {
      await expect(run(baseData({ failing: [failing] }))).rejects.toThrow();
    });
  it("caractères spéciaux de l'adresse échappés dans les comparaisons", async () => {
    const data = baseData();
    data.profiles![0].email = "a_b%c@fixture.test";
    const db = fakeDb(data);
    await evaluateDraftReminder(db.client, draftRow() as any, { now: NOW });
    const patterns = db.traces.flatMap(t => t.ops.filter(([o, a]) => o === "ilike" && a[0] === "recipient_email").map(([, a]) => a[1]));
    expect(patterns.length).toBeGreaterThan(0);
    for (const p of patterns) expect(p).toBe("a\\_b\\%c@fixture.test");
  });
});

describe("contrôle au moment réel de l'envoi", () => {
  const key = draftReminderKey(SIT, 2);
  it("deux autres relances parties : annulée", () => {
    expect(draftReminderSendTimeBlock([sentLog(20, "k1"), sentLog(10, "k2")], key, NOW)).toBe("reminder_cap");
  });
  it("autre relance de moins de 7 jours (double clic admin, course entre chemins) : annulée", () => {
    expect(draftReminderSendTimeBlock([sentLog(1, `stale-draft-manual-${SIT}-1`)], key, NOW)).toBe("reminder_spacing");
  });
  it("le drainage de sa propre clé reportée passe", () => {
    expect(draftReminderSendTimeBlock([{ ...sentLog(1, key), status: "deferred" }, sentLog(9, `sit-draft-reminder-${SIT}`)], key, NOW)).toBeNull();
  });
  it("le filtre d'historique couvre sit_id, clés -2 et anciennes clés admin, et refuse un identifiant forgé", () => {
    const f = draftReminderHistoryFilter(SIT);
    expect(f).toContain(`metadata->>sit_id.eq.${SIT}`);
    expect(f).toContain(`sit-draft-reminder-${SIT}*`);
    expect(f).toContain(`stale-draft-manual-${SIT}*`);
    expect(() => draftReminderHistoryFilter("x,status.eq.sent")).toThrow();
  });
});

describe("issue d'un appel au service d'envoi", () => {
  it.each([
    [true, { success: true, sent: true }, "sent"],
    [true, { success: true, deferred: true, reason: "daily_cap" }, "deferred"],
    [true, { success: true, skipped: true, abandoned: true, reason: "draft_no_longer_relevant" }, "skipped"],
    [true, { success: false, reason: "unsubscribed_category" }, "skipped"],
    [true, { success: false, reason: "account_suspended" }, "skipped"],
    [false, { error: "draft_verification_unavailable" }, "failed"],
    [true, {}, "failed"],
  ])("http %s %j : %s", (ok, body, outcome) => {
    expect(classifyTransactionalResponse(ok as boolean, body).outcome).toBe(outcome);
  });
});
