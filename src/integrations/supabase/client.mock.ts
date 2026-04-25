/**
 * Mock du client Supabase utilisé UNIQUEMENT en mode visual-test (alias Vite).
 *
 * Stratégie : exposer les mêmes méthodes que le vrai client (`from`, `auth`,
 * `channel`, `functions`, `storage`, `rpc`) via des proxies chainables qui
 * retournent toujours `{ data, error: null, count }`.
 *
 * Les données proviennent du scénario actif déterminé par l'URL search param
 * `?scenario=...` (voir `tests/visual/fixtures.ts`).
 *
 * Les tables non couvertes par les fixtures retournent `{ data: [], error: null }`
 * — les composants enfants restent ainsi inertes mais ne crashent pas.
 */

// On importe les fixtures depuis tests/ → résolution Vite OK car alias "@" inclut tests via root.
// Si nécessaire, on bascule vers un import relatif explicite.
import { SCENARIOS, type Scenario, type ScenarioId } from "../../../tests/visual/fixtures";

// Capture du scénario UNE SEULE FOIS au chargement du module. Sans cette
// mémorisation, les `<Navigate to="/login">` perdent la query string
// `?scenario=...` et toutes les requêtes suivantes verraient un scénario null.
let _cachedScenario: Scenario | null | undefined;
function getActiveScenario(): Scenario | null {
  if (_cachedScenario !== undefined) return _cachedScenario;
  if (typeof window === "undefined") {
    _cachedScenario = null;
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const id = params.get("scenario") as ScenarioId | null;
  _cachedScenario = id && SCENARIOS[id] ? SCENARIOS[id] : null;
  return _cachedScenario;
}

/**
 * Retourne la "table" de fixtures pour une table SQL donnée, selon le scénario.
 * Toujours sous forme de tableau.
 */
function getTableData(table: string): any[] {
  const scn = getActiveScenario();
  if (!scn) return [];
  switch (table) {
    case "sits":
      return [scn.data.sit];
    case "public_profiles":
      return [scn.data.owner];
    case "properties":
      return [scn.data.property];
    case "owner_profiles":
      return [scn.data.ownerProfile];
    case "pets":
      return scn.data.pets;
    case "reviews":
      return scn.data.reviews;
    case "applications":
      return scn.data.applications;
    case "sitter_profiles":
      return [];
    default:
      return [];
  }
}

interface QueryState {
  table: string;
  filters: Array<(row: any) => boolean>;
  isCountHeadOnly: boolean;
  selectColumns: string;
}

function makeBuilder(state: QueryState): any {
  const apply = () => {
    const all = getTableData(state.table);
    return all.filter((row) => state.filters.every((f) => f(row)));
  };

  const settle = () => {
    const rows = apply();
    if (state.isCountHeadOnly) {
      return Promise.resolve({ data: null, error: null, count: rows.length });
    }
    return Promise.resolve({ data: rows, error: null, count: rows.length });
  };

  const builder: any = {
    select(cols = "*", opts: any = {}) {
      state.selectColumns = cols;
      if (opts?.head) state.isCountHeadOnly = true;
      return builder;
    },
    eq(column: string, value: any) {
      state.filters.push((row) => row?.[column] === value);
      return builder;
    },
    in(column: string, values: any[]) {
      state.filters.push((row) => values.includes(row?.[column]));
      return builder;
    },
    not(column: string, op: string, value: any) {
      // Approximation : on ignore op et on compare en chaîne brute.
      // Couvre `.not("status", "in", "(rejected,cancelled)")`.
      if (op === "in" && typeof value === "string") {
        const list = value.replace(/^[(]/, "").replace(/[)]$/, "").split(",").map((s) => s.trim());
        state.filters.push((row) => !list.includes(row?.[column]));
      } else {
        state.filters.push((row) => row?.[column] !== value);
      }
      return builder;
    },
    gte() { return builder; },
    lte() { return builder; },
    gt() { return builder; },
    lt() { return builder; },
    or() { return builder; },
    order() { return builder; },
    range() { return builder; },
    limit() { return builder; },
    single() {
      const rows = apply();
      return Promise.resolve({ data: rows[0] ?? null, error: rows[0] ? null : { message: "No rows" } });
    },
    maybeSingle() {
      const rows = apply();
      return Promise.resolve({ data: rows[0] ?? null, error: null });
    },
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
    upsert: () => Promise.resolve({ data: null, error: null }),
    then(onfulfilled: any, onrejected: any) {
      // Permet d'attendre `await supabase.from('x').select('*').eq(...)`
      return settle().then(onfulfilled, onrejected);
    },
  };
  return builder;
}

/**
 * Bus realtime côté mock : permet aux tests Playwright (visuels / a11y) de
 * déclencher manuellement des events `postgres_changes` reçus par les hooks
 * `useSitRealtime`, `useSubscriptionStatus`, etc., comme si un AUTRE onglet
 * (ou le serveur) venait de modifier la donnée.
 *
 * Exposé sur `window.__sitRealtime` pour pilotage depuis `page.evaluate()`.
 *
 * Modèle : on indexe les callbacks par nom de canal (`sit-detail-${sitId}`).
 * Chaque appel à `.on('postgres_changes', cfg, cb)` enregistre le callback
 * dans une liste typée par table. `emitSitUpdate(sitId, patch)` parcourt les
 * canaux qui matchent et appelle les callbacks `sits` UPDATE avec un payload
 * `{ new: { ...patch, id: sitId } }`.
 */
type RealtimeCb = (payload: { new: any; old?: any; eventType?: string }) => void;
type ChannelKey = string;
type TableKey = "sits" | "applications" | string;

interface ChannelRegistration {
  name: ChannelKey;
  listeners: Map<TableKey, Array<{ event: string; cb: RealtimeCb; filter?: string }>>;
}

const _channels = new Map<ChannelKey, ChannelRegistration>();

function makeChannel(name: ChannelKey): any {
  const existing = _channels.get(name);
  const reg: ChannelRegistration = existing ?? { name, listeners: new Map() };
  if (!existing) _channels.set(name, reg);

  const channel: any = {
    on(_kind: string, cfg: any, cb: RealtimeCb) {
      const table = (cfg?.table as TableKey) || "_unknown";
      const event = (cfg?.event as string) || "*";
      const filter = cfg?.filter as string | undefined;
      const list = reg.listeners.get(table) || [];
      list.push({ event, cb, filter });
      reg.listeners.set(table, list);
      return channel;
    },
    subscribe(cb?: (status: string) => void) {
      // Notifie le souscripteur que la connexion est OK (comme le vrai client).
      if (typeof cb === "function") {
        try { cb("SUBSCRIBED"); } catch { /* noop */ }
      }
      return channel;
    },
    unsubscribe() {
      _channels.delete(name);
      return Promise.resolve("ok");
    },
    send() { return Promise.resolve("ok"); },
  };
  return channel;
}

function dispatchTableEvent(
  channelMatch: (name: ChannelKey) => boolean,
  table: TableKey,
  event: "INSERT" | "UPDATE" | "DELETE",
  payload: { new?: any; old?: any }
) {
  for (const [name, reg] of _channels) {
    if (!channelMatch(name)) continue;
    const list = reg.listeners.get(table) || [];
    for (const l of list) {
      if (l.event !== "*" && l.event !== event) continue;
      try {
        l.cb({ new: payload.new, old: payload.old, eventType: event });
      } catch (err) {
        // En tests, on veut voir le crash dans la console
        // eslint-disable-next-line no-console
        console.error("[mock realtime] callback threw:", err);
      }
    }
  }
}

// API publique exposée sur window pour pilotage depuis Playwright.
if (typeof window !== "undefined") {
  (window as any).__sitRealtime = {
    /**
     * Émet un UPDATE sur la table `sits` pour le sit donné. Le patch est
     * fusionné avec l'id du sit pour produire le `payload.new`.
     */
    emitSitUpdate(sitId: string, patch: Record<string, any>) {
      dispatchTableEvent(
        (name) => name === `sit-detail-${sitId}`,
        "sits",
        "UPDATE",
        { new: { id: sitId, ...patch } }
      );
    },
    /**
     * Émet un événement applications (INSERT/UPDATE/DELETE).
     */
    emitApplicationEvent(
      sitId: string,
      event: "INSERT" | "UPDATE" | "DELETE",
      row: Record<string, any>
    ) {
      dispatchTableEvent(
        (name) => name === `sit-detail-${sitId}`,
        "applications",
        event,
        event === "DELETE" ? { old: row } : { new: row }
      );
    },
    /** Liste les canaux actifs (debug). */
    _channels: () =>
      Array.from(_channels.entries()).map(([name, reg]) => ({
        name,
        tables: Array.from(reg.listeners.keys()),
      })),
  };
}

export const supabase: any = {
  from(table: string) {
    return makeBuilder({ table, filters: [], isCountHeadOnly: false, selectColumns: "*" });
  },
  auth: {
    async getSession() {
      const scn = getActiveScenario();
      if (!scn) return { data: { session: null }, error: null };
      return {
        data: {
          session: {
            access_token: "fake",
            user: { id: scn.viewer.id, email: scn.viewer.email },
          },
        },
        error: null,
      };
    },
    async getUser() {
      const scn = getActiveScenario();
      if (!scn) return { data: { user: null }, error: null };
      return {
        data: { user: { id: scn.viewer.id, email: scn.viewer.email } },
        error: null,
      };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    async signOut() { return { error: null }; },
    async signInWithPassword() { return { data: null, error: null }; },
    async signUp() { return { data: null, error: null }; },
  },
  channel() { return fakeChannel; },
  removeChannel() { return Promise.resolve("ok"); },
  rpc() { return Promise.resolve({ data: null, error: null }); },
  functions: {
    invoke: () => Promise.resolve({ data: null, error: null }),
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
      list: () => Promise.resolve({ data: [], error: null }),
      remove: () => Promise.resolve({ data: null, error: null }),
    }),
  },
};
