// Base factice pour les relances de brouillon : aucune requête réseau, aucun email.
// Chaque requête est décrite (table, filtres) et résolue par les jeux de données du test.
export type Row = Record<string, any>;

export interface FakeDbData {
  sits?: Row[];
  profiles?: Row[];
  suppressed?: string[];
  preferences?: Row[];
  departures?: Row[];
  logs?: Row[];
  properties?: Row[];
  galleryCount?: number;
  /** Tables ou requêtes en échec : "profiles", "suppressed_emails", "email_preferences", "history", "journey", "daily", "published", "departures". */
  failing?: string[];
}

export interface QueryTrace { table: string; ops: Array<[string, unknown[]]> }

export function fakeDb(data: FakeDbData) {
  const traces: QueryTrace[] = [];
  const err = (what: string) => (data.failing ?? []).includes(what) ? { message: `fixture ${what} failure` } : null;
  const has = (t: QueryTrace, op: string) => t.ops.some(([o]) => o === op);
  const arg = (t: QueryTrace, op: string, col?: string) => t.ops.find(([o, a]) => o === op && (col === undefined || a[0] === col))?.[1];

  function resolve(t: QueryTrace, single: boolean): { data: any; error: any; count?: number } {
    const eqs = t.ops.filter(([o]) => o === "eq").map(([, a]) => a as [string, unknown]);
    const eq = (col: string) => eqs.find(([c]) => c === col)?.[1];
    switch (t.table) {
      case "sits": {
        if (has(t, "not")) { // ownerHasPublished
          const count = (data.sits ?? []).filter(s => s.user_id === eq("user_id") && s.published_at).length;
          return { data: null, count, error: err("published") };
        }
        const row = (data.sits ?? []).find(s => s.id === eq("id")) ?? null;
        return { data: single ? row : [row].filter(Boolean), error: err("sits") };
      }
      case "profiles": return { data: (data.profiles ?? []).find(p => p.id === eq("id")) ?? null, error: err("profiles") };
      case "suppressed_emails": return { data: (data.suppressed ?? []).includes(String(eq("email"))) ? { id: "s" } : null, error: err("suppressed_emails") };
      case "email_preferences": return { data: (data.preferences ?? []).find(p => p.user_id === eq("user_id")) ?? null, error: err("email_preferences") };
      case "owner_departure_intents": return { data: (data.departures ?? []).filter(d => d.user_id === eq("user_id")), error: err("departures") };
      case "email_send_log": {
        const logs = data.logs ?? [];
        const pattern = String(arg(t, "ilike", "recipient_email")?.[1] ?? "").replace(/\\/g, "");
        const since = arg(t, "gte", "created_at")?.[1] as string | undefined;
        const live = (l: Row) => ["sent", "pending", "deferred"].includes(l.status) && (!since || l.created_at >= since) && l.recipient_email === pattern;
        if (has(t, "or")) { // historique par annonce
          const filter = String(arg(t, "or")?.[0]);
          const sitId = filter.match(/sit_id\.eq\.([0-9a-f-]{36})/)?.[1];
          return { data: logs.filter(l => l.template_name === "sit-draft-reminder" && (l.metadata?.sit_id === sitId || String(l.metadata?.idempotency_key ?? "").includes(sitId!))), error: err("history") };
        }
        if (has(t, "filter")) return { data: logs.filter(l => live(l) && String(l.metadata?.source ?? "").startsWith("journey:")), error: err("journey") };
        if (arg(t, "in", "template_name")) {
          const names = arg(t, "in", "template_name")![1] as string[];
          return { data: logs.filter(l => live(l) && names.includes(l.template_name)), error: err("journey") };
        }
        // plafond quotidien
        return { data: null, count: logs.filter(l => live(l) && l.template_name === "sit-draft-reminder").length, error: err("daily") };
      }
      case "properties": return { data: (data.properties ?? []).find(p => p.user_id === eq("user_id")) ?? null, error: null };
      case "owner_gallery": return { data: null, count: (data.galleryCount ?? 0), error: null };
      default: throw new Error(`Unexpected table ${t.table}`);
    }
  }

  const from = (table: string) => {
    const t: QueryTrace = { table, ops: [] };
    traces.push(t);
    const chain: Row = {};
    for (const op of ["select", "eq", "neq", "not", "is", "in", "or", "ilike", "gte", "lt", "filter", "order", "limit", "update", "range"]) {
      chain[op] = (...a: unknown[]) => { t.ops.push([op, a]); return chain; };
    }
    chain.maybeSingle = async () => resolve(t, true);
    chain.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(resolve(t, false)).then(ok, ko);
    return chain;
  };
  return { client: { from }, traces };
}

export const NOW = Date.parse("2026-11-07T08:00:00Z");
export const ago = (days: number) => new Date(NOW - days * 86400000).toISOString();
export const SIT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const OWNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const EMAIL = "camille@fixture.test";

export function draftRow(over: Row = {}): Row {
  return {
    id: SIT, user_id: OWNER, status: "draft", published_at: null, unpublished_at: null,
    title: "Garde de notre maison", city: "Lyon", start_date: "2026-12-20", end_date: "2026-12-30",
    absence_reason: "Vacances en famille à la montagne", sitter_expectations: "Nourrir et câliner le chat matin et soir",
    cover_photo_url: null, created_at: ago(3), ...over,
  };
}

export function baseData(over: FakeDbData = {}): FakeDbData {
  return {
    sits: [draftRow()],
    profiles: [{ id: OWNER, email: "Camille@Fixture.test", first_name: "Camille", city: "Lyon", latitude: 45.76, longitude: 4.83, last_seen_at: ago(1) }],
    preferences: [{ user_id: OWNER, product_emails: true }],
    logs: [],
    properties: [{ id: "prop", user_id: OWNER, photos: ["https://fixture.invalid/maison.jpg"], cover_photo_url: null }],
    ...over,
  };
}

export const sentLog = (daysAgo: number, key: string, extra: Row = {}): Row & { status: string; created_at: string } => ({
  template_name: "sit-draft-reminder", status: "sent", recipient_email: EMAIL, created_at: ago(daysAgo),
  metadata: { idempotency_key: key, sit_id: SIT, ...extra },
});
