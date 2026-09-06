import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { useShellMode } from "@/components/layout/useShellMode";

/**
 * Rappel d'action au milieu du parcours, juste après les témoignages.
 * Une ligne, deux actions, du vide autour : pas d'encadré, pas de carte,
 * pas d'illustration. Fond crème, respiration de 52 px.
 */
export function MidJourneyCta() {
  const { t } = useTranslation();
  const { user, activeRole } = useAuth();
  const shellMode = useShellMode();
  const isMember = shellMode === "app";
  const memberIsOwner = (user?.role === "both" ? activeRole : user?.role) === "owner";

  const ownerTarget = isMember && memberIsOwner ? "/sits/create" : "/inscription?role=owner";
  const sitterTarget = isMember ? "/search" : "/inscription?role=sitter";

  return (
    <section className="bg-accent">
      <div className="max-w-2xl mx-auto px-6 py-[52px] text-center">
        <p className="font-heading text-2xl md:text-3xl text-foreground leading-snug mb-7">
          {t("landing.mid_cta.title")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <Link
            to={ownerTarget}
            onClick={() => trackEvent("cta_proprio_clicked", { metadata: { location: "mid_journey_cta" } })}
            className="inline-flex items-center justify-center min-h-[44px] font-body text-sm font-semibold tracking-wide rounded-full px-10 py-3.5 bg-primary text-primary-foreground hover:brightness-95 transition-all duration-200"
          >
            {t("landing.mid_cta.cta_owner")}
          </Link>
          <Link
            to={sitterTarget}
            onClick={() => trackEvent("cta_sitter_clicked", { metadata: { location: "mid_journey_cta" } })}
            className="inline-flex items-center min-h-[44px] font-body text-sm font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground/60 transition-colors"
          >
            {t("landing.mid_cta.cta_sitter")}
          </Link>
        </div>
      </div>
    </section>
  );
}
