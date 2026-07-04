import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { snapToAllowedRadius } from "@/lib/alertRadius";
import { getDeptCode } from "@/lib/departments";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useNavigate } from "react-router-dom";

type ZoneMode = "radius" | "dept" | "region" | "france";

interface Params {
  city: string;
  cityPostalCode: string | null;
  userPostalCode?: string | null;
  radius: number[];
  setRadius: (r: number[]) => void;
  zoneMode?: ZoneMode;
  /** Clés qui doivent réinitialiser l'état "alerte créée" (ex: city, radius). */
  resetKeys: unknown[];
}

/**
 * Encapsule la création d'alerte depuis la recherche
 * (state + appel RPC + toasts d'erreur, snap rayon, fallback INVALID_RADIUS).
 */
export function useSearchAlert({ city, cityPostalCode, userPostalCode, radius, setRadius, zoneMode = "radius", resetKeys }: Params) {
  const [alertCreated, setAlertCreated] = useState(false);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setAlertCreated(false); }, resetKeys);

  const createConfiguredAlert = async () => {
    if (zoneMode === "france") {
      const { data: existing } = await supabase
        .from("alert_preferences")
        .select("id")
        .eq("active", true)
        .eq("zone_type", "region")
        .eq("region_code", "FR")
        .contains("alert_types", ["gardes"])
        .limit(1);

      if (existing && existing.length > 0) {
        return { error: { message: "DOUBLON" }, usedRadius: null as number | null, label: "France entière" };
      }

      const { error } = await supabase.rpc("create_alert_preference", {
        p_label: "Gardes · France entière",
        p_zone_type: "region",
        p_city: null,
        p_postal_code: null,
        p_radius_km: null,
        p_departement: null,
        p_region_code: "FR",
        p_alert_types: ["gardes"],
        p_heure_envoi: "08:00",
        p_frequence: "quotidien",
      });

      return { error, usedRadius: null as number | null, label: "France entière" };
    }

    if (zoneMode === "dept") {
      const deptCode = getDeptCode(cityPostalCode ?? userPostalCode ?? null);
      if (!deptCode) {
        return { error: { message: "INVALID_DEPARTMENT" }, usedRadius: null as number | null, label: "département" };
      }

      const { data: existing } = await supabase
        .from("alert_preferences")
        .select("id")
        .eq("active", true)
        .eq("zone_type", "departement")
        .eq("departement", deptCode)
        .contains("alert_types", ["gardes"])
        .limit(1);

      if (existing && existing.length > 0) {
        return { error: { message: "DOUBLON" }, usedRadius: null as number | null, label: `département ${deptCode}` };
      }

      const { error } = await supabase.rpc("create_alert_preference", {
        p_label: `Gardes · Département ${deptCode}`,
        p_zone_type: "departement",
        p_city: null,
        p_postal_code: null,
        p_radius_km: null,
        p_departement: deptCode,
        p_region_code: null,
        p_alert_types: ["gardes"],
        p_heure_envoi: "08:00",
        p_frequence: "quotidien",
      });

      return { error, usedRadius: null as number | null, label: `département ${deptCode}` };
    }

    if (!city) {
      return { error: { message: "INVALID_CITY" }, usedRadius: null as number | null, label: "ville" };
    }

    let usedRadius = snapToAllowedRadius(radius[0]);
    let { error } = await supabase.rpc("create_alert_from_search", {
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
      ({ error } = await supabase.rpc("create_alert_from_search", {
        p_city: city,
        p_postal_code: cityPostalCode ?? null,
        p_radius_km: usedRadius,
      }));
      if (!error) setRadius([usedRadius]);
    }

    return { error, usedRadius, label: `${city} (${usedRadius} km)` };
  };

  const handleCreateAlert = async () => {
    if (alertCreated || isCreatingAlert) return;
    setIsCreatingAlert(true);

    const { error, usedRadius, label } = await createConfiguredAlert();

    setIsCreatingAlert(false);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("DOUBLON")) {
        toast({ title: "Vous avez déjà cette alerte", description: "Une alerte identique existe déjà pour cette zone." });
        setAlertCreated(true);
      } else if (msg.includes("MAX_ZONES") || msg.includes("Maximum 3")) {
        toast({
          variant: "destructive",
          title: "Maximum atteint",
          description: "Vous avez déjà 3 alertes actives. Supprimez-en une dans vos paramètres.",
          action: <ToastAction altText="Gérer mes alertes" onClick={() => navigate("/settings")}>Gérer</ToastAction>,
        });
      } else if (msg.includes("INVALID_CITY")) {
        toast({ variant: "destructive", title: "Ville requise", description: "Sélectionnez une ville avant de créer une alerte." });
      } else if (msg.includes("INVALID_DEPARTMENT")) {
        toast({ variant: "destructive", title: "Département indisponible", description: "Sélectionnez une ville avec code postal avant de créer cette alerte." });
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
        description: usedRadius
          ? `Vous recevrez chaque matin les nouvelles gardes près de ${city} (rayon ${usedRadius} km).`
          : `Vous recevrez chaque matin les nouvelles gardes sur ${label}.`,
        action: <ToastAction altText="Personnaliser" onClick={() => navigate("/settings")}>Personnaliser</ToastAction>,
      });
      setAlertCreated(true);
    }
  };

  return { alertCreated, isCreatingAlert, handleCreateAlert };
}
