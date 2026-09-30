/**
 * Lectures groupées par identifiants (lot P1b).
 *
 * Les cartes du tableau de bord lisent les profils publics, les avis, les
 * données d'affinité et les compétences d'autres membres. Chaque bloc
 * faisait sa propre lecture `.in(...)`. Ici, un chargeur par source :
 *  - les demandes émises dans la même fenêtre (40 ms) partent en UNE
 *    lecture, par lots de 150 identifiants (limite de longueur d'URL) ;
 *  - les identifiants déjà lus (5 min) ne sont jamais relus ;
 *  - les colonnes sont communes à tous les lecteurs de la source.
 * Aucun filtre ajouté au vivier : on lit exactement les identifiants
 * demandés, les absents renvoient une liste vide.
 */
import { supabase } from "@/integrations/supabase/client";
import { chunkArray } from "@/lib/chunkArray";
import { getAppQueryClient, onAppQueryCacheClear } from "@/lib/appQueryClient";

const WINDOW_MS = 40;
const TTL_MS = 5 * 60 * 1000;
const BATCH = 150;

type Row = Record<string, any>;

export interface IdLoader {
  /** Lignes par identifiant demandé (liste vide si aucune). */
  load(ids: string[]): Promise<Map<string, Row[]>>;
  /** Lignes à plat, dans l'ordre des identifiants, forme `{ data, error }`. */
  rows(ids: string[]): Promise<{ data: Row[]; error: unknown }>;
  /** Amorce le cache avec des lignes déjà lues (mêmes colonnes). */
  prime(rows: Row[], ids?: string[]): void;
  clear(): void;
}

export function createIdLoader(opts: {
  table: string;
  idColumn: string;
  columns: string;
  filter?: (q: any) => any;
  /** Taille de lot (défaut 150 identifiants par requête). */
  batch?: number;
  /** Lecture plus large en cours qui amorcera le cache : on l'attend. */
  waitFor?: () => Promise<unknown> | null;
}): IdLoader {
  const batchSize = opts.batch ?? BATCH;
  const cache = new Map<string, { at: number; rows: Row[] }>();
  const inflight = new Map<string, Promise<void>>();
  let queue = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let waiters: Array<{ resolve: () => void; reject: (e: unknown) => void }> = [];

  const fresh = (id: string) => {
    const c = cache.get(id);
    return !!c && Date.now() - c.at < TTL_MS;
  };

  const flush = async () => {
    timer = null;
    const ids = Array.from(queue);
    const myWaiters = waiters;
    queue = new Set();
    waiters = [];
    try {
      const results = await Promise.all(
        chunkArray(ids, batchSize).map((batch) => {
          let q = (supabase.from(opts.table as any) as any).select(opts.columns).in(opts.idColumn, batch);
          if (opts.filter) q = opts.filter(q);
          return q;
        }),
      );
      const err = results.find((r: any) => r?.error)?.error;
      if (err) throw err;
      const at = Date.now();
      const grouped = new Map<string, Row[]>();
      for (const id of ids) grouped.set(id, []);
      for (const r of results) for (const row of ((r as any).data ?? []) as Row[]) {
        const k = row[opts.idColumn];
        if (grouped.has(k)) grouped.get(k)!.push(row);
      }
      for (const [id, rows] of grouped) cache.set(id, { at, rows });
      myWaiters.forEach((w) => w.resolve());
    } catch (e) {
      myWaiters.forEach((w) => w.reject(e));
    } finally {
      ids.forEach((id) => inflight.delete(id));
    }
  };

  const direct = async (wanted: string[]) => {
    const results = await Promise.all(
      chunkArray(wanted, batchSize).map((batch) => {
        let q = (supabase.from(opts.table as any) as any).select(opts.columns).in(opts.idColumn, batch);
        if (opts.filter) q = opts.filter(q);
        return q;
      }),
    );
    const err = results.find((r: any) => r?.error)?.error;
    if (err) throw err;
    const out = new Map<string, Row[]>();
    for (const id of wanted) out.set(id, []);
    for (const r of results) for (const row of ((r as any).data ?? []) as Row[]) out.get(row[opts.idColumn])?.push(row);
    return out;
  };

  const load = async (ids: string[]) => {
    const wanted = Array.from(new Set(ids.filter(Boolean)));
    if (wanted.length === 0) return new Map<string, Row[]>();
    // Hors application (tests unitaires) : lecture directe, aucun état partagé.
    if (!getAppQueryClient()) return direct(wanted);
    const prior = opts.waitFor?.();
    if (prior) await prior.catch(() => undefined);
    const pending: Promise<void>[] = [];
    const missing = wanted.filter((id) => !fresh(id) && !inflight.has(id));
    if (missing.length > 0) {
      const p = new Promise<void>((resolve, reject) => waiters.push({ resolve, reject }));
      missing.forEach((id) => { queue.add(id); inflight.set(id, p); });
      if (!timer) timer = setTimeout(() => { void flush(); }, WINDOW_MS);
    }
    for (const id of wanted) {
      const p = inflight.get(id);
      if (p && !pending.includes(p)) pending.push(p);
    }
    await Promise.all(pending);
    const out = new Map<string, Row[]>();
    for (const id of wanted) out.set(id, (cache.get(id)?.rows ?? []).map((r) => ({ ...r })));
    return out;
  };

  return {
    load,
    async rows(ids) {
      try {
        const m = await load(ids);
        return { data: Array.from(m.values()).flat(), error: null };
      } catch (error) {
        return { data: [], error };
      }
    },
    prime(rows, ids) {
      if (!getAppQueryClient()) return;
      const at = Date.now();
      const grouped = new Map<string, Row[]>();
      // Identifiants lus sans ligne : mémorisés vides, jamais relus.
      for (const id of ids ?? []) grouped.set(id, []);
      for (const row of rows) {
        const k = row[opts.idColumn];
        if (!k) continue;
        if (!grouped.has(k)) grouped.set(k, []);
        grouped.get(k)!.push(row);
      }
      for (const [id, r] of grouped) cache.set(id, { at, rows: r });
    },
    clear() { cache.clear(); },
  };
}

/** Profils publics d'autres membres (vue public_profiles). */
export const PUBLIC_PROFILE_COLUMNS =
  "id, first_name, avatar_url, city, postal_code, departement_code, latitude_approx, longitude_approx, identity_verified, profile_completion, role, completed_sits_count, skill_categories, custom_skills";
let publicProfilesPrimer: Promise<unknown> | null = null;
/** Le vivier de gardiens signale sa lecture en cours (fetchSitterPool). */
export function setPublicProfilesPrimer(p: Promise<unknown> | null) {
  publicProfilesPrimer = p;
}
export const publicProfilesLoader = createIdLoader({
  table: "public_profiles",
  idColumn: "id",
  columns: PUBLIC_PROFILE_COLUMNS,
  waitFor: () => publicProfilesPrimer,
});

/** Avis publiés reçus par des membres. */
export const publishedReviewsLoader = createIdLoader({
  table: "reviews",
  idColumn: "reviewee_id",
  columns: "reviewee_id, overall_rating",
  filter: (q) => q.eq("published", true),
});

/** Données d'affinité des gardiens (vue sitter_profiles_affinity, toutes colonnes). */
export const sitterAffinityLoader = createIdLoader({
  table: "sitter_profiles_affinity",
  idColumn: "user_id",
  columns: "*",
  // Lot P4 : 350 identifiants par requête (environ 13 Ko d'URL, sous la
  // limite mesurée d'environ 390) : les 600 gardiens scorés et les candidats en 2 requêtes.
  batch: 350,
});

/** Compétences publiques des gardiens. */
export const sitterCompetencesLoader = createIdLoader({
  table: "public_sitter_profiles",
  idColumn: "user_id",
  columns: "user_id, competences",
});

/** Vide tous les chargeurs (déconnexion, tests). */
export function clearBatchedReads() {
  publicProfilesLoader.clear();
  publishedReviewsLoader.clear();
  sitterAffinityLoader.clear();
  sitterCompetencesLoader.clear();
}

onAppQueryCacheClear(clearBatchedReads);
