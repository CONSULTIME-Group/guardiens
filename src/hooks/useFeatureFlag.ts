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

async function fetchFlag(key: string): Promise<FlagValue> {
  const { data } = await supabase
    .from("feature_flags")
    .select("enabled, applies_since")
    .eq("key", key)
    .maybeSingle();
  const row = data as { enabled?: boolean | null; applies_since?: string | null } | null;
  return {
    enabled: !!row?.enabled,
    appliesSince: row?.applies_since ?? null,
  };
}

async function getFlag(key: string): Promise<FlagValue> {
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
