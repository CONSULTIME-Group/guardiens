/**
 * Client Supabase simulé qui compte les lectures par table (lot P1b).
 * Toute chaîne de requête se résout avec une liste vide ; `from(t).select`
 * compte une lecture de `t`, `rpc(n)` compte `rpc:n`, `functions.invoke(n)`
 * compte `fn:n`, `auth.getUser` compte `auth/v1/user`.
 */
export type Recorder = { sites: string[]; reads: string[]; writes: string[]; reset(): void; counts(): Record<string, number> };

function site(): string {
  const st = new Error().stack?.split("\n") ?? [];
  const f = st.find((l) => l.includes("/src/") && !l.includes("p1b/") && !l.includes("lib/myProfile"));
  return f ? f.replace(/.*\/src\//, "").replace(/\?[^:]*/, "").replace(/\)$/, "") : "?";
}
export function createRecorder(): Recorder {
  const r: Recorder = {
    reads: [],
    sites: [],
    writes: [],
    reset() { r.sites.length = 0; r.reads.length = 0; r.writes.length = 0; },
    counts() {
      const c: Record<string, number> = {};
      for (const k of r.reads) c[k] = (c[k] ?? 0) + 1;
      return c;
    },
  };
  return r;
}

function chain(onFirst: (op: string) => void, rows: any[] = [], single = false): any {
  let first = true;
  let isSingle = single;
  let head = false;
  const result = () => Promise.resolve({
    data: head ? null : isSingle ? (rows[0] ?? null) : rows.map((r) => ({ ...r })),
    error: null,
    count: rows.length,
  });
  const proxy: any = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") return (res: any, rej: any) => result().then(res, rej);
      if (prop === "catch") return (rej: any) => result().catch(rej);
      if (prop === "finally") return (f: any) => result().finally(f);
      return (..._args: any[]) => {
        const p = String(prop);
        if (first) { first = false; onFirst(p); }
        if (p === "maybeSingle" || p === "single") isSingle = true;
        if (p === "select" && _args[1]?.head) head = true;
        return proxy;
      };
    },
  });
  return proxy;
}

export const fixtures: Record<string, any[]> = {};

export function createSupabaseMock(rec: Recorder, userId: string) {
  const user = { id: userId, email: "test@example.com" };
  const session = { user, access_token: "t", expires_at: 9999999999 };
  const channel: any = new Proxy({}, { get: () => () => channel });
  return {
    from(table: string) {
      return chain((op) => {
        if (op === "select") { rec.reads.push(table); rec.sites.push(`${table} <- ${site()}`); }
        else rec.writes.push(`${op}:${table}`);
      }, fixtures[table] ?? []);
    },
    rpc(name: string) {
      rec.reads.push(`rpc:${name}`); rec.sites.push(`rpc:${name} <- ${site()}`);
      return chain(() => {});
    },
    functions: {
      invoke(name: string) {
        rec.reads.push(`fn:${name}`);
        return Promise.resolve({ data: null, error: null });
      },
    },
    auth: {
      getUser() { rec.reads.push("auth/v1/user"); rec.sites.push(`auth <- ${site()}`); return Promise.resolve({ data: { user }, error: null }); },
      getSession() { return Promise.resolve({ data: { session }, error: null }); },
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
      signOut() { return Promise.resolve({ error: null }); },
    },
    channel: () => channel,
    removeChannel: () => Promise.resolve(),
    removeAllChannels: () => Promise.resolve(),
    storage: {
      from: () => ({
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://x/${p}` } }),
        list: () => Promise.resolve({ data: [], error: null }),
        upload: () => Promise.resolve({ data: null, error: null }),
        createSignedUrl: () => Promise.resolve({ data: null, error: null }),
      }),
    },
  };
}
