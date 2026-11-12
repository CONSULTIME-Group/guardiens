/* eslint-disable @typescript-eslint/no-explicit-any */
// Verrou du lot REL1 (12/11/2026) : brouillons presque prêts, seconde relance
// du propriétaire à 7 jours, message au candidat et mention à 10 jours.
// Textes validés par Jérémie (claude/lot-rel1-textes-valides-12-novembre-2026.md),
// option B pour la mention, deux drapeaux éteints à la livraison.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as ReactEmail from "@react-email/components";
import { renderToStaticMarkup } from "react-dom/server";
import { render as renderDom, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  almostReadyCopy, frenchDate, noticeDayFor, ownerSilentCopy, ownerSilentNotification, ownerSilentVariant,
  parisDay, REL1_MENTION, secondNudgeCopy,
} from "../../../supabase/functions/_shared/rel1-copy";
import {
  ALMOST_READY_TEMPLATE, almostReadyKey, groupSecondNudges, OWNER_SILENT_TEMPLATE, ownerSilentDue, ownerSilentKey,
  REL1_FLAG_DRAFT, REL1_FLAG_SILENT, runAlmostReadySweep, runOwnerSilentSweep, runSecondNudgeSweep,
  SECOND_NUDGE_TEMPLATE, secondNudgeKey, type SendRequest, type UnansweredApplication,
} from "../../../supabase/functions/_shared/rel1-sweeps";
import { getEmailCategory } from "../../../supabase/functions/_shared/email-categories";
import { isReminderLog, REMINDER_TEMPLATES } from "../../../supabase/functions/_shared/reminder-daily-slot";
import { notificationPreferenceFor } from "../../../supabase/functions/_shared/notification-preferences";
import { NOTIFICATION_KINDS } from "@/lib/notificationKinds";
import { showsOwnerResponsePending, OWNER_RESPONSE_PENDING_LABEL } from "@/lib/ownerResponsePending";

const read = (p: string) => readFileSync(resolve(p), "utf8");
const T = "supabase/functions/_shared/transactional-email-templates/";

const cache = new Map<string, Record<string, unknown>>();
function loadTsx(file: string): Record<string, any> {
  const abs = resolve(file);
  if (cache.has(abs)) return cache.get(abs)!;
  const exports: Record<string, unknown> = {};
  cache.set(abs, exports);
  const { outputText } = ts.transpileModule(readFileSync(abs, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  });
  runInNewContext(outputText, {
    exports, console, URL,
    require: (spec: string) => {
      if (spec.startsWith("npm:react@")) return React;
      if (spec.startsWith("npm:@react-email/components")) return ReactEmail;
      if (spec.startsWith(".")) return loadTsx(resolve(dirname(abs), spec));
      throw new Error(`Unexpected import ${spec}`);
    },
  });
  return exports;
}
const html = (name: string, props: Record<string, unknown>) => {
  const { template } = loadTsx(`${T}${name}.tsx`);
  return renderToStaticMarkup(React.createElement(template.component, props))
    .replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ").replace(/<!-- -->/g, "");
};
const subject = (name: string, data: Record<string, unknown>) => {
  const { template } = loadTsx(`${T}${name}.tsx`);
  return typeof template.subject === "function" ? template.subject(data) : template.subject;
};

describe("REL1, textes validés au mot près", () => {
  it("email 1, avec un élément manquant", () => {
    const c = almostReadyCopy({
      firstName: "Camille", title: "Garde de notre maison à Lyon", city: "Lyon", startDate: "2026-12-19", endDate: "2027-01-03",
      missing: [{ label: "Une photo de votre logement ou de votre galerie" }],
    });
    expect(c.subject).toBe("Votre annonce est presque prête");
    expect(c.preview).toBe("Vos dates et votre texte sont enregistrés. Il reste une étape.");
    expect(c.hello).toBe("Bonjour Camille,");
    expect(c.intro).toBe("Votre annonce « Garde de notre maison à Lyon » est enregistrée, avec vos dates (du 19 décembre 2026 au 3 janvier 2027) et votre texte.");
    expect(c.step).toBe("Pour la publier, il reste à ajouter : une photo de votre logement ou de votre galerie.");
    expect(c.body).toBe("Une fois publiée, elle est visible par les gardiens à proximité de Lyon. Vous recevez leurs candidatures, vous échangez avec eux et vous choisissez vous-même la personne qui vous convient. Une rencontre avant la garde est possible si vous le souhaitez, elle reste facultative. Guardiens est gratuit.");
    expect(c.button).toBe("Terminer mon annonce");
    expect(c.closing).toBe("Votre projet a changé ? Vous modifiez vos dates ou vous supprimez ce brouillon depuis votre espace.");
  });
  it("email 1, tout est renseigné", () => {
    const c = almostReadyCopy({ firstName: "Camille", title: "Garde", city: "Lyon", startDate: "2026-12-01", endDate: "2026-12-08", missing: [] });
    expect(c.step).toBe("Tout est renseigné. Il reste à la relire et à la publier.");
    expect(c.button).toBe("Relire et publier mon annonce");
    expect(c.intro).toContain("du 1er décembre 2026 au 8 décembre 2026");
  });
  it("email 2, une candidature", () => {
    const c = secondNudgeCopy({ ownerFirstName: "Claire", sitterFirstName: "Camille", sitTitle: "Garde de deux chats à Annecy", count: 1, oldestDays: 7, noticeDay: "2026-11-15" });
    expect(c.subject).toBe("Camille attend toujours votre réponse");
    expect(c.preview).toBe("Un mot suffit pour leur répondre.");
    expect(c.intro).toBe("Camille a proposé de garder votre maison pour « Garde de deux chats à Annecy » il y a 7 jours.");
    expect(c.answer).toBe("Un mot suffit pour répondre : vous engagez la discussion, vous indiquez que vous réfléchissez encore, ou vous déclinez. Vous choisissez votre gardien vous-même, à votre rythme.");
    expect(c.update).toBe("Votre garde est déjà organisée, ou votre projet a changé ? Mettez votre annonce à jour depuis votre espace, les gardiens en sont informés.");
    expect(c.notice).toBe("À partir du 15 novembre, les gardiens qui attendent reçoivent un message leur indiquant que votre réponse se fait attendre, et la mention « Réponse du propriétaire en attente » s'affiche sur leur candidature.");
    expect([c.button, c.thinking, c.decline]).toEqual(["Voir les candidatures", "Je réfléchis encore", "Décliner"]);
  });
  it("email 2, plusieurs candidatures", () => {
    const c = secondNudgeCopy({ ownerFirstName: "Claire", sitTitle: "Garde à Annecy", count: 3, oldestDays: 12, noticeDay: "2026-11-15" });
    expect(c.subject).toBe("3 gardiens attendent votre réponse");
    expect(c.intro).toBe("3 gardiens ont proposé de garder votre maison pour « Garde à Annecy ». La première candidature date de 12 jours.");
  });
  it("message au candidat, trois formulations", () => {
    const input = { sitterFirstName: "Léa", sitTitle: "Garde à Annecy", sitCity: "Annecy", days: 10 };
    const [a, b, c] = [0, 1, 2].map(variant => ownerSilentCopy({ ...input, variant }));
    expect(a.subject).toBe("Votre candidature est toujours en attente");
    expect(a.preview).toBe("La réponse du propriétaire se fait attendre.");
    expect(a.button).toBe("Voir les gardes à proximité");
    expect(a.first).toBe("Vous avez candidaté pour « Garde à Annecy » à Annecy il y a 10 jours. La réponse du propriétaire se fait attendre.");
    expect(a.second).toBe("Votre candidature reste ouverte, et le propriétaire peut y répondre à tout moment. Vous restez libre de candidater à d'autres gardes à proximité.");
    expect(b.first).toBe("Un point sur votre candidature pour « Garde à Annecy » à Annecy, envoyée il y a 10 jours : la réponse du propriétaire est encore attendue.");
    expect(b.second).toBe("Votre candidature reste ouverte, il peut vous répondre à tout moment. D'ici là, d'autres gardes sont ouvertes à proximité.");
    expect(c.first).toBe("Votre candidature pour « Garde à Annecy » à Annecy date de 10 jours, et le propriétaire prend encore son temps pour répondre.");
    expect(c.second).toBe("Elle reste ouverte et il peut y répondre à tout moment. Vous gardez toute liberté de candidater à d'autres gardes en parallèle.");
  });
  it("notification du candidat", () => {
    expect(ownerSilentNotification("Garde à Annecy")).toEqual({
      type: "application_owner_silent", title: "Votre candidature est toujours en attente",
      body: "La réponse du propriétaire de « Garde à Annecy » se fait attendre. Votre candidature reste ouverte.", link: "/search",
    });
    expect(NOTIFICATION_KINDS.application_owner_silent).toBeTruthy();
  });
  it("une candidature garde toujours la même formulation, et les trois servent", () => {
    const id = "3f0c2a9e-1b7d-4c55-9a10-6f2e8d4b7c01";
    expect(ownerSilentVariant(id)).toBe(ownerSilentVariant(id));
    const seen = new Set(Array.from({ length: 30 }, (_, i) => ownerSilentVariant(`00000000-0000-4000-8000-0000000000${String(i).padStart(2, "0")}`)));
    expect([...seen].sort()).toEqual([0, 1, 2]);
  });
  it("dates : jour de Paris et délai de trois jours", () => {
    expect(frenchDate("2026-11-15", false)).toBe("15 novembre");
    expect(parisDay(Date.parse("2026-11-12T23:30:00Z"))).toBe("2026-11-13");
    expect(noticeDayFor(Date.parse("2026-11-12T09:00:00Z"))).toBe("2026-11-15");
  });
  it("règles de rédaction : ni tiret long, ni mot proscrit, ni promesse de recherche", () => {
    const all = [
      read("supabase/functions/_shared/rel1-copy.ts"),
      ...["sit-draft-almost-ready", "owner-pending-applications-second-nudge", "application-owner-silent"].map(n => read(`${T}${n}.tsx`)),
      read("src/components/sits/OwnerResponsePendingNote.tsx"),
    ].join("\n");
    expect(all).not.toMatch(/[—–]/);
    expect(all.toLowerCase()).not.toMatch(/voisin/);
    expect(all).not.toMatch(/nous (vous )?(cherch|trouv)/i);
    expect(all).toContain("Guardiens est gratuit.");
    expect(all).toContain("elle reste facultative");
    expect(all).toContain("gardiens à proximité");
  });
});

describe("REL1, gabarits rendus", () => {
  it("email 1 : bouton vers la reprise du brouillon, signature Alma", () => {
    const out = html("sit-draft-almost-ready", {
      firstName: "Camille", title: "Garde à Lyon", city: "Lyon", startDate: "2026-12-19", endDate: "2027-01-03",
      missingItems: [], resumeUrl: "https://guardiens.fr/sits/create?resume=x",
    });
    expect(out).toContain("Votre annonce est presque prête");
    expect(out).toContain("Tout est renseigné. Il reste à la relire et à la publier.");
    expect(out).toContain("Relire et publier mon annonce");
    expect(out).toContain('href="https://guardiens.fr/sits/create?resume=x"');
    expect(read(`${T}sit-draft-almost-ready.tsx`)).toMatch(/<AlmaSignature \/>[\s\S]*<AlmaSignoff \/>/);
    expect(subject("sit-draft-almost-ready", {})).toBe("Votre annonce est presque prête");
  });
  it("email 2 : liens seconds pour une seule candidature, absents pour plusieurs", () => {
    const base = { ownerFirstName: "Claire", sitterFirstName: "Camille", sitTitle: "Garde à Annecy", oldestDays: 8, noticeDay: "2026-11-15",
      ctaUrl: "https://guardiens.fr/sits/s1#candidatures", declineUrl: "https://guardiens.fr/candidature/reponse?t=d", thinkingUrl: "https://guardiens.fr/candidature/reponse?t=t" };
    const one = html("owner-pending-applications-second-nudge", { ...base, count: 1 });
    expect(one).toContain("Camille attend toujours votre réponse");
    expect(one).toContain("Voir les candidatures");
    expect(one).toContain("Je réfléchis encore");
    expect(one).toContain("Décliner");
    expect(one).not.toContain("Décliner poliment");
    expect(one).toContain('href="https://guardiens.fr/sits/s1#candidatures"');
    expect(one).toContain("À partir du 15 novembre");
    const many = html("owner-pending-applications-second-nudge", { ...base, count: 3 });
    expect(many).toContain("3 gardiens attendent votre réponse");
    expect(many).not.toContain("Je réfléchis encore");
    expect(many).not.toContain("reponse?t=");
    expect(subject("owner-pending-applications-second-nudge", { count: 3 })).toBe("3 gardiens attendent votre réponse");
    expect(subject("owner-pending-applications-second-nudge", { count: 1, sitterFirstName: "Camille" })).toBe("Camille attend toujours votre réponse");
  });
  it("les libellés d'origine des actions rapides restent ceux de la première relance", () => {
    const out = html("owner-pending-application-nudge", { sitterFirstName: "Camille", declineUrl: "https://x.test/d", thinkingUrl: "https://x.test/t" });
    expect(out).toContain("Pas encore décidé");
    expect(out).toContain("Décliner poliment");
  });
  it("message au candidat : bouton vers les gardes à proximité", () => {
    const out = html("application-owner-silent", { sitterFirstName: "Léa", sitTitle: "Garde à Annecy", sitCity: "Annecy", days: 11, variant: 1 });
    expect(out).toContain("Votre candidature est toujours en attente");
    expect(out).toContain("Un point sur votre candidature pour « Garde à Annecy » à Annecy, envoyée il y a 11 jours");
    expect(out).toContain('href="https://guardiens.fr/search"');
    expect(out).toContain("Voir les gardes à proximité");
  });
  it("registre, catégories, famille « relance » et réglages", () => {
    const registry = read(`${T}registry.ts`);
    for (const name of [ALMOST_READY_TEMPLATE, SECOND_NUDGE_TEMPLATE, OWNER_SILENT_TEMPLATE]) expect(registry).toContain(`'${name}':`);
    expect(getEmailCategory(ALMOST_READY_TEMPLATE)).toBe("product");
    expect(getEmailCategory(SECOND_NUDGE_TEMPLATE)).toBe("transactional");
    expect(getEmailCategory(OWNER_SILENT_TEMPLATE)).toBe("transactional");
    expect(REMINDER_TEMPLATES.has(SECOND_NUDGE_TEMPLATE)).toBe(true);
    expect(isReminderLog(SECOND_NUDGE_TEMPLATE, "pending-apps-second-x")).toBe(true);
    expect(REMINDER_TEMPLATES.has(OWNER_SILENT_TEMPLATE)).toBe(false);
    expect(notificationPreferenceFor(SECOND_NUDGE_TEMPLATE)).toBe("email_new_application");
    expect(read("supabase/functions/send-transactional-email/index.ts")).toMatch(/ALMA_SIGNED_TEMPLATES[\s\S]{0,300}'sit-draft-almost-ready'/);
  });
});

// ── Balayages ────────────────────────────────────────────────────────────

type Call = { kind: string; name: string; args?: unknown };
function fakeClient(opts: { rpc?: Record<string, unknown>; flags?: Record<string, boolean>; claim?: (id: string) => boolean } = {}) {
  const calls: Call[] = [];
  const client = {
    calls,
    rpc(name: string, args?: unknown) {
      calls.push({ kind: "rpc", name, args });
      return Promise.resolve({ data: opts.rpc?.[name] ?? [], error: null });
    },
    from(table: string) {
      const state: { op: string; filters: Record<string, unknown>; payload?: unknown } = { op: "select", filters: {} };
      const q: any = {
        select: () => q, eq: (c: string, v: unknown) => { state.filters[c] = v; return q; }, is: () => q,
        insert: (payload: unknown) => { calls.push({ kind: "insert", name: table, args: payload }); return Promise.resolve({ error: null }); },
        update: (payload: unknown) => { state.op = "update"; state.payload = payload; return q; },
        maybeSingle: () => Promise.resolve({ data: table === "feature_flags" ? { enabled: opts.flags?.[String(state.filters.key)] ?? false } : null, error: null }),
        then: (ok: (v: unknown) => unknown) => {
          if (state.op === "update") {
            calls.push({ kind: "update", name: table, args: state.filters });
            const id = String(state.filters.application_id);
            return Promise.resolve({ data: (opts.claim?.(id) ?? true) ? [{ application_id: id }] : [], error: null }).then(ok);
          }
          return Promise.resolve({ data: [], error: null }).then(ok);
        },
      };
      return q;
    },
  };
  return client;
}
const sender = () => {
  const sent: SendRequest[] = [];
  return { sent, send: async (r: SendRequest) => { sent.push(r); return { outcome: "sent" as const }; } };
};
const row = (over: Partial<UnansweredApplication>): UnansweredApplication => ({
  application_id: "a1", sit_id: "s1", sit_title: "Garde à Annecy", sit_city: "Annecy", sit_start_date: "2026-12-01",
  sitter_id: "g1", sitter_first_name: "Léa", sitter_email: "lea@example.invalid",
  owner_id: "o1", owner_first_name: "Claire", owner_email: "claire@example.invalid",
  days_since_created: 11, owner_suppressed: false, second_nudge_logged: false, second_nudge_settled_at: null, ...over,
});
const NOW = Date.parse("2026-11-12T09:00:00Z");
const openSlot = () => ({ taken: new Set<string>(), async isTaken(e: string) { return this.taken.has(e); }, take(e: string) { this.taken.add(e); } });
const writes = (calls: Call[]) => calls.filter(c => c.kind !== "rpc" || !c.name.startsWith("detect_"));

describe("REL1, drapeaux éteints : simulation, rien ne part, rien n'est écrit", () => {
  const drafts = [{ id: "d1", user_id: "o1", owner_email: "o1@example.invalid", owner_first_name: "Zoé", title: "Garde", city: "Lyon", start_date: "2026-12-19", end_date: "2027-01-03", absence_reason: "", sitter_expectations: "", cover_photo_url: null }];
  it("brouillon presque prêt", async () => {
    const client = fakeClient({ rpc: { detect_almost_ready_drafts: drafts } });
    const s = sender();
    const r = await runAlmostReadySweep({ client, enabled: false, send: s.send, loadMissing: async () => [], resumeUrl: () => "u", departureHeld: async () => false });
    expect(r).toMatchObject({ mode: "simulation", detected: 1, eligible: 1, sit_ids: "d1", sent: 0 });
    expect(s.sent).toEqual([]);
    expect(writes(client.calls)).toEqual([]);
  });
  it("seconde relance et message au candidat", async () => {
    const rows = [row({}), row({ application_id: "a2", sitter_id: "g2" })];
    const client = fakeClient({ rpc: { detect_unanswered_applications: rows } });
    const s = sender();
    const b1 = await runSecondNudgeSweep({ client, enabled: false, send: s.send, slot: openSlot(), issueActionUrls: async () => ({}), now: NOW });
    const b2 = await runOwnerSilentSweep({ client, enabled: false, send: s.send, now: NOW });
    expect(b1).toMatchObject({ mode: "simulation", detected: 2, sits: 1, sit_ids: "s1", sent: 0 });
    expect(b2).toMatchObject({ mode: "simulation", detected: 2, notified: 0 });
    expect(s.sent).toEqual([]);
    expect(writes(client.calls)).toEqual([]);
    expect(JSON.stringify([b1, b2])).not.toContain("@");
  });
  it("un drapeau illisible vaut éteint, et les deux tâches lisent leur drapeau", async () => {
    const { readFlag } = await import("../../../supabase/functions/_shared/rel1-sweeps");
    expect(await readFlag(fakeClient({ flags: { [REL1_FLAG_SILENT]: true } }), REL1_FLAG_SILENT)).toBe(true);
    expect(await readFlag(fakeClient(), REL1_FLAG_DRAFT)).toBe(false);
    expect(await readFlag({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: "x" } }) }) }) }) }, REL1_FLAG_DRAFT)).toBe(false);
    const draftTask = read("supabase/functions/send-sit-draft-reminder/index.ts");
    expect(draftTask).toContain("readFlag(supabase, REL1_FLAG_DRAFT)");
    expect(draftTask.match(/almostReadyPass\(supabase, now/g)?.length).toBe(2);
    const nudgeTask = read("supabase/functions/nudge-owner-pending-application/index.ts");
    expect(nudgeTask).toContain("readFlag(serviceClient, REL1_FLAG_SILENT)");
    expect(nudgeTask).toContain("runSecondNudgeSweep(");
    expect(nudgeTask).toContain("runOwnerSilentSweep(");
    expect(nudgeTask.indexOf("runSecondNudgeSweep(")).toBeLessThan(nudgeTask.indexOf("runOwnerSilentSweep("));
  });
  it("la migration livre les deux drapeaux éteints et ne touche ni sits ni applications", () => {
    const sql = read("drizzle/migrations/0143_rel1_relances.sql");
    expect(sql).toMatch(/SELECT v\.key, false, v\.description/);
    expect(sql).not.toMatch(/ALTER TABLE public\.(sits|applications)/);
    expect(sql).not.toMatch(/UPDATE public\.(sits|applications)/);
    expect(sql).toContain("sitter_id = auth.uid() AND cleared_at IS NULL");
    for (const fn of ["detect_almost_ready_drafts()", "detect_unanswered_applications(integer)", "sync_owner_response_pending(uuid[], integer)"]) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${fn} FROM PUBLIC, anon, authenticated;`);
    }
  });
});

describe("REL1, drapeaux allumés", () => {
  it("A : un email par annonce et par personne, clé et métadonnées, réponse de départ respectée", async () => {
    const d = (id: string, owner: string, email: string) => ({ id, user_id: owner, owner_email: email, owner_first_name: "Zoé", title: "Garde", city: "Lyon", start_date: "2026-12-19", end_date: "2027-01-03", absence_reason: "", sitter_expectations: "", cover_photo_url: null });
    const client = fakeClient({ rpc: { detect_almost_ready_drafts: [d("d1", "o1", "o1@example.invalid"), d("d2", "o1", "o1@example.invalid"), d("d3", "o3", "o3@example.invalid"), d("d4", "o4", "o4@example.invalid"), d("d5", "o5", "o5@example.invalid")] } });
    const s = sender();
    const r = await runAlmostReadySweep({
      client, enabled: true, send: s.send, loadMissing: async () => [{ id: "photo", label: "Une photo" }], resumeUrl: (id) => `https://guardiens.fr/sits/create?resume=${id}`,
      departureHeld: async (owner) => owner === "o3", alreadyServed: new Set(["o5@example.invalid"]),
    });
    expect(r).toMatchObject({ mode: "live", detected: 5, eligible: 2, held: 1, sent: 2 });
    expect(s.sent.map(x => x.idempotencyKey)).toEqual([almostReadyKey("d1"), almostReadyKey("d4")]);
    expect(s.sent[0]).toMatchObject({ templateName: ALMOST_READY_TEMPLATE, recipientEmail: "o1@example.invalid", logMetadata: { sit_id: "d1", owner_id: "o1", source: "send-sit-draft-reminder" } });
    expect(s.sent[0].templateData).toMatchObject({ sitId: "d1", resumeUrl: "https://guardiens.fr/sits/create?resume=d1", startDate: "2026-12-19" });
  });
  it("B1 : un email par annonce, adresse supprimée et annonce déjà relancée écartées", () => {
    const groups = groupSecondNudges([
      row({}), row({ application_id: "a2", sitter_first_name: "Tom", days_since_created: 8 }),
      row({ application_id: "a3", sit_id: "s2", owner_email: "x@example.invalid", owner_suppressed: true }),
      row({ application_id: "a4", sit_id: "s3", owner_email: "y@example.invalid", second_nudge_logged: true }),
      row({ application_id: "a5", sit_id: "s4", owner_email: null }),
      row({ application_id: "a6", sit_id: "s5", owner_email: "z@example.invalid", days_since_created: 9 }),
    ]);
    expect(groups.map(g => [g.sit_id, g.count, g.oldestDays, g.singleApplicationId])).toEqual([["s1", 2, 11, null], ["s5", 1, 9, "a6"]]);
  });
  it("B1 : créneau de 20 heures pris, relance reportée au passage suivant", async () => {
    const client = fakeClient({ rpc: { detect_unanswered_applications: [row({})] } });
    const s = sender();
    const slot = openSlot(); slot.take("claire@example.invalid");
    const held = await runSecondNudgeSweep({ client, enabled: true, send: s.send, slot, issueActionUrls: async () => ({}), now: NOW });
    expect(held).toMatchObject({ mode: "live", sent: 0, slot_taken: 1 });
    expect(s.sent).toEqual([]);
    const next = await runSecondNudgeSweep({ client, enabled: true, send: s.send, slot: openSlot(), issueActionUrls: async () => ({ declineUrl: "d", thinkingUrl: "t" }), now: NOW });
    expect(next).toMatchObject({ sent: 1 });
    expect(s.sent[0]).toMatchObject({
      templateName: SECOND_NUDGE_TEMPLATE, idempotencyKey: secondNudgeKey("s1"), recipientEmail: "claire@example.invalid",
      logMetadata: { sit_id: "s1", owner_id: "o1", source: "nudge-owner-pending-application" },
      templateData: { count: 1, sitterFirstName: "Léa", noticeDay: "2026-11-15", ctaUrl: "https://guardiens.fr/sits/s1#candidatures", declineUrl: "d", thinkingUrl: "t" },
    });
  });
  it("B1 : l'envoi prend le créneau, deux annonces du même propriétaire ne partent pas au même passage", async () => {
    const client = fakeClient({ rpc: { detect_unanswered_applications: [row({}), row({ application_id: "a9", sit_id: "s9" })] } });
    const s = sender();
    const r = await runSecondNudgeSweep({ client, enabled: true, send: s.send, slot: openSlot(), issueActionUrls: async () => ({}), now: NOW });
    expect(r).toMatchObject({ sits: 2, sent: 1, slot_taken: 1 });
  });
  it("B2 : la date annoncée au propriétaire est tenue", () => {
    expect(ownerSilentDue(row({}), NOW)).toBe(false);
    expect(ownerSilentDue(row({ second_nudge_settled_at: new Date(NOW - 2 * 86400000).toISOString() }), NOW)).toBe(false);
    expect(ownerSilentDue(row({ second_nudge_settled_at: new Date(NOW - 3 * 86400000).toISOString() }), NOW)).toBe(true);
    expect(ownerSilentDue(row({ owner_suppressed: true }), NOW)).toBe(true);
    expect(ownerSilentDue(row({ owner_email: null }), NOW)).toBe(true);
  });
  it("B2 : mention posée, une notification et un email par candidature, une seule fois", async () => {
    const settled = new Date(NOW - 4 * 86400000).toISOString();
    const rows = [row({ second_nudge_settled_at: settled }), row({ application_id: "a2", sitter_id: "g2", sitter_email: "g2@example.invalid" })];
    const claimed = new Set<string>();
    const claim = (id: string) => (claimed.has(id) ? false : (claimed.add(id), true));
    const client = fakeClient({ rpc: { detect_unanswered_applications: rows, sync_owner_response_pending: [{ marked: 1, cleared: 0 }] }, claim });
    const s = sender();
    const first = await runOwnerSilentSweep({ client, enabled: true, send: s.send, now: NOW });
    expect(first).toMatchObject({ mode: "live", detected: 2, due: 1, waiting_second_nudge: 1, marked: 1, notified: 1, emails_sent: 1 });
    const sync = client.calls.find(c => c.name === "sync_owner_response_pending");
    expect(sync?.args).toEqual({ p_application_ids: ["a1"], p_days: 10 });
    const inserts = client.calls.filter(c => c.kind === "insert");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ name: "notifications", args: { user_id: "g1", type: "application_owner_silent", link: "/search" } });
    expect(s.sent[0]).toMatchObject({
      templateName: OWNER_SILENT_TEMPLATE, idempotencyKey: ownerSilentKey("a1"), recipientEmail: "lea@example.invalid",
      logMetadata: { application_id: "a1", sit_id: "s1", owner_id: "o1", source: "nudge-owner-pending-application" },
      templateData: { sitCity: "Annecy", days: 11 },
    });
    const second = await runOwnerSilentSweep({ client, enabled: true, send: s.send, now: NOW });
    expect(second).toMatchObject({ notified: 0, emails_sent: 0 });
    expect(client.calls.filter(c => c.kind === "insert")).toHaveLength(1);
    expect(s.sent).toHaveLength(1);
  });
  it("send-transactional-email relit le brouillon au moment de l'envoi", () => {
    const src = read("supabase/functions/send-transactional-email/index.ts");
    const block = src.slice(src.indexOf("if (templateName === 'sit-draft-almost-ready')"), src.indexOf("// 1b-bis."));
    expect(block).toContain("draft.status !== 'draft'");
    expect(block).toContain("abandon_reason: 'draft_no_longer_relevant'");
    expect(block).toContain("loadMissingDraftItems(supabase, draft)");
  });
});

// ── Mention, côté candidat seulement (option B) ──────────────────────────

const pending = vi.hoisted(() => ({ value: false, calls: [] as string[] }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const q: any = {
        select: () => q, eq: (_c: string, v: string) => { pending.calls.push(v); return q; },
        limit: () => Promise.resolve(table === "owner_response_pending" && pending.value
          ? { data: [{ application_id: "a1", sit_id: "s1" }], error: null }
          : { data: null, error: { message: "relation does not exist" } }),
      };
      return q;
    },
  },
}));

describe("REL1, mention « Réponse du propriétaire en attente »", () => {
  beforeEach(() => { pending.value = false; pending.calls.length = 0; });
  it("libellé unique, statuts ouverts seulement", () => {
    expect(OWNER_RESPONSE_PENDING_LABEL).toBe("Réponse du propriétaire en attente");
    expect(REL1_MENTION).toBe(OWNER_RESPONSE_PENDING_LABEL);
    expect(showsOwnerResponsePending("pending", true)).toBe(true);
    expect(showsOwnerResponsePending("viewed", true)).toBe(true);
    expect(showsOwnerResponsePending("discussing", true)).toBe(false);
    expect(showsOwnerResponsePending("accepted", true)).toBe(false);
    expect(showsOwnerResponsePending("pending", false)).toBe(false);
  });
  it("fiche d'annonce : visible du candidat marqué", async () => {
    pending.value = true;
    const { default: Note } = await import("@/components/sits/OwnerResponsePendingNote");
    renderDom(<Note sitId="s1" applicationStatus="pending" />);
    await waitFor(() => expect(screen.getByTestId("owner-response-pending").textContent).toBe("Réponse du propriétaire en attente"));
    expect(pending.calls).toContain("s1");
  });
  it("fiche d'annonce : rien pour un gardien sans candidature en attente, rien si la lecture échoue", async () => {
    const { default: Note } = await import("@/components/sits/OwnerResponsePendingNote");
    pending.value = true;
    const { unmount } = renderDom(<Note sitId="s1" applicationStatus={null} />);
    await new Promise(r => setTimeout(r, 20));
    expect(screen.queryByTestId("owner-response-pending")).toBeNull();
    expect(pending.calls).toEqual([]);
    unmount();
    pending.value = false;
    renderDom(<Note sitId="s1" applicationStatus="pending" />);
    await new Promise(r => setTimeout(r, 20));
    expect(screen.queryByTestId("owner-response-pending")).toBeNull();
  });
  it("Mes candidatures et la fiche lisent la mention, la vue propriétaire ne la porte pas", () => {
    const list = read("src/pages/MesCandidatures.tsx");
    expect(list).toContain("showsOwnerResponsePending(app.status, ownerPendingIds.has(app.application_id))");
    expect(list).toContain("fetchOwnerResponsePendingIds().then(setOwnerPendingIds)");
    const sitter = read("src/components/sits/views/SitterSitView.tsx");
    expect(sitter).toMatch(/hasApplied \? \([\s\S]{0,700}<OwnerResponsePendingNote sitId=\{sit\.id\} applicationStatus=\{myApplicationStatus\}/);
    expect(read("src/components/sits/views/OwnerSitView.tsx")).not.toContain("OwnerResponsePending");
  });
});
