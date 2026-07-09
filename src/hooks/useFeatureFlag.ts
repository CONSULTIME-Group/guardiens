/**
 * Lecture d'un feature flag stocké en base (`public.feature_flags`).
 *
 * Cache module-level partagé entre tous les composants pour éviter
 * la requête N fois par session. TTL 60 s pour propager rapidement
 * un changement fait dans /admin/settings sans redéploiement.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TTL_MS = 60_000;
const cache = new Map<string, { value: boolean; fetchedAt: number; inflight?: Promise<boolean> }>();

async function fetchFlag(key: string): Promise<boolean> {
  const { data } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .maybeSingle();
  return !!data?.enabled;
}

async function getFlag(key: string): Promise<boolean> {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && now - entry.fetchedAt < TTL_MS) return entry.value;
  if (entry?.inflight) return entry.inflight;
  const p = fetchFlag(key).then((v) => {
    cache.set(key, { value: v, fetchedAt: Date.now() });
    return v;
  }).catch(() => {
    // En cas d'erreur, on retombe sur la dernière valeur connue,
    // sinon false (safe : le flag ne bloque personne par défaut).
    const fallback = cache.get(key)?.value ?? false;
    cache.set(key, { value: fallback, fetchedAt: Date.now() });
    return fallback;
  });
  cache.set(key, { value: entry?.value ?? false, fetchedAt: entry?.fetchedAt ?? 0, inflight: p });
  return p;
}

export function useFeatureFlag(key: string): { enabled: boolean; loading: boolean } {
  const cached = cache.get(key);
  const [state, setState] = useState<{ enabled: boolean; loading: boolean }>(() => ({
    enabled: cached?.value ?? false,
    loading: !cached || Date.now() - cached.fetchedAt >= TTL_MS,
  }));

  useEffect(() => {
    let cancelled = false;
    getFlag(key).then((v) => {
      if (!cancelled) setState({ enabled: v, loading: false });
    });
    return () => { cancelled = true; };
  }, [key]);

  return state;
}

/** Force la relecture au prochain appel (utilisé par /admin/settings après toggle). */
export function invalidateFeatureFlag(key: string) {
  cache.delete(key);
}
