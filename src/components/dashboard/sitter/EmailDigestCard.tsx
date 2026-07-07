import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAlmaFrequency } from "@/hooks/useAlmaFrequency";
import { trackEvent } from "@/lib/analytics";

/**
 * EmailDigestCard — carte unique "Vos rendez-vous email" pour le dashboard
 * gardien. Fusionne l'ancien NextDigestCard (digest garde quotidien) et
 * NextMissionDigestCard (digest entraide hebdo). Un seul fetch, entraide en
 * tête.
 *
 * Kill switch : masquée si `alma_frequency = silent`.
 * Masquée si les deux préférences sont désactivées.
 * Analytics : `sitter_email_digest_card_seen` émis une seule fois par montage.
 */
const EmailDigestCard = () => {
  const { user } = useAuth();
  const { frequency, loading: freqLoading } = useAlmaFrequency();
  const [loading, setLoading] = useState(true);
  const [sitDigest, setSitDigest] = useState(true);
  const [missionDigest, setMissionDigest] = useState(true);
  const seenFired = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("email_preferences")
        .select("new_sit_digest, new_mission_digest")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setSitDigest(data?.new_sit_digest !== false);
      setMissionDigest(data?.new_mission_digest !== false);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isSilent = frequency === "silent";
  const anyEnabled = sitDigest || missionDigest;
  const visible = !loading && !freqLoading && !isSilent && anyEnabled;

  useEffect(() => {
    if (visible && !seenFired.current) {
      seenFired.current = true;
      try {
        trackEvent("sitter_email_digest_card_seen", {});
      } catch {
        /* ignore */
      }
    }
  }, [visible]);

  if (isSilent) return null;

  if (loading || freqLoading) {
    return (
      <div
        aria-hidden="true"
        className="rounded-2xl border border-border bg-muted/40 p-4 h-[132px] animate-pulse"
      />
    );
  }

  if (!anyEnabled) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
      <div className="rounded-full bg-primary/15 p-2 shrink-0">
        <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-semibold">
          Vos rendez-vous email
        </p>
        <p className="text-sm font-medium text-foreground mt-0.5">
          Chaque mardi, ce qui bouge en entraide autour de vous.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Et un mot dès qu'une garde correspond à votre profil.
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

export default EmailDigestCard;
