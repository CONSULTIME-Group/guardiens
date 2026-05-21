import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { snapToAllowedRadius } from "@/lib/alertRadius";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useNavigate } from "react-router-dom";

interface Params {
  city: string;
  cityPostalCode: string | null;
  radius: number[];
  setRadius: (r: number[]) => void;
  /** Clés qui doivent réinitialiser l'état "alerte créée" (ex: city, radius). */
  resetKeys: unknown[];
}

/**
 * Encapsule la création d'alerte depuis la recherche
 * (state + appel RPC + toasts d'erreur, snap rayon, fallback INVALID_RADIUS).
 */
export function useSearchAlert({ city, cityPostalCode, radius, setRadius, resetKeys }: Params) {
  const [alertCreated, setAlertCreated] = useState(false);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setAlertCreated(false); }, resetKeys);

  const handleCreateAlert = async () => {
    if (!city || alertCreated || isCreatingAlert) return;
    setIsCreatingAlert(true);

    let usedRadius = snapToAllowedRadius(radius[0]);
    let { data, error } = await supabase.rpc("create_alert_from_search", {
      p_city: city,
      p_postal_code: cityPostalCode ?? null,
      p_radius_km: usedRadius,
    });

    if (error && (error.message || "").includes("INVALID_RADIUS")) {
      console.warn("[create_alert_from_search] INVALID_RADIUS, retry with 15km", {
        attempted: usedRadius,
        original: radius[0],
      });
      usedRadius = 15;
      ({ data, error } = await supabase.rpc("create_alert_from_search", {
        p_city: city,
        p_postal_code: cityPostalCode ?? null,
        p_radius_km: usedRadius,
      }));
      if (!error) setRadius([usedRadius]);
    }

    setIsCreatingAlert(false);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("DOUBLON")) {
        toast({ title: "Vous avez déjà cette alerte", description: "Une alerte identique existe déjà pour cette zone." });
        setAlertCreated(true);
      } else if (msg.includes("MAX_ZONES")) {
        toast({
          variant: "destructive",
          title: "Maximum atteint",
          description: "Vous avez déjà 3 alertes actives. Supprimez-en une dans vos paramètres.",
          action: <ToastAction altText="Gérer mes alertes" onClick={() => navigate("/settings")}>Gérer</ToastAction>,
        });
      } else if (msg.includes("INVALID_CITY")) {
        toast({ variant: "destructive", title: "Ville requise", description: "Sélectionnez une ville avant de créer une alerte." });
      } else if (msg.includes("INVALID_RADIUS")) {
        toast({
          variant: "destructive",
          title: "Rayon non disponible",
          description: "Choisissez un rayon parmi 5, 15, 30, 50 ou 100 km, puis réessayez.",
        });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue. Veuillez réessayer." });
      }
    } else {
      toast({
        title: "Alerte créée",
        description: `Vous recevrez chaque matin les nouvelles gardes près de ${city} (rayon ${usedRadius} km).`,
        action: <ToastAction altText="Personnaliser" onClick={() => navigate("/settings")}>Personnaliser</ToastAction>,
      });
      setAlertCreated(true);
    }
  };

  return { alertCreated, isCreatingAlert, handleCreateAlert };
}
