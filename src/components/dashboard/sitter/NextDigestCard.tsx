import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";

/**
 * Carte "Prochain digest ce soir à 20h" — affichée sur le dashboard gardien
 * uniquement si le sitter a opté-in au digest quotidien
 * (email_preferences.new_sit_digest = true).
 * Fire sitter_next_digest_card_seen une seule fois par montage.
 */
const NextDigestCard = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const seenFired = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("email_preferences")
        .select("new_sit_digest")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setEnabled(data?.new_sit_digest !== false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (enabled && !seenFired.current) {
      seenFired.current = true;
      try { trackEvent("sitter_next_digest_card_seen", {}); } catch {}
    }
  }, [enabled]);

  if (enabled !== true) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
      <div className="rounded-full bg-primary/15 p-2 shrink-0">
        <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-semibold">
          Digest quotidien
        </p>
        <p className="text-sm font-medium text-foreground mt-0.5">
          Prochain envoi ce soir à 20h
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Les 3 annonces les plus compatibles publiées ces dernières 24h, envoyées par email.
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

export default NextDigestCard;
