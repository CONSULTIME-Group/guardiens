/**
 * Empty state premium 3 parties pour le dashboard gardien.
 * Statut + enseignement + un seul CTA dominant.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserCircle, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";


interface Props {
  totalPublishedSits: number;
  radiusKm?: number;
  postalCode?: string | null;
  /**
   * "no_nearby"       : profil suffisant, mais aucune annonce ouverte
   *                     dans le département/région (message distance).
   * "profile_incomplete" : le pool retourne 0 parce que le profil du
   *                     gardien manque de critères d'affinité — on invite
   *                     à compléter le profil, pas à changer de zone.
   */
  variant?: "no_nearby" | "profile_incomplete";
}

const NoNearbySitsEmptyState = ({
  totalPublishedSits,
  radiusKm = 30,
  postalCode,
  variant = "no_nearby",
}: Props) => {
  const { user } = useAuth();
  const [alertActive, setAlertActive] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const isProfileIncomplete = variant === "profile_incomplete";
  const currentRadius = radiusKm;

  useEffect(() => {
    void trackEvent("sitter_no_nearby_empty_state_seen", {
      source: "dashboard",
      metadata: {
        total_published: totalPublishedSits,
        radius_km: radiusKm,
        variant,
      },
    });
  }, [totalPublishedSits, radiusKm, variant]);

  useEffect(() => {
    if (isProfileIncomplete || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("alert_preferences")
        .select("id, alert_types")
        .eq("user_id", user.id)
        .eq("active", true)
        .eq("zone_type", "rayon")
        .contains("alert_types", ["gardes"])
        .limit(1);
      if (!cancelled) {
        const active = Array.isArray(data) && data.length > 0;
        setAlertActive(active);
        if (active) {
          void trackEvent("sitter_alert_confirmation_seen", {
            source: "dashboard_empty_state",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isProfileIncomplete]);

  const subscribe = async () => {
    if (!user?.id || saving) return;
    setSaving(true);
    try {
      const label = postalCode
        ? `Autour de ${postalCode} (${currentRadius} km)`
        : `Autour de moi (${currentRadius} km)`;
      const { error } = await supabase.rpc("create_alert_preference", {
        p_label: label,
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
      const { error: prefErr } = await supabase
        .from("email_preferences")
        .upsert(
          { user_id: user.id, new_sit_digest: true },
          { onConflict: "user_id" },
        );
      if (prefErr) throw prefErr;
      setAlertActive(true);
      void trackEvent("sitter_alert_subscribed", {
        source: "dashboard_empty_state",
        metadata: { radius_km: currentRadius, postal_code: postalCode ?? null },
      });
      toast.success("Alerte activée, vous serez prévenu par email.");
    } catch (e) {
      toast.error("Impossible d'activer l'alerte pour le moment.");
    } finally {
      setSaving(false);
    }
  };

  const eyebrow = isProfileIncomplete ? "Profil à compléter" : "Aucune annonce proche";
  const title = isProfileIncomplete
    ? "Complétez votre profil pour être visible"
    : "Votre profil est en veille active";
  const teaching = isProfileIncomplete
    ? "Un profil complet vous rend visible et déclenche les correspondances."
    : "Les propriétaires proches vous verront dès qu'ils publieront, on vous prévient.";
  const ctaHref = isProfileIncomplete ? "/profile" : "/search";
  const ctaLabel = isProfileIncomplete ? "Compléter mon profil" : "Élargir ma recherche";
  const ctaEvent = isProfileIncomplete ? "complete_profile_empty_state" : "expand_search_empty_state";
  const Icon = isProfileIncomplete ? UserCircle : Search;

  return (
    <section
      aria-labelledby="no-nearby-empty-state-heading"
      className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8"
    >

      <div className="notebook-card relative p-6 sm:p-8 text-center">
        <div className="notebook-card-paper absolute inset-0" aria-hidden="true" />
        <div className="relative">
        <div
          className="illustration-blend animate-painted-reveal mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            backgroundImage: [
              "radial-gradient(ellipse at 30% 30%, hsl(var(--primary) / 0.32), transparent 62%)",
              "radial-gradient(ellipse at 70% 62%, hsl(var(--secondary) / 0.36), transparent 66%)",
              "radial-gradient(ellipse at 50% 82%, hsl(var(--founder) / 0.26), transparent 72%)",
            ].join(", "),
          }}
        >
          <Icon className="h-7 w-7 text-foreground/70" aria-hidden="true" />
        </div>

        <p className="font-heading italic text-sm text-accent mb-2">
          {eyebrow}
        </p>

        <h2
          id="no-nearby-empty-state-heading"
          className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-tight"
        >
          {title}
        </h2>

        <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
          {teaching}
        </p>

        {totalPublishedSits > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Il y a actuellement{" "}
            <strong className="font-heading text-base text-foreground">
              {totalPublishedSits.toLocaleString("fr-FR")}
            </strong>{" "}
            garde{totalPublishedSits > 1 ? "s" : ""} publiée
            {totalPublishedSits > 1 ? "s" : ""} en France en ce moment
            {postalCode ? `, dont aucune autour de ${postalCode}` : ""}.
          </p>
        )}

        <div className="mt-6">
          <Button asChild>
            <Link
              to={ctaHref}
              onClick={() =>
                void trackEvent("dashboard_cta_clicked", {
                  source: "dashboard_empty_state",
                  metadata: {
                    cta: ctaEvent,
                    user_role: "sitter",
                    variant,
                  },
                })
              }
            >
              {ctaLabel}
            </Link>
          </Button>
        </div>

        {!isProfileIncomplete && user?.id && (
          <div className="mt-4">
            {alertActive ? (
              <p className="text-xs text-muted-foreground">
                Alerte déjà configurée.{" "}
                <Link to="/settings#alerts" className="text-accent underline underline-offset-2">
                  Gérer mes alertes
                </Link>
              </p>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={subscribe}
                disabled={saving || alertActive === null}
                className="gap-2"
              >
                <BellRing className="h-4 w-4" aria-hidden="true" />
                M'alerter dès qu'une annonce est publiée près de chez moi
              </Button>
            )}
          </div>
        )}

        </div>
      </div>
    </section>
  );
};

export default NoNearbySitsEmptyState;
