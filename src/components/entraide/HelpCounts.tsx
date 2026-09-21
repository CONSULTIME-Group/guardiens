import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Phrase de compteur, affichée seulement à partir du premier coup de main. */
export const helpCountsLabel = (given: number, received: number): string | null => {
  const parts: string[] = [];
  if (given > 0) parts.push(`${given} coup${given > 1 ? "s" : ""} de main donné${given > 1 ? "s" : ""}`);
  if (received > 0) parts.push(`${received} reçu${received > 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(", ") : null;
};

/** Compteur public de coups de main, sur la carte de personne et la fiche membre. */
const HelpCounts = ({ userId, className = "" }: { userId: string; className?: string }) => {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("public_help_counts")
        .select("given_count, received_count")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled || !data) return;
      setLabel(helpCountsLabel(data.given_count || 0, data.received_count || 0));
    };
    void load();
    return () => { cancelled = true; };
  }, [userId]);

  if (!label) return null;
  return <p className={`text-xs font-semibold text-primary ${className}`}>{label}</p>;
};

export default HelpCounts;
