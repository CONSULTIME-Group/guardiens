import { fetchMyProfile } from "@/lib/myProfile";
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
/** Rayon d'entraide du membre disponible pour aider, sinon null (partagé, lot D1). */
/**
 * availableForHelp : undefined = non fourni (lecture du profil habituelle),
 * null = le parent charge encore le profil (on attend), true/false = valeur
 * déjà lue par le parent (aucune relecture du profil).
 */
export function useMutualAidRadiusKm(availableForHelp?: boolean | null): number | null {
  const { user } = useAuth();
  const [km, setKm] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id || availableForHelp === null) return;
    if (availableForHelp === false) { setKm(null); return; }
    let active = true;
    void (async () => {
      try {
      if (availableForHelp === undefined) {
        const { data: profile } = await fetchMyProfile(user.id!);
        if (!profile?.available_for_help) return;
      }
      const { data } = await supabase.rpc("my_mutual_aid_radius_km");
      if (active && typeof data === "number") setKm(data);
      } catch {
        // Ligne informative : un échec de lecture la laisse simplement absente.
      }
    })();
    return () => { active = false; };
  }, [user?.id, availableForHelp]);
  return km;
}

const MutualAidRadiusLine = ({ className = "", availableForHelp }: { className?: string; availableForHelp?: boolean | null }) => {
  const km = useMutualAidRadiusKm(availableForHelp);
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
