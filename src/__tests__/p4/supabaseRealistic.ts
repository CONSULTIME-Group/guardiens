/**
 * Lot P4 : client Supabase simulé « réaliste ». Contrairement au
 * simulateur P1b (toute requête renvoie la table entière), celui-ci
 * applique les filtres eq, neq, in, is, or (ignoré), range et limit, et
 * plafonne chaque réponse à 1 000 lignes comme le serveur. Il compte une
 * lecture par requête envoyée (un lot `.in` de 150 identifiants = une
 * lecture), ce qui reproduit les lectures répétées observées en ligne sur
 * un vivier de plus de 1 000 gardiens.
 */
export type RealRecorder = { reads: string[]; inSizes: Record<string, number[]>; reset(): void; counts(): Record<string, number> };

export function createRealRecorder(): RealRecorder {
  const r: RealRecorder = {
    reads: [],
    inSizes: {},
    reset() { r.reads.length = 0; for (const k of Object.keys(r.inSizes)) delete r.inSizes[k]; },
    counts() {
      const c: Record<string, number> = {};
      for (const k of r.reads) c[k] = (c[k] ?? 0) + 1;
      return c;
    },
  };
  return r;
}

export const realFixtures: Record<string, any[]> = {};
const SERVER_MAX_ROWS = 1000;

function builder(table: string, rec: RealRecorder) {
  const preds: Array<(row: any) => boolean> = [];
  let isSelect = false;
  let head = false;
  let single = false;
  let from = 0;
  let to = Infinity;
  let limit = Infinity;
  const run = () => {
    const all = (realFixtures[table] ?? []).filter((row) => preds.every((p) => p(row)));
    const sliced = all.slice(from, Math.min(to + 1, from + limit, from + SERVER_MAX_ROWS));
    const rows = sliced.map((x) => ({ ...x }));
    return Promise.resolve({
      data: head ? null : single ? (rows[0] ?? null) : rows,
      error: null,
      count: all.length,
    });
  };
  const b: any = {
    select(_cols?: string, opts?: { head?: boolean }) {
      if (!isSelect) { isSelect = true; rec.reads.push(table); }
      if (opts?.head) head = true;
      return self;
    },
    eq(c: string, v: any) { preds.push((row) => row[c] === v); return self; },
    neq(c: string, v: any) { preds.push((row) => row[c] !== v); return self; },
    in(c: string, vals: any[]) {
      (rec.inSizes[table] ??= []).push(vals.length);
      const s = new Set(vals);
      preds.push((row) => s.has(row[c]));
      return self;
    },
    is(c: string, v: any) { preds.push((row) => (row[c] ?? null) === v); return self; },
    range(a: number, z: number) { from = a; to = z; return self; },
    limit(n: number) { limit = n; return self; },
    maybeSingle() { single = true; return self; },
    single() { single = true; return self; },
    then(res: any, rej: any) { return run().then(res, rej); },
    catch(rej: any) { return run().catch(rej); },
    finally(f: any) { return run().finally(f); },
  };
  // Tout autre opérateur (order, not, or, gte, lte, contains...) est accepté sans filtrer.
  const self: any = new Proxy(b, {
    get(t, p) {
      if (p in t) return t[p as string];
      return () => self;
    },
  });
  return self;
}

export function createRealSupabaseMock(rec: RealRecorder, userId: string) {
  const user = { id: userId, email: "test@example.com" };
  const session = { user, access_token: "t", expires_at: 9999999999 };
  const channel: any = new Proxy({}, { get: () => () => channel });
  return {
    from(table: string) {
      const bb = builder(table, rec);
      return new Proxy({}, {
        get(_t, p) {
          if (p === "select") return bb.select;
          // Écritures : aucun effet, aucune lecture comptée.
          return () => ({ then: (res: any) => Promise.resolve({ data: null, error: null }).then(res), eq: () => ({ then: (res: any) => Promise.resolve({ data: null, error: null }).then(res) }), select: () => ({ then: (res: any) => Promise.resolve({ data: null, error: null }).then(res), maybeSingle: () => Promise.resolve({ data: null, error: null }), single: () => Promise.resolve({ data: null, error: null }) }) });
        },
      });
    },
    rpc(name: string) {
      rec.reads.push(`rpc:${name}`);
      const p: any = Promise.resolve({ data: null, error: null });
      return new Proxy(p, { get: (t, k) => (k in t ? (t as any)[k].bind(t) : () => p) });
    },
    functions: { invoke(name: string) { rec.reads.push(`fn:${name}`); return Promise.resolve({ data: null, error: null }); } },
    auth: {
      getUser() { rec.reads.push("auth/v1/user"); return Promise.resolve({ data: { user }, error: null }); },
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

/** Vivier réaliste : 1 326 gardiens, 1 200 lignes d'affinité, avis, candidatures. */
export function buildRealisticOwnerFixtures(U: string) {
  const now = new Date().toISOString();
  const day = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
  const N = 1326;
  const id = (i: number) => `00000000-0000-4000-9000-${String(i).padStart(12, "0")}`;
  // Pseudo-aléatoire déterministe.
  let seed = 42;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const TYPES = [["Chiens"], ["Chats"], ["Chiens", "Chats"], ["Tous"], ["Chevaux"], []];
  const PACE = ["calme", "equilibre", "actif", null];
  const WORK = ["on_site", "remote", "office", null];
  const public_profiles: any[] = [];
  const affinity: any[] = [];
  const competences: any[] = [];
  const reviews: any[] = [];
  for (let i = 0; i < N; i++) {
    const uid = id(i);
    public_profiles.push({
      id: uid, first_name: `G${i}`, avatar_url: rnd() < 0.6 ? `a${i}.jpg` : null, city: "Lyon", postal_code: "69000",
      departement_code: "69", latitude_approx: 45.76 + (rnd() - 0.5) * 3, longitude_approx: 4.83 + (rnd() - 0.5) * 3,
      identity_verified: rnd() < 0.3, profile_completion: 50 + Math.floor(rnd() * 50), role: rnd() < 0.8 ? "sitter" : "both",
      completed_sits_count: Math.floor(rnd() * 5), skill_categories: [], custom_skills: [], available_for_help: false,
    });
    if (i < 1200) {
      affinity.push({
        user_id: uid, experience_years: rnd() < 0.5 ? "1-3" : null, life_pace: PACE[Math.floor(rnd() * 4)],
        lifestyle: rnd() < 0.4 ? ["Calme et posé"] : null, availability_during: null, has_vehicle: rnd() < 0.5 ? true : null,
        has_license: rnd() < 0.7 ? true : null, languages: rnd() < 0.3 ? ["Français", "Anglais"] : ["Français"],
        interests: rnd() < 0.4 ? ["Jardinage"] : [], work_during_sit: WORK[Math.floor(rnd() * 4)], sensitivities: [],
        animal_types: TYPES[Math.floor(rnd() * TYPES.length)], sitter_type: null, travels_with_children: null,
        travels_with_own_animals: null, special_animal_skills: [], farm_animals_ok: null,
      });
      competences.push({ user_id: uid, competences: rnd() < 0.3 ? ["Soins"] : [] });
    }
    if (rnd() < 0.25) reviews.push({ id: `r${i}`, reviewee_id: uid, reviewer_id: U, overall_rating: 3 + Math.floor(rnd() * 3), published: true, sit_id: null, created_at: now });
  }
  const appSitters = [id(5), id(900), id(1300)];
  return {
    profiles: [{ id: U, first_name: "Jérémie", role: "both", latitude: 45.76, longitude: 4.83, postal_code: "69001", city: "Lyon", profile_completion: 90, created_at: now, identity_verification_status: "verified" }],
    public_profiles,
    sitter_profiles_affinity: affinity,
    public_sitter_profiles: competences,
    sitter_profiles: [{ user_id: U, animal_types: ["Chiens"] }],
    owner_profiles: [{ user_id: U, presence_expected: "Sur place", home_ambiance: ["Calme et posé"], languages: ["Anglais"], interests: ["Jardinage"], life_pace: "calme", preferred_sitter_types: null }],
    sits: [
      { id: "t1", user_id: U, title: "Garde de Rex", city: "Lyon", status: "published", start_date: day(10), end_date: day(20), created_at: now, updated_at: now, accepting_applications: true, property_id: "p1", applications: appSitters.map((s, k) => ({ id: `a${k}`, status: "pending", sitter_id: s })) },
      { id: "t0", user_id: U, title: "Garde passée", city: "Lyon", status: "completed", start_date: day(-12), end_date: day(-5), created_at: now, updated_at: now, accepting_applications: false, property_id: "p1", applications: [] },
    ],
    applications: appSitters.map((s, k) => ({ id: `a${k}`, sit_id: "t1", sitter_id: s, status: "pending", created_at: now, sit: { title: "Garde de Rex", start_date: day(10), end_date: day(20), accepts_sitter_pets: null, accepts_sitter_children: null } })),
    properties: [{ id: "p1", user_id: U, type: "house", environment: "city_center", photos: [], car_required: true, created_at: now, pets: [{ species: "dog", special_needs: null, breed: "Labrador" }] }],
    pets: [{ id: "pet1", property_id: "p1", species: "dog", name: "Rex", breed: "Labrador", special_needs: null }],
    reviews: [...reviews, { id: "rme", reviewee_id: U, reviewer_id: id(3), overall_rating: 5, published: true, sit_id: "t0", created_at: now }],
    conversations: [{ id: "c1", owner_id: U, sitter_id: id(5), small_mission_id: null, updated_at: now, messages: [] }],
  } as Record<string, any[]>;
}
