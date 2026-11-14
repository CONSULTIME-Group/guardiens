import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { proposedAlertRadius, searchAlertRadius, snapToAllowedRadius } from "@/lib/alertRadius";
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
  /**
   * Lot A6 : adresse d'inscription d'un visiteur. Renseignée, aucun appel
   * d'alerte n'est fait (fonctions refusées à anon) : le visiteur part vers
   * l'inscription, sans toast d'erreur.
   */
  visitorSignupUrl?: string | null;
  /** Lot RCH4 : ville du profil, libellé de l'alerte quand aucune ville n'est cherchée. */
  homeCity?: string | null;
  /** Lot RCH4 : distance déclarée par le gardien (rayon de mobilité), sinon null. */
  declaredRadiusKm?: number | null;
}

/**
 * Encapsule la création d'alerte depuis la recherche
 * (state + appel RPC + toasts d'erreur, snap rayon, fallback INVALID_RADIUS).
 */
export function useSearchAlert({ city, cityPostalCode, userPostalCode, radius, setRadius, zoneMode = "radius", resetKeys, visitorSignupUrl = null, homeCity = null, declaredRadiusKm = null }: Params) {
  const [alertCreated, setAlertCreated] = useState(false);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setAlertCreated(false); }, resetKeys);

  const createConfiguredAlert = async () => {
    // Lot RCH4 (décision 3 de Jérémie) : depuis la France entière comme depuis
    // un rayon, l'alerte est un rayon autour de chez le gardien (le ciblage
    // mesure la distance depuis son profil, notify-sitters-on-publish), jamais
    // « France entière ». 30 km au moins ; France entière : rayon proposé
    // selon la distance déclarée (100 km sans déclaration).
    if (zoneMode === "france" || zoneMode === "radius") {
      const place = (city || homeCity || "").trim();
      const usedRadius = zoneMode === "france" ? proposedAlertRadius(declaredRadiusKm) : searchAlertRadius(radius[0]);
      const { data: existing } = await supabase
        .from("alert_preferences")
        .select("id")
        .eq("active", true)
        .eq("zone_type", "rayon")
        .eq("radius_km", usedRadius)
        .contains("alert_types", ["gardes"])
        .limit(1);
      if (existing && existing.length > 0) {
        return { error: { message: "DOUBLON" }, usedRadius, label: `${usedRadius} km` };
      }
      const { error } = await supabase.rpc("create_alert_preference", {
        p_label: place ? `Gardes · ${place} · ${usedRadius} km` : `Gardes · ${usedRadius} km de chez moi`,
        p_zone_type: "rayon",
        p_city: place || null,
        p_postal_code: (city ? cityPostalCode : userPostalCode) ?? null,
        p_radius_km: usedRadius,
        p_departement: null,
        p_region_code: null,
        p_alert_types: ["gardes"],
        p_heure_envoi: "08:00",
        p_frequence: "quotidien",
      });
      return { error, usedRadius, label: `${usedRadius} km` };
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

    // Région : rayon de 100 km autour de la ville cherchée (inchangé).
    if (!city) {
      return { error: { message: "INVALID_CITY" }, usedRadius: null as number | null, label: "ville" };
    }
    const usedRadius = snapToAllowedRadius(Math.max(radius[0], 100));
    const { error } = await supabase.rpc("create_alert_from_search", {
      p_city: city,
      p_postal_code: cityPostalCode ?? null,
      p_radius_km: usedRadius,
    });
    return { error, usedRadius, label: `${city} (${usedRadius} km)` };
  };

  const handleCreateAlert = async () => {
    if (visitorSignupUrl) {
      navigate(visitorSignupUrl);
      return;
    }
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
        // Lot RCH4 : l'email part à la publication, mesuré depuis chez le gardien.
        description: usedRadius
          ? `Zone enregistrée. Les nouvelles gardes à moins de ${usedRadius} km de chez vous arrivent par email, dès leur publication.`
          : `Zone enregistrée. Les nouvelles gardes sur ${label} arrivent par email, dès leur publication.`,
        action: <ToastAction altText="Personnaliser" onClick={() => navigate("/settings")}>Personnaliser</ToastAction>,
      });
      setAlertCreated(true);
    }
  };

  return { alertCreated, isCreatingAlert, handleCreateAlert };
}
