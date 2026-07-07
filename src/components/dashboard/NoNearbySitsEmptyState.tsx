/**
 * Empty state pour un nouveau gardien qui n'a aucune annonce scorable
 * dans son rayon local. On propose une inscription à l'alerte email
 * (dédup si l'utilisateur en a déjà une active du même type) puis
 * 3 cartes secondaires pour éviter le vide.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

interface Props {
  totalPublishedSits: number;
  radiusKm?: number;
  postalCode?: string | null;
}

const NoNearbySitsEmptyState = ({
  totalPublishedSits,
  radiusKm = 30,
  postalCode,
}: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alertActive, setAlertActive] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentRadius, setCurrentRadius] = useState<number>(radiusKm);

  useEffect(() => {
    void trackEvent("sitter_no_nearby_empty_state_seen", {
      source: "dashboard",
      metadata: { total_published: totalPublishedSits, radius_km: radiusKm },
    });
  }, [totalPublishedSits, radiusKm]);

  useEffect(() => {
    if (!user?.id) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("alert_preferences")
        .select("id, radius_km, active")
        .eq("user_id", user.id)
        .eq("active", true)
        .eq("zone_type", "rayon")
        .contains("alert_types", ["gardes"])
        .limit(1);
      if (!cancel) {
        setAlertActive(!!(data && data.length > 0));
        if (data && data[0]?.radius_km) setCurrentRadius(data[0].radius_km);
      }
    })();
    return () => { cancel = true; };
  }, [user?.id]);

  const subscribe = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("create_alert_preference", {
        p_label: postalCode ? `Gardes · autour de ${postalCode}` : "Gardes · autour de chez moi",
        p_zone_type: "rayon",
        p_city: null,
        p_postal_code: postalCode ?? null,
        p_radius_km: currentRadius,
        p_departement: null,
        p_region_code: null,
        p_alert_types: ["gardes", "new_sit"],
        p_heure_envoi: "08:00",
        p_frequence: "quotidien",
      });
      if (error) throw error;

      // Active en parallèle le digest quotidien pour cohérence : le gardien
      // qui active une alerte reçoit aussi le digest 20h.
      await supabase
        .from("email_preferences")
        .upsert(
          { user_id: user.id, new_sit_digest: true },
          { onConflict: "user_id" },
        );

      setAlertActive(true);
      toast({
        title: "Alerte activée",
        description: `Chaque soir à 20h, vous recevez un email récapitulatif des annonces qui correspondent à votre profil dans un rayon de ${currentRadius} km.`,
      });
      void trackEvent("sitter_alert_subscribed", {
        source: "dashboard_empty_state",
        metadata: { type: "new_sit_in_radius", radius_km: currentRadius, digest_enabled: true },
      });
      void trackEvent("sitter_alert_confirmation_seen", {
        source: "dashboard_empty_state",
        metadata: { radius_km: currentRadius },
      });
    } catch (e: any) {
      toast({
        title: "Impossible d'activer l'alerte",
        description: e?.message ?? "Réessayez plus tard.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const secondary = [
    {
      type: "breeds" as const,
      title: "Fiches races",
      description: "75 races documentées.",
      to: "/races",
    },
    {
      type: "guides" as const,
      title: "Guides villes",
      description: "54 villes explorées.",
      to: "/guides",
    },
  ];

  return (
    <section
      aria-labelledby="no-nearby-empty-state-heading"
      className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8"
    >
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold mb-2">
          Aucune annonce disponible
        </p>
        <h2
          id="no-nearby-empty-state-heading"
          className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-tight"
        >
          Rien dans votre rayon aujourd'hui.
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Guardiens grandit chaque semaine. Il y a actuellement{" "}
          <strong className="text-foreground">{totalPublishedSits.toLocaleString("fr-FR")}</strong>{" "}
          annonce{totalPublishedSits > 1 ? "s" : ""} publiée{totalPublishedSits > 1 ? "s" : ""} en France,
          {" "}dont aucune dans un rayon de {currentRadius} km autour de vous.
        </p>

        <div className="mt-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            Un coup de main à donner ?
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            En attendant une garde, rendez un coup de main près de chez vous. C'est ouvert à tous, sans abonnement.
          </p>
          <div className="mt-3">
            <Button asChild>
              <Link
                to="/petites-missions"
                onClick={() =>
                  void trackEvent("dashboard_cta_clicked", {
                    source: "dashboard_empty_state",
                    metadata: { cta: "mutual_aid_empty_state", is_first_time: false, user_role: "sitter" },
                  })
                }
              >
                Voir les coups de main près de chez vous
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {alertActive ? (
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
              Alerte déjà configurée. Vous êtes prévenu par email dès qu'une annonce
              est publiée dans votre rayon.{" "}
              <Link to="/settings#alerts" className="text-primary underline-offset-4 hover:underline">
                Modifier le rayon
              </Link>
            </div>
          ) : (
            <Button variant="outline" onClick={subscribe} disabled={saving || alertActive === null}>
              M'alerter dès qu'une annonce est publiée près de chez moi
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold mb-3">
          En attendant
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {secondary.map((card) => (
            <Link
              key={card.type}
              to={card.to}
              className="rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
              onClick={() =>
                void trackEvent("sitter_secondary_card_clicked", {
                  source: "dashboard_empty_state",
                  metadata: { type: card.type },
                })
              }
            >
              <p className="text-sm font-semibold text-foreground">{card.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NoNearbySitsEmptyState;
