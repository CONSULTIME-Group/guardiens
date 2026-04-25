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

function getActiveScenario(): Scenario | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const id = params.get("scenario") as ScenarioId | null;
  return id && SCENARIOS[id] ? SCENARIOS[id] : null;
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

const fakeChannel = {
  on() { return fakeChannel; },
  subscribe() { return fakeChannel; },
  unsubscribe() { return Promise.resolve("ok"); },
  send() { return Promise.resolve("ok"); },
};

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
