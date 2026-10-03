import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildSubject, ctaLabel, deliverProximity, loadProximityHistory, missionKind, missionUrl,
  splitByHistory, type ProxRecipient,
} from "./logic.ts";

// Base simulée : tables en mémoire + RPC de réservation fidèle au SQL réel.
type Row = Record<string, unknown>;
function fakeDb(opts: { failTable?: string } = {}) {
  const tables: Record<string, Row[]> = {
    mass_emails: [], mass_email_sends: [], mission_notification_queue: [], email_send_log: [],
  };
  const claims = new Map<string, { token: string; state: string }>();
  const get = (r: Row, col: string) => {
    const m = /^(\w+)->>(\w+)$/.exec(col);
    if (m) return (r[m[1]] as Row | undefined)?.[m[2]];
    return r[col];
  };
  function from(t: string) {
    const preds: Array<(r: Row) => boolean> = [];
    let range: [number, number] | null = null;
    const q: Row = {
      select: () => q,
      eq: (c: string, v: unknown) => (preds.push((r) => get(r, c) === v), q),
      in: (c: string, v: unknown[]) => (preds.push((r) => v.includes(get(r, c))), q),
      like: (c: string, p: string) => (preds.push((r) => String(get(r, c) ?? "").startsWith(p.replace(/%$/, ""))), q),
      order: () => q,
      range: (a: number, b: number) => (range = [a, b], q),
      insert: (rows: Row[]) => { tables[t].push(...rows); return Promise.resolve({ error: null }); },
      then: (res: (v: unknown) => void) => {
        if (opts.failTable === t) return res({ data: null, error: { message: "boom" } });
        const all = tables[t].filter((r) => preds.every((p) => p(r)));
        return res({ data: range ? all.slice(range[0], range[1] + 1) : all, error: null });
      },
    };
    return q;
  }
  async function rpc(name: string, a: Row) {
    await Promise.resolve();
    const key = a.p_claim_key as string;
    if (name === "acquire_member_email_send_claim") {
      const c = claims.get(key);
      if (!c || c.state === "retryable") { claims.set(key, { token: a.p_owner_token as string, state: "sending" }); return { data: "acquired", error: null }; }
      return { data: c.state === "sent" ? "sent" : c.state === "uncertain" ? "uncertain" : "busy", error: null };
    }
    const c = claims.get(key);
    if (c && c.token === a.p_owner_token && c.state === "sending") { c.state = a.p_outcome as string; return { data: true, error: null }; }
    return { data: false, error: null };
  }
  return { tables, claims, from, rpc };
}

const MISSION = "e5724f3e-c22b-4fb9-8962-d24c80435660";
const people = (n: number, dist = (i: number) => i): ProxRecipient[] =>
  Array.from({ length: n }, (_, i) => ({ user_id: `u${i}`, first_name: `P${i}`, city: "LR", email: `p${i}@x.fr`, distance_km: dist(i) }));

// Rejoue le flux complet aperçu puis envoi, comme index.ts.
async function campaign(db: ReturnType<typeof fakeDb>, all: ProxRecipient[], radius: number, send: (n: number) => Promise<{ status: number | null; body: string }>) {
  const inRadius = all.filter((r) => r.distance_km <= radius);
  const { fresh } = splitByHistory(inRadius, await loadProximityHistory(db, MISSION));
  const id = crypto.randomUUID();
  db.tables.mass_emails.push({ id, segment: "proximity", status: "sent", filters: { mission_id: MISSION, radius_km: radius } });
  const calls: number[] = [];
  const rep = await deliverProximity({ db, sleep: async () => {}, sendBatch: async (e) => (calls.push(e.length), send(e.length)) },
    { missionId: MISSION, campaignId: id, recipients: fresh, buildEmail: (r) => r.email });
  return { rep, calls, fresh: fresh.length };
}
const ok = async (n: number) => ({ status: 200, body: JSON.stringify({ data: Array.from({ length: n }, (_, i) => ({ id: crypto.randomUUID() + i })) }) });

Deno.test("80 puis 180 puis 15 km : chaque adresse ne reçoit qu'une alerte", async () => {
  const db = fakeDb();
  const all = people(79, (i) => (i < 13 ? 10 : 100 + i)); // 13 dans 80 km, 3 dans 15 km
  const a = await campaign(db, all, 80, ok);
  const b = await campaign(db, all, 180, ok);
  const c = await campaign(db, all, 15, ok);
  assertEquals([a.rep.sent, b.rep.sent, c.rep.sent], [13, 66, 0]);
  assertEquals(c.calls.length, 0);
  const emails = db.tables.mass_email_sends.map((r) => r.recipient_email);
  assertEquals(emails.length, new Set(emails).size);
  assertEquals(emails.length, 79);
});

Deno.test("double clic concurrent : une seule livraison par adresse", async () => {
  const db = fakeDb();
  const all = people(5);
  const [x, y] = await Promise.all([campaign(db, all, 50, ok), campaign(db, all, 50, ok)]);
  assertEquals(x.rep.sent + y.rep.sent, 5);
  assertEquals(x.rep.skippedBusy + y.rep.skippedBusy + x.rep.skippedAlready + y.rep.skippedAlready, 5);
});

Deno.test("adresse avec espaces et majuscules déjà servie : exclue", async () => {
  const db = fakeDb();
  db.tables.mass_emails.push({ id: "old", segment: "proximity", status: "sent", filters: { mission_id: MISSION } });
  db.tables.mass_email_sends.push({ mass_email_id: "old", recipient_email: "  P0@X.FR ", status: "delivered" });
  db.tables.mass_email_sends.push({ mass_email_id: "old", recipient_email: "p1@x.fr", status: "opened" });
  db.tables.mass_email_sends.push({ mass_email_id: "old", recipient_email: "p2@x.fr", status: "skipped" });
  const r = await campaign(db, people(3), 50, ok);
  assertEquals(r.fresh, 1); // seul p2 (ignoré auparavant) reste
});

Deno.test("vague automatique ou journal mission-help-needed : exclus", async () => {
  const db = fakeDb();
  db.tables.mission_notification_queue.push({ mission_id: MISSION, helper_id: "u0", status: "sent" });
  db.tables.mission_notification_queue.push({ mission_id: MISSION, helper_id: "u1", status: "skipped" });
  db.tables.email_send_log.push({ template_name: "mission-help-needed", status: "sent", recipient_email: "P2@x.fr", metadata: { idempotency_key: `mission-wave-${MISSION}-u2-1` } });
  const r = await campaign(db, people(4), 50, ok);
  assertEquals(r.fresh, 2); // u1 et u3
});

Deno.test("historique illisible : l'envoi est bloqué", async () => {
  for (const t of ["mass_emails", "mission_notification_queue", "email_send_log"]) {
    await assertRejects(() => loadProximityHistory(fakeDb({ failTable: t }), MISSION));
  }
});

Deno.test("issue ambiguë (5xx, réseau) : jamais rejouée ; refus 4xx : rejouable", async () => {
  const db = fakeDb();
  const r1 = await campaign(db, people(2), 50, async () => ({ status: 503, body: "x" }));
  assertEquals(r1.rep.uncertain, 2);
  const r2 = await campaign(db, people(2), 50, ok);
  assertEquals(r2.calls.length, 0);

  const db2 = fakeDb();
  const r3 = await campaign(db2, people(2), 50, async () => ({ status: null, body: "reset" }));
  assertEquals(r3.rep.uncertain, 2);
  assertEquals((await campaign(db2, people(2), 50, ok)).rep.sent, 0);

  const db3 = fakeDb();
  const r4 = await campaign(db3, people(2), 50, async () => ({ status: 422, body: "invalid" }));
  assertEquals(r4.rep.failed, 2);
  assertEquals((await campaign(db3, people(2), 50, ok)).rep.sent, 2);
});

Deno.test("aucun appel réel : le fournisseur est toujours injecté", async () => {
  const src = await Deno.readTextFile(new URL("./logic.ts", import.meta.url));
  assert(!src.includes("api.resend.com"));
});

Deno.test("projet : objet, bouton et adresse /projets ; entraide inchangée", () => {
  const p = { id: MISSION, slug: "chantier-participatif-de-plantation", category: "projet", mission_type: "besoin" };
  assertEquals(missionKind(p), "projet");
  assertEquals(missionUrl(p), "https://guardiens.fr/projets/chantier-participatif-de-plantation");
  assertEquals(missionUrl({ ...p, slug: null }), `https://guardiens.fr/projets/${MISSION}`);
  assertEquals(ctaLabel("projet"), "Voir le projet");
  assertEquals(buildSubject("Gaelle", "projet", "Plantons ensemble à La Rochelle"), "Un projet participatif près de chez vous : Plantons ensemble à La Rochelle");
  const n = { id: "m1", slug: "x", category: "garden", mission_type: "besoin" };
  assertEquals(missionUrl(n), "https://guardiens.fr/petites-missions/m1");
  assertEquals(buildSubject("Elsa", "besoin"), "Près de chez vous, Elsa cherche un coup de main");
  assertEquals(buildSubject("Elsa", "offre"), "Près de chez vous, Elsa propose son aide, gratuitement");
});
