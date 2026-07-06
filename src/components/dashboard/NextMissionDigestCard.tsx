import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HeartHandshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAlmaFrequency } from "@/hooks/useAlmaFrequency";
import { trackEvent } from "@/lib/analytics";

/**
 * NextMissionDigestCard — équivalent NextDigestCard pour le digest entraide
 * hebdomadaire (mardi 10h). Affiché sur les dashboards gardien et propriétaire
 * si `email_preferences.new_mission_digest` est true.
 *
 * Kill switch : masqué si `alma_frequency = silent`.
 * Analytics : `next_mission_digest_card_seen` émis une seule fois par montage.
 */
const NextMissionDigestCard = () => {
  const { user } = useAuth();
  const { frequency } = useAlmaFrequency();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const seenFired = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("email_preferences")
        .select("new_mission_digest")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setEnabled(data?.new_mission_digest !== false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (enabled && frequency !== "silent" && !seenFired.current) {
      seenFired.current = true;
      try {
        trackEvent("next_mission_digest_card_seen", {});
      } catch {
        /* ignore */
      }
    }
  }, [enabled, frequency]);

  if (enabled !== true) return null;
  if (frequency === "silent") return null;

  return (
    <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-4 flex items-start gap-3">
      <div className="rounded-full bg-secondary/20 p-2 shrink-0">
        <HeartHandshake className="h-4 w-4 text-secondary-foreground" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-semibold">
          Fil d'entraide hebdomadaire
        </p>
        <p className="text-sm font-medium text-foreground mt-0.5">
          Prochain fil d'entraide mardi matin à 10h
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          On regarde ensemble ce qui bouge dans votre secteur : nouvelles demandes, coups de main proposés, questions ouvertes.
        </p>
        <Link
          to="/email-preferences"
          className="text-xs text-primary underline-offset-4 hover:underline mt-2 inline-block"
        >
          Gérer mes préférences
        </Link>
      </div>
    </div>
  );
};

export default NextMissionDigestCard;
