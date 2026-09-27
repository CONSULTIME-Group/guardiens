import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/** Réglage unique : les préférences d'alerte (alert_preferences). */
export const ALERT_SETTINGS_PATH = "/settings?section=alerts";

export const radiusLineText = (km: number) => `Vous recevez les besoins dans un rayon de ${km} km.`;

/**
 * Une ligne pour la personne disponible pour un coup de main : son rayon
 * actuel et le lien vers le réglage existant.
 */
const MutualAidRadiusLine = ({ className = "" }: { className?: string }) => {
  const { user } = useAuth();
  const [km, setKm] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("available_for_help")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.available_for_help) return;
      const { data } = await supabase.rpc("my_mutual_aid_radius_km");
      if (active && typeof data === "number") setKm(data);
    })();
    return () => { active = false; };
  }, [user?.id]);

  if (km === null) return null;

  return (
    <p className={`text-sm text-muted-foreground ${className}`}>
      {radiusLineText(km)}{" "}
      <Link to={ALERT_SETTINGS_PATH} className="font-medium text-primary underline-offset-4 hover:underline">
        Modifier
      </Link>
    </p>
  );
};

export default MutualAidRadiusLine;
