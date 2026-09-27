/**
 * Lignes « depuis votre dernière visite » des accueils (lots D1 et D2).
 * Même source que WelcomeBackDigest (RPC get_activity_since_last_visit),
 * lue une fois par session et partagée par les deux rôles (même clé de
 * cache) : la bascule de rôle ne relance pas la lecture. Ne renvoie une
 * phrase que sur un signal réel.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "owner_digest_signals";

type DigestSignals = {
  new_intl_sitters?: number;
  new_sits_nearby?: number;
  is_first_visit?: boolean;
};

export function digestLine(s: DigestSignals | null): string | null {
  if (!s || s.is_first_visit) return null;
  const n = s.new_intl_sitters ?? 0;
  if (n <= 0) return null;
  return n === 1
    ? "1 nouvelle personne s'est inscrite depuis votre dernière visite."
    : `${n} nouvelles personnes se sont inscrites depuis votre dernière visite.`;
}

/** Lot D2 : ligne gardien, nouvelles gardes proches depuis la dernière visite. */
export function sitterDigestLine(s: DigestSignals | null): string | null {
  if (!s || s.is_first_visit) return null;
  const n = s.new_sits_nearby ?? 0;
  if (n <= 0) return null;
  return n === 1
    ? "1 nouvelle garde près de chez vous depuis votre dernière visite."
    : `${n} nouvelles gardes près de chez vous depuis votre dernière visite.`;
}

function useDigestSignals(enabled: boolean, toLine: (s: DigestSignals | null) => string | null): string | null {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    try {
      const cached = sessionStorage.getItem(KEY);
      if (cached) {
        setLine(toLine(JSON.parse(cached)));
        return;
      }
    } catch { /* silencieux */ }
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("get_activity_since_last_visit" as any);
        if (cancelled || error || !data) return;
        try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch { /* silencieux */ }
        setLine(toLine(data as any));
      } catch { /* ligne optionnelle */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return line;
}

export function useOwnerDigestLine(enabled: boolean): string | null {
  return useDigestSignals(enabled, digestLine);
}

export function useSitterDigestLine(enabled: boolean): string | null {
  return useDigestSignals(enabled, sitterDigestLine);
}
