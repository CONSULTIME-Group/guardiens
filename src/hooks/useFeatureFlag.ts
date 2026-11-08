/**
 * Lecture d'un feature flag stocké en base (`public.feature_flags`).
 *
 * Cache module-level partagé entre tous les composants pour éviter
 * la requête N fois par session. TTL 60 s pour propager rapidement
 * un changement fait dans /admin/settings sans redéploiement.
 *
 * Renvoie aussi `appliesSince` (date de bascule optionnelle) qui permet
 * aux consommateurs de scoper l'effet du flag à une population précise
 * (par exemple, uniquement les comptes créés après cette date).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TTL_MS = 60_000;

interface FlagValue {
  enabled: boolean;
  appliesSince: string | null;
}
interface CacheEntry {
  value: FlagValue;
  fetchedAt: number;
  inflight?: Promise<FlagValue>;
}
const cache = new Map<string, CacheEntry>();

const OFF: FlagValue = { enabled: false, appliesSince: null };

/**
 * Lot ONB1 : les drapeaux demandés au même instant (même rendu, plusieurs
 * composants) partent en une seule lecture `.in("key", …)`. Budget P1b :
 * la coquille lit arrival_v2 et la porte d'affinité mandatory_affinity_onboarding.
 */
let pendingKeys = new Set<string>();
let pendingBatch: Promise<Map<string, FlagValue>> | null = null;

function fetchFlag(key: string): Promise<FlagValue> {
  pendingKeys.add(key);
  if (!pendingBatch) {
    pendingBatch = Promise.resolve().then(async () => {
      const keys = [...pendingKeys];
      pendingKeys = new Set();
      pendingBatch = null;
      const { data } = await supabase
        .from("feature_flags")
        .select("key, enabled, applies_since")
        .in("key", keys);
      const out = new Map<string, FlagValue>();
      for (const row of (data ?? []) as Array<{ key?: string; enabled?: boolean | null; applies_since?: string | null }>) {
        if (row?.key) out.set(row.key, { enabled: !!row.enabled, appliesSince: row.applies_since ?? null });
      }
      return out;
    });
  }
  return pendingBatch.then((m) => m.get(key) ?? OFF);
}

export async function getFlag(key: string): Promise<FlagValue> {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && now - entry.fetchedAt < TTL_MS) return entry.value;
  if (entry?.inflight) return entry.inflight;
  const p = fetchFlag(key).then((v) => {
    cache.set(key, { value: v, fetchedAt: Date.now() });
    return v;
  }).catch(() => {
    const fallback = cache.get(key)?.value ?? { enabled: false, appliesSince: null };
    cache.set(key, { value: fallback, fetchedAt: Date.now() });
    return fallback;
  });
  cache.set(key, {
    value: entry?.value ?? { enabled: false, appliesSince: null },
    fetchedAt: entry?.fetchedAt ?? 0,
    inflight: p,
  });
  return p;
}

export function useFeatureFlag(key: string): {
  enabled: boolean;
  appliesSince: string | null;
  loading: boolean;
} {
  const cached = cache.get(key);
  const [state, setState] = useState(() => ({
    enabled: cached?.value.enabled ?? false,
    appliesSince: cached?.value.appliesSince ?? null,
    loading: !cached || Date.now() - cached.fetchedAt >= TTL_MS,
  }));

  useEffect(() => {
    let cancelled = false;
    getFlag(key).then((v) => {
      if (!cancelled) setState({ enabled: v.enabled, appliesSince: v.appliesSince, loading: false });
    });
    return () => { cancelled = true; };
  }, [key]);

  return state;
}

/** Force la relecture au prochain appel (utilisé par /admin/settings après toggle). */
export function invalidateFeatureFlag(key: string) {
  cache.delete(key);
}
