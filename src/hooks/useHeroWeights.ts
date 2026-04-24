/**
 * Hook React qui expose les poids cibles de répartition des hero, lus depuis
 * la table `hero_weights` (singleton, lecture publique).
 *
 * - Lecture initiale + souscription realtime → tout changement admin se
 *   propage instantanément sans rechargement.
 * - Fallback sur les valeurs par défaut (40/20/20/20) si la requête échoue,
 *   pour garantir qu'un profil affiche toujours un hero même hors-ligne.
 *
 * Le hook retourne un objet stable (référence préservée tant que les valeurs
 * ne changent pas) → safe à passer en deps de useMemo / useEffect.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_HERO_WEIGHTS,
  type HeroWeights,
} from "@/lib/heroBank";

type Row = {
  weight_animals: number;
  weight_home: number;
  weight_mutual_aid: number;
  weight_village: number;
  updated_at: string;
};

function rowToWeights(row: Row): HeroWeights {
  return {
    animals: row.weight_animals,
    home: row.weight_home,
    mutual_aid: row.weight_mutual_aid,
    village: row.weight_village,
  };
}

// Cache module-level pour éviter de refetch à chaque montage de composant.
// Hydraté par le 1er hook qui s'abonne et mis à jour par les events realtime.
let cached: HeroWeights = DEFAULT_HERO_WEIGHTS;
let listeners: Array<(w: HeroWeights) => void> = [];
let initialFetchPromise: Promise<void> | null = null;

function notify(w: HeroWeights) {
  cached = w;
  listeners.forEach((l) => l(w));
}

function ensureInitialFetch() {
  if (initialFetchPromise) return initialFetchPromise;
  initialFetchPromise = (async () => {
    const { data, error } = await supabase
      .from("hero_weights")
      .select("weight_animals,weight_home,weight_mutual_aid,weight_village,updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (!error && data) notify(rowToWeights(data as Row));
  })();
  return initialFetchPromise;
}

// Une seule subscription realtime partagée par tous les hooks.
let channelStarted = false;
function ensureRealtimeChannel() {
  if (channelStarted) return;
  channelStarted = true;
  supabase
    .channel("hero_weights_changes")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "hero_weights" },
      (payload) => {
        const newRow = payload.new as Row | undefined;
        if (newRow) notify(rowToWeights(newRow));
      }
    )
    .subscribe();
}

export function useHeroWeights(): HeroWeights {
  const [weights, setWeights] = useState<HeroWeights>(cached);

  useEffect(() => {
    ensureInitialFetch();
    ensureRealtimeChannel();

    const listener = (w: HeroWeights) => setWeights(w);
    listeners.push(listener);
    // Synchronise avec la valeur cachée si elle a changé entre temps.
    if (cached !== weights) setWeights(cached);

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return weights;
}
