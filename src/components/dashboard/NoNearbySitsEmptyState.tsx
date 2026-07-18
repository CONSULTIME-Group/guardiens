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

  const isProfileIncomplete = variant === "profile_incomplete";

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
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <Icon className="h-7 w-7 text-accent" aria-hidden="true" />
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
            <strong className="text-foreground">
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
      </div>
    </section>
  );
};

export default NoNearbySitsEmptyState;
