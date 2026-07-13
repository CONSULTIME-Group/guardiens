/**
 * Charge une fois (par session) le profil gardien du visiteur connecté,
 * pour permettre le calcul d'affinité côté gardien qui consulte une annonce
 * ou la vue publique d'un sit (PublicSitView, etc.).
 *
 * Symétrique de useViewerOwnerForAffinity. Cache module-level pour éviter
 * une refetch par carte dans une liste.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { AffinitySitterInput } from "@/lib/affinityScore";

type Loaded = AffinitySitterInput | null;

const cache = new Map<string, Promise<Loaded>>();

async function fetchSitter(userId: string): Promise<Loaded> {
  const { data } = await supabase
    .from("sitter_profiles")
    .select(
      "animal_types, life_pace, languages, interests, work_during_sit, sensitivities, special_animal_skills, sitter_type, experience_years, travels_with_children, travels_with_own_animals",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return data as AffinitySitterInput;
}

export function useViewerSitterForAffinity(): {
  sitter: Loaded;
  loading: boolean;
} {
  const { user } = useAuth();
  const [state, setState] = useState<{ sitter: Loaded; loading: boolean }>({
    sitter: null,
    loading: !!user,
  });

  useEffect(() => {
    if (!user) {
      setState({ sitter: null, loading: false });
      return;
    }
    let cancelled = false;
    let p = cache.get(user.id);
    if (!p) {
      p = fetchSitter(user.id);
      cache.set(user.id, p);
    }
    setState((s) => ({ ...s, loading: true }));
    p.then((sitter) => {
      if (!cancelled) setState({ sitter, loading: false });
    }).catch(() => {
      if (!cancelled) setState({ sitter: null, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}

/** Permet d'invalider le cache après une édition de profil gardien. */
export function clearViewerSitterCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}
