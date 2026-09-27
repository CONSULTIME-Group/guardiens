/**
 * Ligne « depuis votre dernière visite » de l'accueil propriétaire (lot D1).
 * Même source que WelcomeBackDigest (RPC get_activity_since_last_visit),
 * lue une fois par session. Ne renvoie une phrase que sur un signal réel.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "owner_digest_signals";

export function digestLine(s: { new_intl_sitters?: number; is_first_visit?: boolean } | null): string | null {
  if (!s || s.is_first_visit) return null;
  const n = s.new_intl_sitters ?? 0;
  if (n <= 0) return null;
  return n === 1
    ? "1 nouvelle personne s'est inscrite depuis votre dernière visite."
    : `${n} nouvelles personnes se sont inscrites depuis votre dernière visite.`;
}

export function useOwnerDigestLine(enabled: boolean): string | null {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    try {
      const cached = sessionStorage.getItem(KEY);
      if (cached) {
        setLine(digestLine(JSON.parse(cached)));
        return;
      }
    } catch { /* silencieux */ }
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("get_activity_since_last_visit" as any);
        if (cancelled || error || !data) return;
        try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch { /* silencieux */ }
        setLine(digestLine(data as any));
      } catch { /* ligne optionnelle */ }
    })();
    return () => { cancelled = true; };
  }, [enabled]);
  return line;
}
